"use client";

import { useActionState } from "react";
import { updatePassword } from "@/app/actions/auth";
import { Field, TextInput, SubmitButton, ErrorText } from "@/app/components/ui";

export default function ResetPasswordPage() {
  const [state, action] = useActionState(updatePassword, undefined);

  return (
    <main className="flex flex-1 flex-col justify-center gap-8 px-6 py-12">
      <div className="flex flex-col gap-1">
        <h1 className="text-display font-semibold tracking-[-0.01em] text-text-primary">Set a new password</h1>
        <p className="text-body text-text-secondary">Choose a new password for your account.</p>
      </div>

      <form action={action} className="flex flex-col gap-4">
        <Field label="New password">
          <TextInput type="password" name="password" autoComplete="new-password" minLength={8} required />
        </Field>
        <Field label="Confirm password">
          <TextInput type="password" name="confirm" autoComplete="new-password" minLength={8} required />
        </Field>
        <ErrorText>{state?.error}</ErrorText>
        <SubmitButton pendingLabel="Saving…">Save password</SubmitButton>
      </form>
    </main>
  );
}
