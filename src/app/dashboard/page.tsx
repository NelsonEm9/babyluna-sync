import { requireParent } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCycleStart } from "@/lib/recurrence";
import { currentTimestamp } from "@/lib/time";
import { DashboardClient } from "@/app/dashboard/DashboardClient";
import type { Task } from "@/lib/database.types";

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { view: rawView } = await searchParams;
  const view = rawView === "category" ? "category" : "rail";
  const { parent, household } = await requireParent();
  const supabase = await createClient();

  const { count: templateCount } = await supabase
    .from("task_templates")
    .select("id", { count: "exact", head: true })
    .eq("household_id", household.id);

  const cycleStart = getCurrentCycleStart(household.reset_time, household.timezone);

  const { data: tasks } = await supabase
    .from("tasks")
    .select("*")
    .eq("household_id", household.id)
    .or(`status.neq.done,completed_at.gte.${cycleStart.toISOString()}`)
    .order("due_at", { ascending: true });

  const { data: roster } = await supabase
    .from("parents")
    .select("id, name")
    .eq("household_id", household.id);

  // Anchor against the reset cycle active *at creation time* (not the raw
  // creation timestamp) so a household created at, say, 2pm reads as "day 1"
  // immediately rather than "day 0" until the next reset boundary passes.
  const creationCycleStart = getCurrentCycleStart(household.reset_time, household.timezone, new Date(household.created_at));
  const dayNumber = Math.round((cycleStart.getTime() - creationCycleStart.getTime()) / 86_400_000) + 1;

  return (
    <DashboardClient
      initialTasks={(tasks ?? []) as Task[]}
      household={household}
      parent={parent}
      parentNames={Object.fromEntries((roster ?? []).map((p) => [p.id, p.name]))}
      babyName={household.name}
      dayNumber={dayNumber}
      templateCount={templateCount ?? 0}
      view={view}
      initialNow={currentTimestamp()}
    />
  );
}
