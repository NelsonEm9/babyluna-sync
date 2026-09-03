import { requireParent } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/actions/auth";
import { ResetTimeForm } from "@/app/settings/ResetTimeForm";
import { InviteLink } from "@/app/settings/InviteLink";
import { NotificationToggles } from "@/app/settings/NotificationToggles";
import { TaskManager } from "@/app/settings/TaskManager";
import { SubmitButton } from "@/app/components/ui";
import { BottomTabBar } from "@/app/components/BottomTabBar";
import type { TaskTemplate } from "@/lib/database.types";

export default async function SettingsPage() {
  const { parent, household } = await requireParent();
  const supabase = await createClient();

  const { data: templates } = await supabase
    .from("task_templates")
    .select("*")
    .eq("household_id", household.id)
    .order("category", { ascending: true });

  const { data: roster } = await supabase
    .from("parents")
    .select("id, name")
    .eq("household_id", household.id)
    .neq("id", parent.id);
  const partnerName = roster?.[0]?.name ?? "your partner";

  return (
    <div className="flex flex-1 flex-col">
      <main className="flex flex-1 flex-col gap-8 px-5 pb-10 pt-8">
        <div className="flex flex-col">
          <span className="text-label text-text-meta">Settings</span>
          <h1 className="text-heading font-semibold text-text-primary">Our setup</h1>
        </div>

        <section className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4">
          <h2 className="text-body-lg font-semibold text-text-primary">Daily reset</h2>
          <ResetTimeForm resetTime={household.reset_time} timezone={household.timezone} />
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-body-lg font-semibold text-text-primary">Invite your partner</h2>
          <InviteLink code={household.invite_code} />
        </section>

        <section className="flex flex-col gap-1 rounded-card border border-border bg-surface p-4">
          <h2 className="mb-2 text-body-lg font-semibold text-text-primary">Notifications</h2>
          <NotificationToggles
            notifyOverdue={parent.notify_overdue}
            notifyPartnerLogged={parent.notify_partner_logged}
            quietHours={Boolean(parent.quiet_hours_start)}
            partnerName={partnerName}
          />
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-body-lg font-semibold text-text-primary">Recurring tasks</h2>
          <TaskManager templates={(templates ?? []) as TaskTemplate[]} />
        </section>

        <form action={signOut} className="pt-4">
          <SubmitButton variant="destructive">Log out</SubmitButton>
        </form>
      </main>

      <BottomTabBar active="settings" />
    </div>
  );
}
