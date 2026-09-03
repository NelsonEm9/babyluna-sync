// Plain string helper (no hooks/browser APIs) so it can be called from
// Server Components too — keeping it out of the "use client" ui.tsx module.
export function buttonClass(variant: "primary" | "secondary" | "destructive" = "primary") {
  const base =
    "inline-flex min-h-[48px] items-center justify-center rounded-btn px-5 text-body font-medium transition-colors disabled:opacity-50";
  if (variant === "primary") return `${base} bg-brand text-white hover:bg-[#101a24]`;
  if (variant === "destructive") return `${base} bg-transparent text-destructive underline underline-offset-2`;
  return `${base} border border-border bg-surface text-text-primary hover:bg-bg`;
}
