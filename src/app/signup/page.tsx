"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signUp } from "@/app/actions/auth";
import { Field, TextInput, SubmitButton, ErrorText, InfoText } from "@/app/components/ui";

export default function SignupPage() {
  const [state, action] = useActionState(signUp, undefined);

  return (
    <main className="flex flex-1 flex-col justify-center gap-8 px-6 py-12">
      <div className="flex flex-col gap-1">
        <h1 className="text-display font-semibold tracking-[-0.01em] text-text-primary">Create your account</h1>
        <p className="text-body text-text-secondary">
          You&apos;ll set up your household or join your partner&apos;s next.
        </p>
      </div>

      <form action={action} className="flex flex-col gap-4">
        <Field label="Your name">
          <TextInput type="text" name="name" autoComplete="name" required />
        </Field>
        <Field label="Email">
          <TextInput type="email" name="email" autoComplete="email" required />
        </Field>
        <Field label="Password">
          <TextInput type="password" name="password" autoComplete="new-password" minLength={8} required />
        </Field>
        <ErrorText>{state?.error}</ErrorText>
        <InfoText>{state?.info}</InfoText>
        <SubmitButton pendingLabel="Creating account…">Continue</SubmitButton>
      </form>

      <p className="text-body text-text-secondary">
        Already have an account?{" "}
        <Link href="/login" className="text-link underline underline-offset-2">
          Log in
        </Link>
      </p>
    </main>
  );
}
