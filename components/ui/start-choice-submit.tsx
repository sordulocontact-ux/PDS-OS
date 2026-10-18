"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

import { startChoiceClass } from "@/components/ui/start-choice-class";

/** A start card that submits its form: busy while the action runs. */
export function StartChoiceSubmit({
  name,
  value,
  children,
}: {
  name: string;
  value: string;
  children: ReactNode;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      name={name}
      value={value}
      disabled={pending}
      aria-busy={pending || undefined}
      className={startChoiceClass}
    >
      {children}
    </button>
  );
}
