"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestPasswordReset } from "@/app/actions/auth";
import { Field, TextInput, SubmitButton, ErrorText, InfoText } from "@/app/components/ui";

export default function ForgotPasswordPage() {
  const [state, action] = useActionState(requestPasswordReset, undefined);

  return (
    <main className="flex flex-1 flex-col justify-center gap-8 px-6 py-12">
      <div className="flex flex-col gap-1">
        <h1 className="text-display font-semibold tracking-[-0.01em] text-text-primary">Reset your password</h1>
        <p className="text-body text-text-secondary">We&apos;ll email you a link to set a new one.</p>
      </div>

      <form action={action} className="flex flex-col gap-4">
        <Field label="Email">
          <TextInput type="email" name="email" autoComplete="email" required />
        </Field>
        <ErrorText>{state?.error}</ErrorText>
        <InfoText>{state?.info}</InfoText>
        <SubmitButton pendingLabel="Sending…">Send reset link</SubmitButton>
      </form>

      <p className="text-body text-text-secondary">
        <Link href="/login" className="text-link underline underline-offset-2">
          Back to log in
        </Link>
      </p>
    </main>
  );
}
