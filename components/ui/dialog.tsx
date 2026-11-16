"use client";

import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { createContext, useContext } from "react";
import { IconXmark } from "nucleo-sharp-essential";

import { Button } from "@/components/ui/button";
import { useDesignStyle } from "@/components/shell/use-design-style";
import {
  panelWidth,
  sidePanelClass,
  sidePanelScrimClass,
} from "@/components/ui/side-panel-class";
import { cn } from "@/lib/utils";

// The one modal of the app (docs/DESIGN.md § 4, « Modale »): the light
// glass of the « Projet complet » proto — a scrim over the page, slightly
// blurred, and a translucent panel that follows the page's theme
// (--surface-glass), so what it holds reads the page's own tokens. It fades
// in with a slight scale (opacity only under reduced motion) and leaves
// faster. 520 px wide (900 px through FormDialog's `wide`); on phones it sits
// at the bottom, full width, so its actions stay within thumb reach, and
// rises from the bottom edge.

// Enters in --duration-base, leaves a little faster.
const fade =
  "duration-[var(--duration-base)] ease-[var(--ease-out)] data-starting-style:opacity-0 data-ending-style:opacity-0 data-ending-style:duration-[var(--duration-fast)]";
// When motion is allowed, the panel rises from the bottom edge on phones
// (where it sits, a bottom sheet) and grows from .97 elsewhere.
const pop =
  "motion-safe:transition-[opacity,scale,translate] max-sm:motion-safe:data-starting-style:translate-y-full max-sm:motion-safe:data-ending-style:translate-y-full sm:motion-safe:data-starting-style:scale-[.97] motion-reduce:transition-opacity";
// The blur itself rises with the panel: switched on at once, the whole page
// seemed to reload before the modal appeared.
const scrimMotion =
  "transition-[opacity,backdrop-filter] data-starting-style:backdrop-blur-[0px] data-ending-style:backdrop-blur-[0px]";

// Where a section opens its modals (Sacha 15/11/2026: in Finance, every
// form opens as the panel on the right, over the sheet it comes from, so one
// stays where one is). `className` scopes the panel to its section's theme,
// as it is drawn in a portal. Without a section's choice, the style's: the
// panel on the right in the new style, everywhere (docs/STYLE-FINANCE-
// PARTOUT.md § 6.8), the centred glass in the classic one.
type DialogSide = { side?: "center" | "right"; className?: string };
const DialogSideContext = createContext<DialogSide>({});
function DialogSideProvider({
  side,
  className,
  children,
}: DialogSide & { children: React.ReactNode }) {
  return (
    <DialogSideContext.Provider value={{ side, className }}>
      {children}
    </DialogSideContext.Provider>
  );
}

/** The theme class of the section the component is drawn in, for what it
 * opens in a portal (a menu): undefined outside a section that sets one. */
function useSectionThemeClass() {
  return useContext(DialogSideContext).className;
}

// The panel on the right, as the side sheet (side-panel-class.ts), its
// content padded and scrolling.
const rightPanel = cn(sidePanelClass, "gap-5 overflow-y-auto p-6");

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;

function DialogContent({
  className,
  children,
  closeLabel,
  showClose = true,
  instant = false,
  side: sideProp,
  size = "default",
  ...props
}: DialogPrimitive.Popup.Props & {
  // Overrides the section's and the style's choice: the ⌘K search, the
  // image viewer, the presentation and PO stay centred.
  side?: "center" | "right";
  // The width of the panel on the right for a longer form; the centred
  // modal takes its width from `className`, as before.
  size?: keyof typeof panelWidth;
  closeLabel: string;
  // False when the content has its own way out (the presentation's « Passer »).
  showClose?: boolean;
  // Opened by a keyboard shortcut (PO's Espace Espace): no motion, it must
  // be there the moment the keys are pressed.
  instant?: boolean;
}) {
  const section = useContext(DialogSideContext);
  const style = useDesignStyle();
  const side =
    sideProp ?? section.side ?? (style === "classic" ? "center" : "right");
  if (side === "right")
    return (
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className={sidePanelScrimClass} />
        <DialogPrimitive.Popup
          data-slot="dialog-content"
          className={cn(
            rightPanel,
            panelWidth[size],
            section.className,
            className,
          )}
          {...props}
        >
          {children}
          {showClose && (
            <DialogPrimitive.Close
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="absolute top-5 right-4"
                />
              }
            >
              <IconXmark aria-hidden />
              <span className="sr-only">{closeLabel}</span>
            </DialogPrimitive.Close>
          )}
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    );
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Backdrop
        className={cn(
          "fixed inset-0 z-50 bg-[var(--glass-scrim)] backdrop-blur-[var(--glass-blur)]",
          !instant && scrimMotion,
          !instant && fade,
        )}
      />
      <DialogPrimitive.Popup
        data-slot="dialog-content"
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 flex max-h-[calc(100dvh-2rem)] flex-col gap-5 overflow-y-auto p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-foreground shadow-elevation-modal outline-none sm:inset-x-auto sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:w-[calc(100%-2rem)] sm:max-w-[var(--dialog-width)] sm:-translate-x-1/2 sm:-translate-y-1/2",
          !instant && pop,
          !instant && fade,
          "surface-glass rounded-t-3xl border border-[color:var(--border-default)] bg-[var(--surface-glass)] backdrop-blur-[var(--glass-panel-blur)] sm:rounded-3xl",
          className,
        )}
        {...props}
      >
        {children}
        {showClose && (
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
        )}
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
  DialogSideProvider,
  useSectionThemeClass,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
};
