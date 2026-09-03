"use client";

import { useEffect, useState } from "react";

export function InviteLink({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  // Start with the relative path so server and client render identically,
  // then upgrade to the full origin after mount (window isn't available
  // during SSR, and using it directly in render causes a hydration mismatch).
  const [link, setLink] = useState(`/join/${code}`);

  useEffect(() => {
    // Reading window.location is the whole point here — there's no
    // non-effect way to pick this up only after the SSR-safe first paint.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLink(`${window.location.origin}/join/${code}`);
  }, [code]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API unavailable — the link is still selectable as text.
    }
  }

  return (
    <div className="flex items-center gap-2 rounded-btn border border-border bg-surface px-3.5 py-3">
      <code className="flex-1 truncate text-label text-text-secondary">{link}</code>
      <button
        type="button"
        onClick={copy}
        className="shrink-0 text-label font-medium text-link underline underline-offset-2"
      >
        {copied ? "Copied!" : "Copy"}
      </button>
    </div>
  );
}
