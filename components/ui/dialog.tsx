"use client";

import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { IconXmark } from "nucleo-sharp-essential";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Modal of the design system (docs/DESIGN.md § 7): 10 px radius, elevation 3,
// rgba(0,0,0,.4) scrim without blur, no motion (§ 6). On phones it sits at
// the bottom, full width, so its actions stay within thumb reach.

const Dialog = DialogPrimitive.Root;

function DialogContent({
  className,
  children,
  closeLabel,
  ...props
}: DialogPrimitive.Popup.Props & { closeLabel: string }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-[var(--overlay-scrim)]" />
      <DialogPrimitive.Popup
        data-slot="dialog-content"
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 flex max-h-[calc(100dvh-2rem)] flex-col gap-5 overflow-y-auto rounded-t-[var(--radius-xl)] bg-background p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-foreground shadow-elevation-3 outline-none sm:inset-x-auto sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:w-[calc(100%-2rem)] sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[var(--radius-xl)] sm:p-6",
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

export { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle };
