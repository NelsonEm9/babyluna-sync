"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { getEffectiveStatus } from "@/lib/recurrence";
import { resyncTasks } from "@/app/actions/templates";
import { RailView } from "@/app/dashboard/RailView";
import { CategoryView } from "@/app/dashboard/CategoryView";
import { OnboardingEmptyState } from "@/app/dashboard/OnboardingEmptyState";
import { BottomTabBar } from "@/app/components/BottomTabBar";
import type { Household, Parent, Task } from "@/lib/database.types";

export function DashboardClient({
  initialTasks,
  household,
  parent,
  parentNames,
  babyName,
  dayNumber,
  templateCount,
  view,
  initialNow,
}: {
  initialTasks: Task[];
  household: Household;
  parent: Parent;
  parentNames: Record<string, string>;
  babyName: string;
  dayNumber: number;
  templateCount: number;
  view: "rail" | "category";
  initialNow: number;
}) {
  const [tasks, setTasks] = useState(initialTasks);
  const [roster, setRoster] = useState(parentNames);
  const [prevInitialTasks, setPrevInitialTasks] = useState(initialTasks);
  // Seeded from the server-computed initialNow, then ticked forward via the
  // effect below — never read fresh from Date.now() during render, which
  // React's purity rule (rightly) flags: a component's render output must be
  // a pure function of its props/state, not of ambient wall-clock time read
  // mid-render.
  const [now, setNow] = useState(initialNow);
  const [isResetting, startReset] = useTransition();

  // A fresh server render (e.g. after a Server Action revalidates the page)
  // hands us new initialTasks — adopt them. Calling setState during render
  // like this (not in an effect) is the pattern React recommends for
  // resetting state when a prop changes; see "Adjusting state when a prop
  // changes" in the React docs.
  if (initialTasks !== prevInitialTasks) {
    setPrevInitialTasks(initialTasks);
    setTasks(initialTasks);
  }

  // Re-evaluate due -> overdue transitions even with no new events.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`tasks-${household.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks", filter: `household_id=eq.${household.id}` },
        (payload) => {
          setTasks((current) => {
            if (payload.eventType === "DELETE") {
              return current.filter((t) => t.id !== (payload.old as Task).id);
            }
            const next = payload.new as Task;
            const exists = current.some((t) => t.id === next.id);
            return exists ? current.map((t) => (t.id === next.id ? next : t)) : [...current, next];
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "parents", filter: `household_id=eq.${household.id}` },
        (payload) => {
          const newParent = payload.new as Parent;
          setRoster((current) => ({ ...current, [newParent.id]: newParent.name }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [household.id]);

  const withStatus = useMemo(
    () => tasks.map((t) => ({ task: t, status: getEffectiveStatus(t, now) })),
    [tasks, now]
  );

  const counts = useMemo(() => {
    const c = { done: 0, due: 0, overdue: 0 };
    for (const { status } of withStatus) c[status]++;
    return c;
  }, [withStatus]);

  const dateLabel = useMemo(
    () =>
      new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: household.timezone }).format(
        new Date(now)
      ),
    [household.timezone, now]
  );

  if (templateCount === 0) return <OnboardingEmptyState />;

  return (
    <div className="flex flex-1 flex-col">
      <main className="flex flex-1 flex-col">
        <header className="flex flex-col gap-4 bg-gradient-to-b from-bg-header-from to-bg px-5 pb-5 pt-8">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col">
              <span className="text-label text-text-meta">{dateLabel}</span>
              <h1 className="text-title font-semibold tracking-[-0.01em] text-text-primary">
                {babyName}, day {dayNumber}
              </h1>
            </div>
            <button
              type="button"
              disabled={isResetting}
              onClick={() => startReset(() => resyncTasks())}
              className="shrink-0 rounded-btn bg-brand px-4 py-2.5 text-label font-medium text-white disabled:opacity-60"
            >
              {isResetting ? "Resetting…" : "Reset now"}
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <StatTile label="done" value={counts.done} />
            <StatTile label="due soon" value={counts.due} tone="due" />
            <StatTile label="overdue" value={counts.overdue} tone="overdue" />
          </div>
        </header>

        {view === "category" ? (
          <CategoryView entries={withStatus} parentNames={roster} currentParentId={parent.id} now={now} />
        ) : (
          <RailView
            entries={withStatus}
            timezone={household.timezone}
            parentNames={roster}
            currentParentId={parent.id}
            now={now}
          />
        )}
      </main>

      <BottomTabBar active={view} />
    </div>
  );
}

function StatTile({ label, value, tone }: { label: string; value: number; tone?: "due" | "overdue" }) {
  const toneClass =
    tone === "overdue" ? "text-status-overdue" : tone === "due" ? "text-status-due" : "text-text-primary";
  const bgClass = tone === "overdue" && value > 0 ? "bg-surface-overdue" : "bg-surface";
  return (
    <div className={`flex flex-col items-center gap-0.5 rounded-card px-2 py-3 ${bgClass}`}>
      <span className={`text-heading font-semibold ${toneClass}`}>{value}</span>
      <span className="text-meta text-text-meta">{label}</span>
    </div>
  );
}
