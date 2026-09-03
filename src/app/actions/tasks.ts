"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireParent } from "@/lib/dal";
import { computeNextOccurrenceDueAt } from "@/lib/recurrence";
import type { Task, TaskStatus } from "@/lib/database.types";

const UNIQUE_VIOLATION = "23505";

export async function updateTaskStatus(taskId: string, status: TaskStatus) {
  const { parent, household } = await requireParent();
  const supabase = await createClient();

  const { data: current, error: fetchError } = await supabase
    .from("tasks")
    .select("*")
    .eq("id", taskId)
    .single<Task>();
  if (fetchError || !current) throw new Error(fetchError?.message ?? "Task not found.");

  // Reopening a done task: if the auto-rolled-forward successor is still
  // untouched, delete it before reopening. If it's been touched, skip
  // deletion and let the DB's unique open-occurrence index reject the
  // update below — that's the intended, low-cost handling for this edge
  // case (a two-person app, not a high-concurrency system).
  if (current.status === "done" && status !== "done" && current.template_id) {
    const { data: sibling } = await supabase
      .from("tasks")
      .select("id, status, completed_at")
      .eq("template_id", current.template_id)
      .neq("id", taskId)
      .neq("status", "done")
      .maybeSingle();
    if (sibling && sibling.status === "due" && !sibling.completed_at) {
      await supabase.from("tasks").delete().eq("id", sibling.id);
    }
  }

  const { error } = await supabase
    .from("tasks")
    .update({
      status,
      completed_by: status === "done" ? parent.id : null,
      completed_at: status === "done" ? new Date().toISOString() : null,
    })
    .eq("id", taskId);
  if (error) throw new Error(error.message);

  if (status === "done" && current.template_id) {
    const { data: template } = await supabase
      .from("task_templates")
      .select("recurrence_type, interval_hours, weekly_days, is_active")
      .eq("id", current.template_id)
      .single();

    if (template?.is_active) {
      const completedAt = new Date();
      const dueAt = computeNextOccurrenceDueAt(template, completedAt, household.reset_time, household.timezone);
      const { error: nextError } = await supabase.from("tasks").insert({
        household_id: current.household_id,
        template_id: current.template_id,
        category: current.category,
        name: current.name,
        recurrence_type: template.recurrence_type,
        due_at: dueAt.toISOString(),
      });
      // A unique-violation here just means an open occurrence already
      // exists (e.g. a rapid double-click) — harmless, ignore it.
      if (nextError && nextError.code !== UNIQUE_VIOLATION) throw new Error(nextError.message);
    }
  }

  revalidatePath("/dashboard");
  revalidatePath(`/task/${taskId}`);
}

export async function addNote(taskId: string, formData: FormData) {
  const { parent } = await requireParent();
  const text = String(formData.get("text") ?? "").trim();
  if (!text) return;

  const supabase = await createClient();
  const { error } = await supabase.from("notes").insert({ task_id: taskId, parent_id: parent.id, text });
  if (error) throw new Error(error.message);

  revalidatePath(`/task/${taskId}`);
}
