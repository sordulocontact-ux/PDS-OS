"use client";

import type { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { createContext, useCallback, useContext, useRef } from "react";

import { formSnapshot } from "@/components/ui/use-form-dirty";

type OpenChange = NonNullable<DialogPrimitive.Root.Props["onOpenChange"]>;

/** Tells the guard a form of the modal is about to be touched. */
type DialogGuard = { note: (target: EventTarget) => void };

const DialogGuardContext = createContext<DialogGuard | null>(null);
const DialogGuardProvider = DialogGuardContext.Provider;

/** The guard of the modal the component is drawn in (DialogContent). */
function useDialogGuardNote() {
  return useContext(DialogGuardContext)?.note;
}

/**
 * A click beside a modal whose form was changed does not close it (UX test of
 * 24/11/2026: a misplaced click wiped « Prochaine action » for two testers
 * out of four, one blaming herself). Each form is read the first time it is
 * focused or pressed, before any change, and read again on the click beside:
 * different, the closing is cancelled. Escape and ✕ still close: they are
 * meant. Nested modals' forms are noted too (the events go up the React
 * tree); once closed they are no longer in the page and are skipped.
 */
function useDialogGuard(onOpenChange?: OpenChange) {
  const seen = useRef(new Map<HTMLFormElement, string>());
  const note = useCallback((target: EventTarget) => {
    if (!(target instanceof Element)) return;
    const form = target.closest("form");
    if (form && !seen.current.has(form))
      seen.current.set(form, formSnapshot(form));
  }, []);
  const changed = () =>
    [...seen.current].some(
      ([form, before]) => form.isConnected && formSnapshot(form) !== before,
    );
  const guarded: OpenChange = (open, details) => {
    if (!open && details.reason === "outside-press" && changed()) {
      details.cancel();
      return;
    }
    if (!open) seen.current.clear();
    onOpenChange?.(open, details);
  };
  return { guard: { note }, onOpenChange: guarded };
}

export { DialogGuardProvider, useDialogGuard, useDialogGuardNote };
