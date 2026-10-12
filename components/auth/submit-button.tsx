"use client";

import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";

// Submit button that disables itself during the action and changes label.
// `busy`: work that goes on after the action (an upload), shown the same way.
// `disabled`: nothing to submit (a form with no change, PROJ-UX-08), never a
// stand-in for validation (docs/DESIGN.md § 4).
export function SubmitButton({
  children,
  pendingLabel,
  busy = false,
  disabled = false,
  variant = "default",
  size = "lg",
  className,
}: {
  children: React.ReactNode;
  pendingLabel: string;
  busy?: boolean;
  disabled?: boolean;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg";
  className?: string;
}) {
  const { pending: submitting } = useFormStatus();
  const pending = submitting || busy;

  return (
    <Button
      type="submit"
      variant={variant}
      size={size}
      disabled={pending || disabled}
      aria-busy={pending || undefined}
      className={className}
    >
      {pending ? pendingLabel : children}
    </Button>
  );
}
