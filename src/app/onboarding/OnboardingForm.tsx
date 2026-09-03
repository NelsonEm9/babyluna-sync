"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createHousehold, joinHousehold } from "@/app/actions/household";
import { Field, TextInput, SubmitButton, ErrorText } from "@/app/components/ui";

export function OnboardingForm({ defaultInviteCode }: { defaultInviteCode: string }) {
  const [tab, setTab] = useState<"create" | "join">(defaultInviteCode ? "join" : "create");
  const [createState, createAction] = useActionState(createHousehold, undefined);
  const [joinState, joinAction] = useActionState(joinHousehold, undefined);
  const timezoneRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (timezoneRef.current) {
      timezoneRef.current.value = Intl.DateTimeFormat().resolvedOptions().timeZone;
    }
  }, []);

  return (
    <div className="flex flex-col gap-6">
      {!defaultInviteCode && (
        <div className="flex gap-2 rounded-btn border border-border bg-surface p-1">
          <button
            type="button"
            onClick={() => setTab("create")}
            className={`flex-1 rounded-[8px] py-2 text-body font-medium ${tab === "create" ? "bg-brand text-white" : "text-text-secondary"}`}
          >
            Create household
          </button>
          <button
            type="button"
            onClick={() => setTab("join")}
            className={`flex-1 rounded-[8px] py-2 text-body font-medium ${tab === "join" ? "bg-brand text-white" : "text-text-secondary"}`}
          >
            Join household
          </button>
        </div>
      )}

      {tab === "create" ? (
        <form action={createAction} className="flex flex-col gap-4">
          <Field label="Baby's name">
            <TextInput type="text" name="babyName" placeholder="Luna" required />
          </Field>
          <Field label="Your name">
            <TextInput type="text" name="parentName" required />
          </Field>
          <Field label="Daily reset time">
            <TextInput type="time" name="resetTime" defaultValue="00:00" required />
          </Field>
          <input ref={timezoneRef} type="hidden" name="timezone" defaultValue="UTC" />
          <ErrorText>{createState?.error}</ErrorText>
          <SubmitButton pendingLabel="Creating…">Create household</SubmitButton>
        </form>
      ) : (
        <form action={joinAction} className="flex flex-col gap-4">
          <Field label="Invite code">
            <TextInput type="text" name="inviteCode" defaultValue={defaultInviteCode} required />
          </Field>
          <Field label="Your name">
            <TextInput type="text" name="parentName" required />
          </Field>
          <ErrorText>{joinState?.error}</ErrorText>
          <SubmitButton pendingLabel="Joining…">Join household</SubmitButton>
        </form>
      )}
    </div>
  );
}
