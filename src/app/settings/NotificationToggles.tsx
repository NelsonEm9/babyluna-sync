"use client";

import { updateNotificationPrefs } from "@/app/actions/settings";
import { ToggleRow, SubmitButton } from "@/app/components/ui";

export function NotificationToggles({
  notifyOverdue,
  notifyPartnerLogged,
  quietHours,
  partnerName,
}: {
  notifyOverdue: boolean;
  notifyPartnerLogged: boolean;
  quietHours: boolean;
  partnerName: string;
}) {
  return (
    <form action={updateNotificationPrefs} className="flex flex-col gap-2">
      <ToggleRow label="Nudge me when overdue" name="notifyOverdue" defaultChecked={notifyOverdue} />
      <ToggleRow
        label={`When ${partnerName} logs something`}
        name="notifyPartnerLogged"
        defaultChecked={notifyPartnerLogged}
      />
      <ToggleRow label="Silent overnight" name="quietHours" defaultChecked={quietHours} />
      <p className="text-meta text-text-meta">
        These show as in-app alerts for now. Browser push notifications are a planned follow-up.
      </p>
      <SubmitButton variant="secondary" pendingLabel="Saving…" className="self-start">
        Save
      </SubmitButton>
    </form>
  );
}
