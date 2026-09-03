import { notFound } from "next/navigation";
import { requireParent } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { currentTimestamp } from "@/lib/time";
import { TaskDetailClient } from "@/app/task/[id]/TaskDetailClient";
import type { Note, Task, TaskTemplate } from "@/lib/database.types";

export default async function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { parent, household } = await requireParent();
  const supabase = await createClient();

  const { data: task } = await supabase
    .from("tasks")
    .select("*")
    .eq("id", id)
    .eq("household_id", household.id)
    .maybeSingle<Task>();

  if (!task) notFound();

  const { data: template } = task.template_id
    ? await supabase
        .from("task_templates")
        .select("interval_hours, weekly_days")
        .eq("id", task.template_id)
        .maybeSingle<Pick<TaskTemplate, "interval_hours" | "weekly_days">>()
    : { data: null };

  const { data: notes } = await supabase
    .from("notes")
    .select("*")
    .eq("task_id", id)
    .order("created_at", { ascending: true });

  const { data: roster } = await supabase
    .from("parents")
    .select("id, name")
    .eq("household_id", household.id);

  return (
    <TaskDetailClient
      initialTask={task}
      initialNotes={(notes ?? []) as Note[]}
      household={household}
      parent={parent}
      parentNames={Object.fromEntries((roster ?? []).map((p) => [p.id, p.name]))}
      intervalHours={template?.interval_hours ?? null}
      weeklyDays={template?.weekly_days ?? null}
      initialNow={currentTimestamp()}
    />
  );
}
