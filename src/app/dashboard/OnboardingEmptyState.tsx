"use client";

import { useState, useTransition } from "react";
import { quickAddTemplate } from "@/app/actions/templates";
import { buttonClass } from "@/lib/button-class";
import { CustomTaskForm } from "@/app/dashboard/CustomTaskForm";

const QUICK_ADD_BUTTONS: { kind: "bottle" | "diaper" | "tummy_time" | "bath"; label: string }[] = [
  { kind: "bottle", label: "Add Bottle" },
  { kind: "diaper", label: "Add Diaper Change" },
  { kind: "tummy_time", label: "Add Tummy Time" },
  { kind: "bath", label: "Add Bath" },
];

export function OnboardingEmptyState() {
  const [isPending, startTransition] = useTransition();
  const [showCustomForm, setShowCustomForm] = useState(false);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-12 text-center">
      <div className="flex flex-col gap-1">
        <h1 className="text-title font-semibold text-text-primary">Welcome — let&apos;s set up the baby&apos;s routine</h1>
        <p className="text-body text-text-secondary">Add your recurring tasks to get started.</p>
      </div>

      {showCustomForm ? (
        <CustomTaskForm onCancel={() => setShowCustomForm(false)} />
      ) : (
        <div className="flex w-full flex-col gap-2">
          {QUICK_ADD_BUTTONS.map(({ kind, label }) => (
            <button
              key={kind}
              type="button"
              disabled={isPending}
              onClick={() => startTransition(() => quickAddTemplate(kind))}
              className={buttonClass("secondary")}
            >
              {label}
            </button>
          ))}
          <button type="button" onClick={() => setShowCustomForm(true)} className={buttonClass("primary")}>
            Add Custom Task
          </button>
        </div>
      )}
    </main>
  );
}
