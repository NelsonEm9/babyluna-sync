"use client";

import { Fragment, useMemo } from "react";
import Link from "next/link";
import { getRelativeDueText } from "@/lib/recurrence";
import { CATEGORY_LABELS } from "@/lib/categories";
import type { Task, TaskStatus } from "@/lib/database.types";

type Entry = { task: Task; status: TaskStatus };

function railInstant(task: Task): number {
  return new Date(task.status === "done" ? (task.completed_at ?? task.due_at) : task.due_at).getTime();
}

function formatClock(iso: string, timezone: string): string {
  const d = new Date(iso);
  const parts = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: timezone,
  }).formatToParts(d);
  const hour = parts.find((p) => p.type === "hour")?.value ?? "";
  const minute = parts.find((p) => p.type === "minute")?.value ?? "";
  const period = parts.find((p) => p.type === "dayPeriod")?.value.toLowerCase().charAt(0) ?? "";
  return `${hour}:${minute}${period}`;
}

const PILL_CLASS: Record<TaskStatus, string> = {
  done: "bg-surface-done text-status-done",
  due: "bg-surface text-status-due border border-status-due-border",
  overdue: "bg-status-overdue text-white",
};

const PILL_LABEL: Record<TaskStatus, string> = { done: "✓ done", due: "◐ due soon", overdue: "▲ overdue" };

export function RailView({
  entries,
  timezone,
  parentNames,
  currentParentId,
  now,
}: {
  entries: Entry[];
  timezone: string;
  parentNames: Record<string, string>;
  currentParentId: string;
  now: number;
}) {
  const sorted = useMemo(() => [...entries].sort((a, b) => railInstant(a.task) - railInstant(b.task)), [entries]);

  if (sorted.length === 0) {
    return (
      <p className="mt-10 px-5 text-center text-body text-text-secondary">Nothing logged yet today.</p>
    );
  }

  const nowIndex = sorted.findIndex((e) => railInstant(e.task) > now);
  const dividerAt = nowIndex === -1 ? sorted.length : nowIndex;

  return (
    <div className="flex flex-col px-5 py-4">
      <div className="relative flex flex-col">
        <div className="absolute top-2 bottom-2 left-[46px] w-px bg-border-strong" aria-hidden />
        {sorted.map((entry, i) => (
          <Fragment key={entry.task.id}>
            {i === dividerAt && <NowDivider />}
            <RailRow
              entry={entry}
              timezone={timezone}
              parentNames={parentNames}
              currentParentId={currentParentId}
              now={now}
            />
          </Fragment>
        ))}
        {dividerAt === sorted.length && <NowDivider />}
      </div>
    </div>
  );
}

function NowDivider() {
  return (
    <div className="relative z-10 flex items-center gap-3 py-2 pl-[30px]">
      <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-link" />
      <span className="text-meta font-medium text-link">now</span>
      <span className="h-px flex-1 bg-link" />
    </div>
  );
}

function RailRow({
  entry,
  timezone,
  parentNames,
  currentParentId,
  now,
}: {
  entry: Entry;
  timezone: string;
  parentNames: Record<string, string>;
  currentParentId: string;
  now: number;
}) {
  const { task, status } = entry;
  const isFuture = railInstant(task) > now;
  const timeLabel = formatClock(status === "done" ? (task.completed_at ?? task.due_at) : task.due_at, timezone);
  const relativeText = getRelativeDueText(task, now);

  const metaText =
    status === "done"
      ? `logged by ${task.completed_by === currentParentId ? "you" : (parentNames[task.completed_by ?? ""] ?? "your partner")} · ${CATEGORY_LABELS[task.category]}`
      : status === "overdue"
        ? `nobody has logged this · ${CATEGORY_LABELS[task.category]}`
        : `${relativeText} · ${CATEGORY_LABELS[task.category]}`;

  return (
    <Link href={`/task/${task.id}`} className="relative z-10 flex items-start gap-3 py-1.5">
      <span className="w-9 shrink-0 pt-3.5 text-right text-meta font-medium text-text-meta">{timeLabel}</span>
      <span
        className={`mt-4 h-2.5 w-2.5 shrink-0 rounded-full ${
          status === "overdue"
            ? "rounded-none bg-status-overdue [clip-path:polygon(50%_0,0_100%,100%_100%)]"
            : status === "done"
              ? "bg-text-primary"
              : "border-2 border-border-strong bg-surface"
        }`}
      />
      <div
        className={`flex-1 rounded-card border p-3.5 ${
          status === "overdue"
            ? "border-status-overdue-border bg-surface-overdue"
            : isFuture
              ? "border-dashed border-border-dashed bg-surface"
              : "border-border bg-surface"
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-body-lg font-semibold text-text-primary">{task.name}</span>
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-meta font-medium ${PILL_CLASS[status]}`}>
            {status === "overdue" ? `▲ ${relativeText}` : PILL_LABEL[status]}
          </span>
        </div>
        <p className="mt-0.5 text-label text-text-meta">{metaText}</p>
      </div>
    </Link>
  );
}
