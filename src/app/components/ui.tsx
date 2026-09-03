"use client";

import { useFormStatus } from "react-dom";
import type { ButtonHTMLAttributes, InputHTMLAttributes, LabelHTMLAttributes, ReactNode } from "react";
import { buttonClass } from "@/lib/button-class";

export { buttonClass };

export function SubmitButton({
  children,
  pendingLabel,
  variant = "primary",
  className = "",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { pendingLabel?: string; variant?: "primary" | "secondary" | "destructive" }) {
  const { pending } = useFormStatus();
  return (
    <button
      {...rest}
      type="submit"
      disabled={pending || rest.disabled}
      className={`${buttonClass(variant)} ${className}`}
    >
      {pending ? (pendingLabel ?? "Saving…") : children}
    </button>
  );
}


export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-label font-medium text-text-secondary">{label}</span>
      {children}
    </label>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`min-h-[48px] rounded-btn border border-border bg-surface px-3.5 text-body text-text-primary placeholder:text-text-meta focus:border-brand focus:outline-none ${props.className ?? ""}`}
    />
  );
}

export function ErrorText({ children }: { children?: string }) {
  if (!children) return null;
  return <p className="text-label text-destructive">{children}</p>;
}

export function InfoText({ children }: { children?: string }) {
  if (!children) return null;
  return <p className="text-label text-status-due">{children}</p>;
}

export function ToggleRow({
  label,
  name,
  defaultChecked,
}: {
  label: string;
  name: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex min-h-[52px] items-center justify-between gap-4 border-b border-border-light py-2 last:border-b-0">
      <span className="text-body text-text-primary">{label}</span>
      <span className="relative inline-flex h-[30px] w-[52px] shrink-0 items-center">
        <input
          type="checkbox"
          name={name}
          defaultChecked={defaultChecked}
          className="peer sr-only"
        />
        <span className="absolute inset-0 rounded-full bg-border-strong transition-colors peer-checked:bg-brand" />
        <span className="absolute left-[3px] h-6 w-6 rounded-full bg-white transition-transform peer-checked:translate-x-[22px]" />
      </span>
    </label>
  );
}

export function LabelText(props: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label {...props} className={`text-label font-medium text-text-secondary ${props.className ?? ""}`} />;
}
