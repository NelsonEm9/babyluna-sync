"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getSessionParent } from "@/lib/dal";
import type { AuthState } from "@/app/actions/auth";

export async function rememberInviteAndContinue(formData: FormData) {
  const code = String(formData.get("code") ?? "").trim();
  if (code) {
    const cookieStore = await cookies();
    cookieStore.set("invite_code", code, { maxAge: 1800, path: "/" });
  }
  redirect("/signup");
}

export async function createHousehold(_prevState: AuthState, formData: FormData): Promise<AuthState> {
  const session = await getSessionParent();
  if (!session) redirect("/login");
  if (session.parent) redirect("/dashboard");

  const babyName = String(formData.get("babyName") ?? "").trim();
  const parentName = String(formData.get("parentName") ?? "").trim();
  const resetTime = String(formData.get("resetTime") ?? "00:00");
  const timezone = String(formData.get("timezone") ?? "UTC");
  if (!babyName || !parentName) return { error: "Enter a name for your household and yourself." };

  // Pre-generate the id and skip reading the insert back: the household's own
  // RLS policy only shows rows to existing members, and this user isn't one
  // until the parents row below commits — asking PostgREST to return the
  // just-inserted row would filter it out as invisible. Knowing the id
  // upfront sidesteps that entirely.
  const householdId = crypto.randomUUID();

  const supabase = await createClient();
  const { error: householdError } = await supabase
    .from("households")
    .insert({ id: householdId, name: babyName, reset_time: resetTime, timezone });
  if (householdError) return { error: householdError.message };

  const { error: parentError } = await supabase
    .from("parents")
    .insert({ household_id: householdId, name: parentName, auth_user_id: session.user.id });
  if (parentError) return { error: parentError.message };

  redirect("/dashboard");
}

export async function joinHousehold(_prevState: AuthState, formData: FormData): Promise<AuthState> {
  const session = await getSessionParent();
  if (!session) redirect("/login");
  if (session.parent) redirect("/dashboard");

  const inviteCode = String(formData.get("inviteCode") ?? "").trim().toLowerCase();
  const parentName = String(formData.get("parentName") ?? "").trim();
  if (!inviteCode || !parentName) return { error: "Enter the invite code and your name." };

  const supabase = await createClient();
  const { data: matches, error: lookupError } = await supabase.rpc("household_by_invite_code", {
    p_code: inviteCode,
  });
  if (lookupError) return { error: lookupError.message };
  const household = matches?.[0];
  if (!household) return { error: "That invite code doesn't match a household." };

  const { error: parentError } = await supabase
    .from("parents")
    .insert({ household_id: household.id, name: parentName, auth_user_id: session.user.id });
  if (parentError) return { error: parentError.message };

  redirect("/dashboard");
}
