"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getEffectiveStatus } from "@/lib/recurrence";
import { CATEGORY_LABELS } from "@/lib/categories";
import { StatusSelector } from "@/app/task/[id]/StatusSelector";
import { NotesThread } from "@/app/task/[id]/NotesThread";
import { AddNoteForm } from "@/app/task/[id]/AddNoteForm";
import type { Household, Note, Parent, Task } from "@/lib/database.types";

const WEEKDAY_LABELS: Record<number, string> = { 1: "Mon", 2: "Tue", 3: "Wed", 4: "Thu", 5: "Fri", 6: "Sat", 7: "Sun" };

export function TaskDetailClient({
  initialTask,
  initialNotes,
  household,
  parent,
  parentNames,
  intervalHours,
  weeklyDays,
  initialNow,
}: {
  initialTask: Task;
  initialNotes: Note[];
  household: Household;
  parent: Parent;
  parentNames: Record<string, string>;
  intervalHours: number | null;
  weeklyDays: number[] | null;
  initialNow: number;
}) {
  const [task, setTask] = useState(initialTask);
  const [notes, setNotes] = useState(initialNotes);
  const [roster, setRoster] = useState(parentNames);
  const [prevInitialTask, setPrevInitialTask] = useState(initialTask);
  const [prevInitialNotes, setPrevInitialNotes] = useState(initialNotes);
  // See DashboardClient for why this is seeded from a server-computed prop
  // and ticked via an effect, never read fresh from Date.now() in render.
  const [now, setNow] = useState(initialNow);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  // See DashboardClient for why this runs during render rather than in an effect.
  if (initialTask !== prevInitialTask) {
    setPrevInitialTask(initialTask);
    setTask(initialTask);
  }
  if (initialNotes !== prevInitialNotes) {
    setPrevInitialNotes(initialNotes);
    setNotes(initialNotes);
  }

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`task-${task.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks", filter: `id=eq.${task.id}` },
        (payload) => {
          if (payload.eventType !== "DELETE") setTask(payload.new as Task);
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notes", filter: `task_id=eq.${task.id}` },
        (payload) => {
          const note = payload.new as Note;
          setNotes((current) => (current.some((n) => n.id === note.id) ? current : [...current, note]));
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "parents", filter: `household_id=eq.${household.id}` },
        (payload) => {
          const newParent = payload.new as Parent;
          setRoster((current) => ({ ...current, [newParent.id]: newParent.name }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [task.id, household.id]);

  const status = getEffectiveStatus(task, now);
  const isOverdue = status === "overdue";

  const recurrenceLabel =
    task.recurrence_type === "interval"
      ? intervalHours
        ? `due every ${intervalHours}h`
        : null
      : weeklyDays && weeklyDays.length > 0
        ? `due ${weeklyDays.map((d) => WEEKDAY_LABELS[d]).join(", ")}`
        : null;

  const partnerName = Object.entries(roster).find(([id]) => id !== parent.id)?.[1] ?? "your partner";
  const threadTitle = `${parent.name} & ${partnerName}`;

  return (
    <div className="flex flex-1 flex-col">
      <div className={isOverdue ? "bg-status-overdue-page-bg" : ""}>
        <div className="flex items-center gap-3 px-5 pb-2 pt-8">
          <Link
            href="/dashboard"
            aria-label="Back to dashboard"
            className={`text-title ${isOverdue ? "text-status-overdue-strong" : "text-text-primary"}`}
          >
            ‹
          </Link>
          <span
            className={`text-label font-medium uppercase tracking-wide ${isOverdue ? "text-status-overdue" : "text-text-meta"}`}
          >
            {CATEGORY_LABELS[task.category]}
            {recurrenceLabel ? ` · ${recurrenceLabel}` : ""}
          </span>
        </div>

        <div className="flex flex-col gap-6 px-5 pb-6">
          <h1 className={`text-heading font-semibold ${isOverdue ? "text-status-overdue-strong" : "text-text-primary"}`}>
            {task.name}
          </h1>

          <StatusSelector taskId={task.id} status={status} dueAt={task.due_at} now={now} />
        </div>
      </div>

      <div className="flex flex-1 flex-col">
        <p className="px-5 pt-4 text-label text-text-meta">Notes · {threadTitle}</p>
        <NotesThread notes={notes} parent={parent} parentNames={roster} />
        <AddNoteForm taskId={task.id} partnerName={partnerName} />
      </div>
    </div>
  );
}
