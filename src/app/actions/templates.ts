"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireParent } from "@/lib/dal";
import { computeFirstOccurrenceDueAt } from "@/lib/recurrence";
import type { TaskCategory, TaskRecurrenceType } from "@/lib/database.types";

type RecurrenceInput = {
  category: TaskCategory;
  name: string;
  recurrence_type: TaskRecurrenceType;
  interval_hours: number | null;
  weekly_days: number[] | null;
};

const QUICK_ADD_PRESETS: Record<"bottle" | "diaper" | "tummy_time" | "bath", RecurrenceInput> = {
  bottle: { category: "feeding", name: "Bottle", recurrence_type: "interval", interval_hours: 3, weekly_days: null },
  diaper: { category: "diapers", name: "Diaper change", recurrence_type: "interval", interval_hours: 2, weekly_days: null },
  tummy_time: { category: "tummy_time", name: "Tummy time", recurrence_type: "interval", interval_hours: 4, weekly_days: null },
  bath: { category: "bath", name: "Bath", recurrence_type: "weekly", interval_hours: null, weekly_days: [1, 3, 6] },
};

async function createTemplateWithFirstOccurrence(input: RecurrenceInput) {
  const { household } = await requireParent();
  const supabase = await createClient();

  const { data: template, error: templateError } = await supabase
    .from("task_templates")
    .insert({ household_id: household.id, ...input })
    .select("id")
    .single();
  if (templateError || !template) throw new Error(templateError?.message ?? "Could not create task.");

  const dueAt = computeFirstOccurrenceDueAt(input, household.reset_time, household.timezone);
  const { error: taskError } = await supabase.from("tasks").insert({
    household_id: household.id,
    template_id: template.id,
    category: input.category,
    name: input.name,
    recurrence_type: input.recurrence_type,
    due_at: dueAt.toISOString(),
  });
  // If this fails, sweep_missing_occurrences / resyncTasks backfills within
  // 15 minutes (or on demand) — that's exactly what the safety net is for.
  if (taskError) console.error("First occurrence insert failed:", taskError.message);

  revalidatePath("/dashboard");
  revalidatePath("/settings");
}

export async function quickAddTemplate(kind: keyof typeof QUICK_ADD_PRESETS) {
  await createTemplateWithFirstOccurrence(QUICK_ADD_PRESETS[kind]);
}

function readRecurrenceInput(formData: FormData): RecurrenceInput {
  const category = String(formData.get("category")) as TaskCategory;
  const name = String(formData.get("name") ?? "").trim();
  const recurrenceType = String(formData.get("recurrenceType") ?? "interval") as TaskRecurrenceType;

  if (recurrenceType === "weekly") {
    const weeklyDays = formData.getAll("weeklyDays").map(Number).filter((n) => n >= 1 && n <= 7);
    return { category, name, recurrence_type: "weekly", interval_hours: null, weekly_days: weeklyDays };
  }
  const intervalHours = Number(formData.get("intervalHours") ?? 3);
  return { category, name, recurrence_type: "interval", interval_hours: intervalHours, weekly_days: null };
}

export async function addTemplate(formData: FormData) {
  const input = readRecurrenceInput(formData);
  if (!input.name) return;
  if (input.recurrence_type === "weekly" && (input.weekly_days?.length ?? 0) === 0) return;
  await createTemplateWithFirstOccurrence(input);
}

export async function updateTemplate(id: string, formData: FormData) {
  await requireParent();
  const input = readRecurrenceInput(formData);
  const isActive = formData.get("isActive") === "on";
  if (!input.name) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("task_templates")
    .update({ ...input, is_active: isActive })
    .eq("id", id);
  if (error) throw new Error(error.message);

  // Push name/category onto the current open occurrence; deliberately does
  // NOT touch due_at — a changed cadence only takes effect on the next
  // roll-forward, same "don't disturb a ticking occurrence" rule as reset.
  const { error: taskError } = await supabase
    .from("tasks")
    .update({ name: input.name, category: input.category })
    .eq("template_id", id)
    .neq("status", "done");
  if (taskError) throw new Error(taskError.message);

  revalidatePath("/settings");
  revalidatePath("/dashboard");
}

export async function deleteTemplate(id: string) {
  await requireParent();
  const supabase = await createClient();

  const { error: taskError } = await supabase.from("tasks").delete().eq("template_id", id).neq("status", "done");
  if (taskError) throw new Error(taskError.message);

  const { error } = await supabase.from("task_templates").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/settings");
  revalidatePath("/dashboard");
}

export async function resyncTasks() {
  const supabase = await createClient();
  const { error } = await supabase.rpc("resync_household_tasks");
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard");
  revalidatePath("/settings");
}
