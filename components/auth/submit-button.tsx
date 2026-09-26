"use client";

import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";

// Submit button that disables itself during the action and changes label.
export function SubmitButton({
  children,
  pendingLabel,
  variant = "default",
  size = "lg",
  className,
}: {
  children: React.ReactNode;
  pendingLabel: string;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg";
  className?: string;
}) {
  const { pending } = useFormStatus();

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
