"use client";

import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";

// Submit button that disables itself during the action and changes label.
// `busy`: work that goes on after the action (an upload), shown the same way.
export function SubmitButton({
  children,
  pendingLabel,
  busy = false,
  variant = "default",
  size = "lg",
  className,
}: {
  children: React.ReactNode;
  pendingLabel: string;
  busy?: boolean;
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
      disabled={pending}
      aria-busy={pending || undefined}
      className={className}
    >
      {pending ? pendingLabel : children}
    </Button>
  );
}
