import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Household, Parent } from "@/lib/database.types";

/**
 * The signed-in user's parent row + household, or null if not authenticated.
 * Does NOT redirect — callers decide whether the absence of a session means
 * "go to /login" or "go to /onboarding" (no parent row yet).
 */
export const getSessionParent = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: parent } = await supabase
    .from("parents")
    .select("*")
    .eq("auth_user_id", user.id)
    .maybeSingle<Parent>();

  if (!parent) return { user, parent: null, household: null as Household | null };

  const { data: household } = await supabase
    .from("households")
    .select("*")
    .eq("id", parent.household_id)
    .single<Household>();

  return { user, parent, household: household ?? null };
});

/** Require a fully onboarded parent (session + household), or redirect. */
export async function requireParent() {
  const session = await getSessionParent();
  if (!session) redirect("/login");
  if (!session.parent || !session.household) redirect("/onboarding");
  return session as { user: typeof session.user; parent: Parent; household: Household };
}
