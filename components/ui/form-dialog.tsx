"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// A form in the design system's modal (bottom sheet on phones). The body is
// mounted per opening only: a form always starts from the saved values.
export function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  closeLabel,
  trigger,
  size = "default",
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  // Accessible name of the ✕ button.
  closeLabel: string;
  // A DialogTrigger, when the modal opens from its own button.
  trigger?: React.ReactNode;
  // `wide`: a longer form laid out wider rather than taller (feedback).
  size?: "default" | "wide";
  children: React.ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger}
      <DialogContent
        closeLabel={closeLabel}
        className={size === "wide" ? "sm:max-w-2xl" : undefined}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {open && <div className="flex flex-col gap-6">{children}</div>}
      </DialogContent>
    </Dialog>
  );
}
