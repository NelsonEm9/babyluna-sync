import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { rememberInviteAndContinue } from "@/app/actions/household";
import { SubmitButton } from "@/app/components/ui";
import { buttonClass } from "@/lib/button-class";

export default async function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const supabase = await createClient();
  const { data } = await supabase.rpc("household_by_invite_code", { p_code: code });
  const household = data?.[0];

  return (
    <main className="flex flex-1 flex-col justify-center gap-8 px-6 py-12 text-center">
      {household ? (
        <>
          <div className="flex flex-col gap-1">
            <h1 className="text-display font-semibold tracking-[-0.01em] text-text-primary">
              Join {household.name}
            </h1>
            <p className="text-body text-text-secondary">You&apos;ve been invited to track daily care together.</p>
          </div>
          <form action={rememberInviteAndContinue} className="flex flex-col gap-3">
            <input type="hidden" name="code" value={code} />
            <SubmitButton pendingLabel="One sec…">Continue</SubmitButton>
          </form>
          <p className="text-body text-text-secondary">
            Already have an account?{" "}
            <Link href="/login" className={buttonClass("secondary")}>
              Log in
            </Link>
          </p>
        </>
      ) : (
        <div className="flex flex-col gap-2">
          <h1 className="text-title font-semibold text-text-primary">Invite link not found</h1>
          <p className="text-body text-text-secondary">
            This invite code doesn&apos;t match a household. Double check the link your partner sent.
          </p>
        </div>
      )}
    </main>
  );
}
