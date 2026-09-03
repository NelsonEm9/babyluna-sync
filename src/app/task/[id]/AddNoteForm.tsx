"use client";

import { useState, useTransition, type FormEvent } from "react";
import { addNote } from "@/app/actions/tasks";

export function AddNoteForm({ taskId, partnerName }: { taskId: string; partnerName: string }) {
  const [text, setText] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    const formData = new FormData();
    formData.set("text", trimmed);
    startTransition(async () => {
      await addNote(taskId, formData);
      setText("");
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="sticky bottom-0 flex items-center gap-2 border-t border-border bg-surface px-4 py-3"
    >
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={`Note for ${partnerName}…`}
        className="min-h-[48px] flex-1 rounded-btn border border-border bg-bg px-3.5 text-body text-text-primary placeholder:text-text-meta focus:border-brand focus:outline-none"
      />
      <button
        type="submit"
        disabled={isPending || !text.trim()}
        className="flex min-h-[48px] shrink-0 items-center justify-center rounded-btn bg-brand px-5 text-body font-medium text-white disabled:opacity-50"
      >
        Post
      </button>
    </form>
  );
}
