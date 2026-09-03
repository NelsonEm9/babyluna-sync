"use client";

import { useState, useTransition } from "react";
import { updateResetTime } from "@/app/actions/settings";
import { Field, TextInput, SubmitButton } from "@/app/components/ui";

const PRESETS = ["06:00", "07:00"];

export function ResetTimeForm({ resetTime, timezone }: { resetTime: string; timezone: string }) {
  const current = resetTime.slice(0, 5);
  const [selected, setSelected] = useState<string>(PRESETS.includes(current) ? current : "custom");
  const [isPending, startTransition] = useTransition();

  function choosePreset(time: string) {
    setSelected(time);
    const formData = new FormData();
    formData.set("resetTime", time);
    formData.set("timezone", timezone);
    startTransition(() => updateResetTime(formData));
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        {PRESETS.map((time) => (
          <button
            key={time}
            type="button"
            disabled={isPending}
            onClick={() => choosePreset(time)}
            className={`flex-1 rounded-btn px-3 py-3 text-body font-medium ${
              selected === time ? "bg-brand text-white" : "border border-border bg-surface text-text-secondary"
            }`}
          >
            {formatPreset(time)}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setSelected("custom")}
          className={`flex-1 rounded-btn px-3 py-3 text-body font-medium ${
            selected === "custom" ? "bg-brand text-white" : "border border-border bg-surface text-text-secondary"
          }`}
        >
          Custom
        </button>
      </div>

      {selected === "custom" && (
        <form action={updateResetTime} className="flex items-end gap-3">
          <Field label="Reset time">
            <TextInput type="time" name="resetTime" defaultValue={current} required />
          </Field>
          <input type="hidden" name="timezone" value={timezone} />
          <SubmitButton pendingLabel="Saving…" variant="secondary">
            Save
          </SubmitButton>
        </form>
      )}

      <p className="text-meta text-text-meta">The rail clears and today&apos;s counts start over.</p>
      <p className="text-meta text-text-meta">Timezone: {timezone}</p>
    </div>
  );
}

function formatPreset(time: string): string {
  const [h] = time.split(":").map(Number);
  const period = h < 12 ? "am" : "pm";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:00 ${period}`;
}
