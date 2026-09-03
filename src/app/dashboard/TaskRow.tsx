"use client";

import { useTransition } from "react";
import Link from "next/link";
import { updateTaskStatus } from "@/app/actions/tasks";
import { getRelativeDueText } from "@/lib/recurrence";
import type { Task, TaskStatus } from "@/lib/database.types";

const ICON: Record<TaskStatus, string> = { done: "✓", due: "◌", overdue: "!" };

const ICON_CLASS: Record<TaskStatus, string> = {
  done: "border-status-done bg-surface-done text-status-done",
  due: "border-border-strong text-text-secondary",
  overdue: "border-status-overdue-border bg-surface-overdue text-status-overdue",
};

export function TaskRow({
  task,
  status,
  parentName,
  isMine,
  now,
}: {
  task: Task;
  status: TaskStatus;
  parentName?: string;
  isMine: boolean;
  now: number;
}) {
  const [isPending, startTransition] = useTransition();

  function toggleDone(e: React.MouseEvent) {
    e.preventDefault();
    startTransition(() => {
      updateTaskStatus(task.id, status === "done" ? "due" : "done");
    });
  }

  const relativeText = getRelativeDueText(task, now);

  return (
    <Link
      href={`/task/${task.id}`}
      className={`flex min-h-[52px] items-center gap-3 border-b border-border-light py-2 last:border-b-0 ${status === "overdue" ? "bg-surface-overdue -mx-5 px-5" : ""}`}
    >
      <button
        type="button"
        onClick={toggleDone}
        disabled={isPending}
        aria-label={status === "done" ? "Mark not done" : "Mark done"}
        className={`flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full border text-body ${ICON_CLASS[status]}`}
      >
        {ICON[status]}
      </button>

      <span className={`flex-1 text-body-lg ${status === "done" ? "text-text-secondary" : "text-text-primary"}`}>
        {task.name}
      </span>

      <span className="text-meta text-text-meta">
        {relativeText}
        {status === "done" && parentName ? ` · ${isMine ? "you" : parentName}` : ""}
      </span>
    </Link>
  );
}
