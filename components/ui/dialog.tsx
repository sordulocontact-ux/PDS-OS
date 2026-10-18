"use client";

import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { IconXmark } from "nucleo-sharp-essential";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// The one modal of the app (docs/DESIGN.md § 4, « Modale »): the light
// glass of the « Projet complet » proto — a scrim over the page, slightly
// blurred, and a translucent panel that follows the page's theme
// (--surface-glass), so what it holds reads the page's own tokens. It fades
// in with a slight scale (opacity only under reduced motion) and leaves
// faster. 520 px wide (900 px through FormDialog's `wide`); on phones it sits
// at the bottom, full width, so its actions stay within thumb reach.

// Enters in --duration-base, leaves a little faster.
const fade =
  "duration-[var(--duration-base)] ease-[var(--ease-out)] data-starting-style:opacity-0 data-ending-style:opacity-0 data-ending-style:duration-[var(--duration-fast)]";
// The panel also grows from .97 when motion is allowed.
const pop =
  "motion-safe:transition-[opacity,scale] motion-safe:data-starting-style:scale-[.97] motion-reduce:transition-opacity";

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;

function DialogContent({
  className,
  children,
  closeLabel,
  ...props
}: DialogPrimitive.Popup.Props & {
  closeLabel: string;
}) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Backdrop
        className={cn(
          // The blur itself rises with the panel: switched on at once, the
          // whole page seemed to reload before the modal appeared.
          "fixed inset-0 z-50 bg-[var(--glass-scrim)] backdrop-blur-[var(--glass-blur)] transition-[opacity,backdrop-filter] data-starting-style:backdrop-blur-[0px] data-ending-style:backdrop-blur-[0px]",
          fade,
        )}
      />
      <DialogPrimitive.Popup
        data-slot="dialog-content"
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 flex max-h-[calc(100dvh-2rem)] flex-col gap-5 overflow-y-auto p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-foreground shadow-elevation-modal outline-none sm:inset-x-auto sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:w-[calc(100%-2rem)] sm:max-w-[var(--dialog-width)] sm:-translate-x-1/2 sm:-translate-y-1/2",
          pop,
          fade,
          "surface-glass rounded-t-3xl border border-[color:var(--border-default)] bg-[var(--surface-glass)] backdrop-blur-[var(--glass-panel-blur)] sm:rounded-3xl",
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
