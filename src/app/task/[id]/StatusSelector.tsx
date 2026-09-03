"use client";

import { useTransition } from "react";
import { updateTaskStatus } from "@/app/actions/tasks";
import { formatDuration } from "@/lib/recurrence";
import type { TaskStatus } from "@/lib/database.types";

const RING_COLOR: Record<TaskStatus, string> = {
  due: "border-status-due",
  done: "border-status-done",
  overdue: "border-status-overdue",
};

export function StatusSelector({
  taskId,
  status,
  dueAt,
  now,
}: {
  taskId: string;
  status: TaskStatus;
  dueAt: string;
  now: number;
}) {
  const [isPending, startTransition] = useTransition();
  const overdueBy = formatDuration(now - new Date(dueAt).getTime());

  const options: { status: TaskStatus; icon: string; label: string }[] = [
    { status: "done", icon: "✓", label: "Done — just now" },
    { status: "due", icon: "◐", label: "Due soon" },
    { status: "overdue", icon: "▲", label: `Overdue — ${overdueBy} ago` },
  ];

  return (
    <div className="flex flex-col gap-2.5">
      {options.map((opt) => {
        const selected = status === opt.status;
        return (
          <button
            key={opt.status}
            type="button"
            disabled={isPending}
            onClick={() => startTransition(() => updateTaskStatus(taskId, opt.status))}
            className={`relative flex items-center gap-3 rounded-card border bg-surface px-4 py-3.5 text-left text-body-lg font-medium text-text-primary disabled:opacity-60 ${
              selected ? RING_COLOR[opt.status] + " border-[1.5px]" : "border-border"
            }`}
          >
            <span aria-hidden>{opt.icon}</span>
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
