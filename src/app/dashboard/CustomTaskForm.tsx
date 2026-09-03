"use client";

import { useState } from "react";
import { addTemplate } from "@/app/actions/templates";
import { CATEGORY_LABELS, CATEGORY_ORDER } from "@/lib/categories";
import { Field, TextInput, SubmitButton, buttonClass } from "@/app/components/ui";

const WEEKDAYS: { value: number; label: string }[] = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 7, label: "Sun" },
];

export function CustomTaskForm({ onCancel }: { onCancel: () => void }) {
  const [recurrenceType, setRecurrenceType] = useState<"interval" | "weekly">("interval");

  return (
    <form
      action={async (formData) => {
        await addTemplate(formData);
        onCancel();
      }}
      className="flex w-full flex-col gap-3 rounded-card border border-border bg-surface p-3.5 text-left"
    >
      <Field label="Name">
        <TextInput name="name" placeholder="Bottle" required />
      </Field>

      <Field label="Category">
        <select
          name="category"
          required
          className="min-h-[48px] rounded-btn border border-border bg-surface px-3.5 text-body text-text-primary"
        >
          {CATEGORY_ORDER.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
      </Field>

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
          <TextInput type="number" name="intervalHours" min={1} max={72} defaultValue={3} required />
        </Field>
      ) : (
        <fieldset className="flex flex-col gap-1.5">
          <span className="text-label font-medium text-text-secondary">Days</span>
          <div className="flex flex-wrap gap-2">
            {WEEKDAYS.map((d) => (
              <label
                key={d.value}
                className="flex items-center gap-1.5 rounded-chip border border-border px-2.5 py-1.5 text-label text-text-primary"
              >
                <input type="checkbox" name="weeklyDays" value={d.value} />
                {d.label}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <div className="flex gap-2">
        <SubmitButton pendingLabel="Adding…">Add</SubmitButton>
        <button type="button" onClick={onCancel} className={buttonClass("secondary")}>
          Cancel
        </button>
      </div>
    </form>
  );
}
