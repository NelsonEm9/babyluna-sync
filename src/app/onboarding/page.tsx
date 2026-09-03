import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getSessionParent } from "@/lib/dal";
import { OnboardingForm } from "@/app/onboarding/OnboardingForm";

export default async function OnboardingPage() {
  const session = await getSessionParent();
  if (!session) redirect("/login");
  if (session.parent) redirect("/dashboard");

  const cookieStore = await cookies();
  const inviteCode = cookieStore.get("invite_code")?.value ?? "";

  return (
    <main className="flex flex-1 flex-col justify-center gap-8 px-6 py-12">
      <div className="flex flex-col gap-1">
        <h1 className="text-display font-semibold tracking-[-0.01em] text-text-primary">
          {inviteCode ? "Join your household" : "Set up BabyLuna Sync"}
        </h1>
        <p className="text-body text-text-secondary">
          {inviteCode
            ? "Confirm your name to finish joining."
            : "Create a household, or join one your partner already started."}
        </p>
      </div>
      <OnboardingForm defaultInviteCode={inviteCode} />
    </main>
  );
}
