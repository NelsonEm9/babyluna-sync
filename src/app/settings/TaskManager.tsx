"use client";

import { useState } from "react";
import { deleteTemplate, updateTemplate } from "@/app/actions/templates";
import { CATEGORY_LABELS, CATEGORY_ORDER } from "@/lib/categories";
import { CustomTaskForm } from "@/app/dashboard/CustomTaskForm";
import { Field, TextInput, SubmitButton, buttonClass } from "@/app/components/ui";
import type { TaskTemplate } from "@/lib/database.types";

const WEEKDAY_LABELS: Record<number, string> = { 1: "Mon", 2: "Tue", 3: "Wed", 4: "Thu", 5: "Fri", 6: "Sat", 7: "Sun" };

function describeRecurrence(t: TaskTemplate): string {
  if (t.recurrence_type === "interval") return `every ${t.interval_hours}h`;
  return (t.weekly_days ?? []).map((d) => WEEKDAY_LABELS[d]).join(", ");
}

export function TaskManager({ templates }: { templates: TaskTemplate[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-card border border-border bg-surface">
        {templates.map((t, i) =>
          editingId === t.id ? (
            <EditTemplateForm key={t.id} template={t} bordered={i > 0} onDone={() => setEditingId(null)} />
          ) : (
            <div
              key={t.id}
              className={`flex items-center justify-between gap-3 px-3.5 py-3 ${i > 0 ? "border-t border-border-light" : ""} ${!t.is_active ? "opacity-50" : ""}`}
            >
              <div className="flex flex-col">
                <span className="text-body text-text-primary">{t.name}</span>
                <span className="text-meta text-text-meta">
                  {CATEGORY_LABELS[t.category]} · {describeRecurrence(t)}
                </span>
              </div>
              <div className="flex shrink-0 gap-3 text-label font-medium">
                <button type="button" onClick={() => setEditingId(t.id)} className="text-link underline underline-offset-2">
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => deleteTemplate(t.id)}
                  className="text-destructive underline underline-offset-2"
                >
                  Delete
                </button>
              </div>
            </div>
          )
        )}
        {templates.length === 0 && (
          <p className="px-3.5 py-4 text-body text-text-secondary">No recurring tasks yet.</p>
        )}
      </div>

      {adding ? (
        <CustomTaskForm onCancel={() => setAdding(false)} />
      ) : (
        <button type="button" onClick={() => setAdding(true)} className={buttonClass("secondary")}>
          + Add a recurring task
        </button>
      )}
    </div>
  );
}

function EditTemplateForm({
  template: t,
  bordered,
  onDone,
}: {
  template: TaskTemplate;
  bordered: boolean;
  onDone: () => void;
}) {
  const [recurrenceType, setRecurrenceType] = useState<"interval" | "weekly">(t.recurrence_type);

  return (
    <form
      action={async (formData) => {
        await updateTemplate(t.id, formData);
        onDone();
      }}
      className={`flex flex-col gap-2 px-3.5 py-3 ${bordered ? "border-t border-border-light" : ""}`}
    >
      <TextInput name="name" defaultValue={t.name} required />
      <select
        name="category"
        defaultValue={t.category}
        required
        className="min-h-[48px] rounded-btn border border-border bg-surface px-3.5 text-body text-text-primary"
      >
        {CATEGORY_ORDER.map((c) => (
          <option key={c} value={c}>
            {CATEGORY_LABELS[c]}
          </option>
        ))}
      </select>

      <div className="flex gap-2 rounded-btn border border-border bg-bg p-1">
        <button
          type="button"
          onClick={() => setRecurrenceType("interval")}
          className={`flex-1 rounded-[8px] py-2 text-body font-medium ${recurrenceType === "interval" ? "bg-brand text-white" : "text-text-secondary"}`}
        >
          Every N hours
        </button>
        <button
          type="button"
          onClick={() => setRecurrenceType("weekly")}
          className={`flex-1 rounded-[8px] py-2 text-body font-medium ${recurrenceType === "weekly" ? "bg-brand text-white" : "text-text-secondary"}`}
        >
          Specific days
        </button>
      </div>
      <input type="hidden" name="recurrenceType" value={recurrenceType} />

      {recurrenceType === "interval" ? (
        <Field label="Every how many hours">
          <TextInput type="number" name="intervalHours" min={1} max={72} defaultValue={t.interval_hours ?? 3} required />
        </Field>
      ) : (
        <fieldset className="flex flex-col gap-1.5">
          <span className="text-label font-medium text-text-secondary">Days</span>
          <div className="flex flex-wrap gap-2">
            {Object.entries(WEEKDAY_LABELS).map(([value, label]) => (
              <label
                key={value}
                className="flex items-center gap-1.5 rounded-chip border border-border px-2.5 py-1.5 text-label text-text-primary"
              >
                <input
                  type="checkbox"
                  name="weeklyDays"
                  value={value}
                  defaultChecked={(t.weekly_days ?? []).includes(Number(value))}
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <label className="flex items-center gap-1.5 text-label text-text-secondary">
        <input type="checkbox" name="isActive" defaultChecked={t.is_active} />
        Active
      </label>

      <div className="flex gap-2">
        <SubmitButton variant="secondary" pendingLabel="Saving…">
          Save
        </SubmitButton>
        <button type="button" onClick={onDone} className={buttonClass("secondary")}>
          Cancel
        </button>
      </div>
    </form>
  );
}
