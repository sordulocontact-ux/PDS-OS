"use client";

import { useEffect, useRef, useState } from "react";

import { PdsLogo } from "@/components/shell/pds-logo";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { onboarding } from "@/lib/i18n/fr/onboarding";
import { cn } from "@/lib/utils";

import type { OnboardingProfile } from "./onboarding-provider";
import { OnboardingText } from "./onboarding-text";
import { OnboardingVisual } from "./onboarding-visuals";

const fr = { onboarding };

const STEPS = 4;

/**
 * The presentation of the first connection (docs/DESIGN.md § 4, « Présentation »):
 * four screens in the app's one modal, what to read on the left, a piece of the
 * app in small on the right. A click beside it never ends it.
 */
export function OnboardingDialog({
  open,
  profile,
  onClose,
}: {
  open: boolean;
  profile: OnboardingProfile;
  onClose: (skipped: boolean) => void;
}) {
  const t = fr.onboarding;
  const [step, setStep] = useState(0);
  const [backwards, setBackwards] = useState(false);
  const primary = useRef<HTMLButtonElement>(null);
  const last = step === STEPS - 1;
  const moved = useRef(false);

  function go(delta: number) {
    const target = step + delta;
    if (target < 0 || target >= STEPS) return;
    moved.current = true;
    setBackwards(delta < 0);
    setStep(target);
  }

  // « Retour » disappears on the first screen: the focus stays on the main action.
  useEffect(() => {
    if (moved.current) primary.current?.focus();
  }, [step]);

  // On the window, in the capture phase: a click beside the panel takes the focus
  // out of it, and the modal keeps the arrow keys pressed inside it to itself.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
      const delta = event.key === "ArrowRight" ? 1 : -1;
      const target = step + delta;
      if (target < 0 || target >= STEPS) return;
      moved.current = true;
      setBackwards(delta < 0);
      setStep(target);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, step]);

  const stepMotion = backwards ? "onboarding-step-back" : "onboarding-step";

  return (
    <Dialog
      open={open}
      disablePointerDismissal
      onOpenChange={(next) => {
        if (!next) onClose(!last);
      }}
    >
      <DialogContent
        side="center"
        closeLabel={t.skip}
        showClose={false}
        initialFocus={primary}
        className="gap-0 p-0 sm:max-w-[var(--dialog-width-wide)] md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,1.08fr)]"
      >
        <div className="flex min-w-0 flex-col gap-4 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] md:min-h-[540px] md:gap-5 md:px-8 md:py-7">
          <div className="flex min-h-8 items-center justify-between gap-3">
            <span
              aria-hidden
              className="flex size-8 items-center justify-center rounded-lg bg-[var(--nav-brand-bg)] text-[color:var(--nav-brand-fg)]"
            >
              <PdsLogo className="w-5" />
            </span>
            {!last && (
              <Button
                variant="ghost"
                size="sm"
                className="text-[color:var(--text-secondary)]"
                onClick={() => onClose(true)}
              >
                {t.skip}
              </Button>
            )}
          </div>

          <div key={step} aria-live="polite" className={stepMotion}>
            <OnboardingText step={step} profile={profile} />
          </div>

          <div className="mt-auto flex items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2">
              <Button
                ref={primary}
                onClick={() => (last ? onClose(false) : go(1))}
              >
                {step === 0 ? t.start : last ? t.done : t.next}
              </Button>
              {step > 0 && (
                <Button variant="ghost" onClick={() => go(-1)}>
                  {t.back}
                </Button>
              )}
            </div>
            <div aria-hidden className="flex gap-1.5">
              {Array.from({ length: STEPS }, (_, index) => (
                <span
                  key={index}
                  className={cn(
                    "h-1.5 rounded-pill transition-[width,background-color] duration-[var(--duration-slide)] ease-[var(--ease-out)]",
                    index === step
                      ? "w-[18px] bg-[var(--text-primary)]"
                      : "w-1.5 bg-[var(--border-default)]",
                  )}
                />
              ))}
            </div>
          </div>
        </div>

        <div
          inert
          className="relative order-first m-2 mb-0 grid min-w-0 place-items-center overflow-hidden rounded-[10px] border border-[color:var(--border-hairline)] bg-[var(--surface-app)] px-4 pt-7 pb-5 md:order-none md:mb-2 md:p-7"
        >
          {step > 0 && (
            <span className="absolute top-2 right-3 text-[length:var(--type-micro)] leading-[var(--type-micro-lh)] text-[color:var(--text-tertiary)]">
              {t.example}
            </span>
          )}
          <div
            key={step}
            className={cn("grid w-full justify-items-center", stepMotion)}
          >
            <OnboardingVisual step={step} profile={profile} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
