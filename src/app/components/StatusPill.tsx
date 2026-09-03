import type { TaskStatus } from "@/lib/database.types";

const STYLES: Record<TaskStatus, string> = {
  done: "bg-surface-done text-status-done",
  due: "bg-surface text-status-due border border-status-due-border",
  overdue: "bg-surface-overdue text-status-overdue border border-status-overdue-border",
};

const LABELS: Record<TaskStatus, string> = {
  done: "Done",
  due: "Due",
  overdue: "Overdue",
};

export function StatusPill({ status }: { status: TaskStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-meta font-medium ${STYLES[status]}`}>
      {LABELS[status]}
    </span>
  );
}
