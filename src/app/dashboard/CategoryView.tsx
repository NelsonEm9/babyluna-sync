"use client";

import { useMemo } from "react";
import { CATEGORY_ORDER, CATEGORY_LABELS } from "@/lib/categories";
import { TaskRow } from "@/app/dashboard/TaskRow";
import type { Task, TaskStatus } from "@/lib/database.types";

type Entry = { task: Task; status: TaskStatus };

export function CategoryView({
  entries,
  parentNames,
  currentParentId,
  now,
}: {
  entries: Entry[];
  parentNames: Record<string, string>;
  currentParentId: string;
  now: number;
}) {
  const byCategory = useMemo(() => {
    const groups = new Map<string, Entry[]>();
    for (const entry of entries) {
      const list = groups.get(entry.task.category) ?? [];
      list.push(entry);
      groups.set(entry.task.category, list);
    }
    return groups;
  }, [entries]);

  if (entries.length === 0) {
    return (
      <p className="mt-10 px-5 text-center text-body text-text-secondary">Nothing logged yet today.</p>
    );
  }

  return (
    <div className="flex flex-col gap-6 px-5 py-4">
      {CATEGORY_ORDER.filter((c) => byCategory.has(c)).map((category) => (
        <section key={category} className="flex flex-col">
          <h2 className="mb-1 border-b border-border pb-2 text-body-lg font-semibold text-text-primary">
            {CATEGORY_LABELS[category]}
          </h2>
          {byCategory.get(category)!.map(({ task, status }) => (
            <TaskRow
              key={task.id}
              task={task}
              status={status}
              parentName={task.completed_by ? parentNames[task.completed_by] : undefined}
              isMine={task.completed_by === currentParentId}
              now={now}
            />
          ))}
        </section>
      ))}
    </div>
  );
}
