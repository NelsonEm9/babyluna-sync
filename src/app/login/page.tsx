"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signIn } from "@/app/actions/auth";
import { Field, TextInput, SubmitButton, ErrorText } from "@/app/components/ui";

export default function LoginPage() {
  const [state, action] = useActionState(signIn, undefined);

  return (
    <main className="flex flex-1 flex-col justify-center gap-8 px-6 py-12">
      <div className="flex flex-col gap-1">
        <h1 className="text-display font-semibold tracking-[-0.01em] text-text-primary">Welcome back</h1>
        <p className="text-body text-text-secondary">Log in to BabyLuna Sync.</p>
      </div>

      <form action={action} className="flex flex-col gap-4">
        <Field label="Email">
          <TextInput type="email" name="email" autoComplete="email" required />
        </Field>
        <Field label="Password">
          <TextInput type="password" name="password" autoComplete="current-password" required />
        </Field>
        <ErrorText>{state?.error}</ErrorText>
        <SubmitButton pendingLabel="Logging in…">Log in</SubmitButton>
      </form>

      <p className="text-body text-text-secondary">
        New here?{" "}
        <Link href="/signup" className="text-link underline underline-offset-2">
          Create a household
        </Link>
      </p>
    </main>
  );
}
