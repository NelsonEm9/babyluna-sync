import { zonedTimeToUtc } from "@/lib/time";
import type { Task, TaskStatus, TaskTemplate } from "@/lib/database.types";

/** "Due soon" window for interval-recurring tasks. */
export const DUE_SOON_THRESHOLD_MINUTES = 45;

/**
 * Grace period past due_at before a task reads as "overdue". Without this, a
 * brand-new task (whose first due_at is simply "now", since it has no prior
 * log to measure a real interval from) flips to overdue within moments of
 * being created — there's no baseline to be "late" against yet.
 */
export const OVERDUE_GRACE_MINUTES = 15;

/** ISO weekday: 1=Mon..7=Sun (matches Postgres extract(isodow from date)). */
export function toIsoWeekday(d: Date): number {
  const day = d.getDay(); // 0=Sun..6=Sat
  return day === 0 ? 7 : day;
}

function toDateOnly(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Next date on/after `after` whose ISO weekday is in `days`, wrapping within a week. */
export function nextScheduledWeekday(after: Date, days: number[], includeToday = false): Date {
  const start = toDateOnly(after);
  const startOffset = includeToday ? 0 : 1;
  for (let offset = startOffset; offset <= 7; offset++) {
    const candidate = new Date(start);
    candidate.setDate(candidate.getDate() + offset);
    if (days.includes(toIsoWeekday(candidate))) return candidate;
  }
  return start;
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

type RecurrenceFields = Pick<TaskTemplate, "recurrence_type" | "interval_hours" | "weekly_days">;

/** Due instant for a brand-new template's first occurrence. */
export function computeFirstOccurrenceDueAt(
  template: RecurrenceFields,
  resetTime: string,
  timezone: string,
  now: Date = new Date()
): Date {
  if (template.recurrence_type === "interval") return now;
  const day = nextScheduledWeekday(now, template.weekly_days ?? [], true);
  return zonedTimeToUtc(toDateStr(day), resetTime, timezone);
}

/** Due instant for the occurrence created immediately after one is logged done. */
export function computeNextOccurrenceDueAt(
  template: RecurrenceFields,
  completedAt: Date,
  resetTime: string,
  timezone: string
): Date {
  if (template.recurrence_type === "interval") {
    return new Date(completedAt.getTime() + (template.interval_hours ?? 24) * 60 * 60 * 1000);
  }
  const day = nextScheduledWeekday(completedAt, template.weekly_days ?? [], false);
  return zonedTimeToUtc(toDateStr(day), resetTime, timezone);
}

type StatusFields = Pick<Task, "status" | "due_at" | "recurrence_type">;

/**
 * "Overdue" is derived, not stored: a task past its due window with status
 * still "due" reads as overdue. A manual override (status set to "done" or
 * "overdue" directly) always wins. Weekly tasks stay "due" for their whole
 * scheduled day (due_at -> due_at + 24h) before flipping to overdue.
 */
export function getEffectiveStatus(task: StatusFields, now: number): TaskStatus {
  if (task.status !== "due") return task.status;
  const dueAt = new Date(task.due_at).getTime();
  if (task.recurrence_type === "weekly") {
    return now >= dueAt + 24 * 60 * 60 * 1000 ? "overdue" : "due";
  }
  return now > dueAt + OVERDUE_GRACE_MINUTES * 60_000 ? "overdue" : "due";
}

/** Most recent reset instant <= now, in the household's timezone. */
export function getCurrentCycleStart(resetTime: string, timezone: string, now: Date = new Date()): Date {
  const todayReset = zonedTimeToUtc(toDateStr(now), resetTime, timezone);
  if (todayReset.getTime() <= now.getTime()) return todayReset;
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  return zonedTimeToUtc(toDateStr(yesterday), resetTime, timezone);
}

export function formatDuration(ms: number): string {
  const totalMinutes = Math.round(ms / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours <= 0) return `${Math.max(minutes, 1)}m`;
  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
}

/** Presentational relative-time text — does not drive status/icon color. */
export function getRelativeDueText(
  task: Pick<Task, "status" | "due_at" | "recurrence_type" | "completed_at">,
  now: number
): string {
  if (task.status === "done") {
    if (!task.completed_at) return "Done";
    const ms = now - new Date(task.completed_at).getTime();
    return ms < 60_000 ? "logged just now" : `logged ${formatDuration(ms)} ago`;
  }

  const dueAt = new Date(task.due_at).getTime();
  const effective = getEffectiveStatus(task, now);

  if (task.recurrence_type === "weekly") {
    if (effective === "overdue") {
      const days = Math.max(1, Math.round((now - (dueAt + 24 * 60 * 60 * 1000)) / (24 * 60 * 60 * 1000)));
      return `overdue ${days}d`;
    }
    return "due soon";
  }

  if (effective === "overdue") return `overdue ${formatDuration(now - dueAt)}`;
  const msUntilDue = dueAt - now;
  if (msUntilDue <= DUE_SOON_THRESHOLD_MINUTES * 60_000) return "due soon";
  return `in ${formatDuration(msUntilDue)}`;
}
