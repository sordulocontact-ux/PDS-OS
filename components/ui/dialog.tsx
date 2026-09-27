"use client";

import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { IconXmark } from "nucleo-sharp-essential";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Modal of the design system (docs/DESIGN.md § 7): 10 px radius, elevation 3,
// rgba(0,0,0,.4) scrim without blur, no motion (§ 6). On phones it sits at
// the bottom, full width, so its actions stay within thumb reach.
// variant="glass" (§ 4 bis): the page blurred, not darkened, behind a
// dark translucent panel whose tokens invert what it holds.

const backdropVariants = {
  default: "bg-[var(--overlay-scrim)]",
  glass:
    "backdrop-blur-[var(--glass-blur)]",
} as const;

const popupVariants = {
  default: "rounded-t-[var(--radius-xl)] bg-background sm:rounded-[var(--radius-xl)]",
  glass:
    "surface-glass rounded-t-3xl bg-[var(--surface-glass)] backdrop-blur-[var(--glass-blur)] sm:rounded-3xl",
} as const;

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;

function DialogContent({
  className,
  children,
  closeLabel,
  variant = "default",
  ...props
}: DialogPrimitive.Popup.Props & {
  closeLabel: string;
  variant?: keyof typeof popupVariants;
}) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Backdrop
        className={cn("fixed inset-0 z-50", backdropVariants[variant])}
      />
      <DialogPrimitive.Popup
        data-slot="dialog-content"
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 flex max-h-[calc(100dvh-2rem)] flex-col gap-5 overflow-y-auto p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-foreground shadow-elevation-3 outline-none sm:inset-x-auto sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:w-[calc(100%-2rem)] sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:p-6",
          popupVariants[variant],
          className,
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              className="absolute top-3 right-3"
            />
          }
        >
          <IconXmark aria-hidden />
          <span className="sr-only">{closeLabel}</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Popup>
    </DialogPrimitive.Portal>
  );
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div className={cn("flex flex-col gap-1 pr-8", className)} {...props} />
  );
}

function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      className={cn(
        "font-heading text-[length:var(--type-display-sm)] leading-[var(--type-display-sm-lh)] font-semibold",
        className,
      )}
      {...props}
    />
  );
}

function DialogDescription({
  className,
  ...props
}: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
};
