"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireParent } from "@/lib/dal";

export async function updateResetTime(formData: FormData) {
  const { household } = await requireParent();
  const resetTime = String(formData.get("resetTime") ?? household.reset_time);
  const timezone = String(formData.get("timezone") ?? household.timezone);

  const supabase = await createClient();
  const { error } = await supabase
    .from("households")
    .update({ reset_time: resetTime, timezone })
    .eq("id", household.id);
  if (error) throw new Error(error.message);

  revalidatePath("/settings");
  revalidatePath("/dashboard");
}

export async function updateNotificationPrefs(formData: FormData) {
  const { parent } = await requireParent();
  const supabase = await createClient();
  const quietHours = formData.get("quietHours") === "on";

  const { error } = await supabase
    .from("parents")
    .update({
      notify_overdue: formData.get("notifyOverdue") === "on",
      notify_partner_logged: formData.get("notifyPartnerLogged") === "on",
      quiet_hours_start: quietHours ? "23:00" : null,
      quiet_hours_end: quietHours ? "05:00" : null,
    })
    .eq("id", parent.id);
  if (error) throw new Error(error.message);

  revalidatePath("/settings");
}
