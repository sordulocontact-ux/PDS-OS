"use client";

import { useLinkStatus } from "next/link";
import { useEffect, useSyncExternalStore } from "react";

import { auth } from "@/lib/i18n/fr/auth";

const fr = { auth };

// A click on a link whose page is not ready yet (a project, an artist, a
// contact opened from a list, never prefetched: docs/ARCHITECTURE.md § 3
// bis) left the screen frozen without a sign (audit of 27/10/2026). Every
// ViewLink reports its pending navigation here, and one thin bar at the top
// of the window says it — past 150 ms only, so a ready page never flashes
// it. Nothing changes in the link itself: no layout shift anywhere.
let pending = 0;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const emit = () => {
  for (const listener of listeners) listener();
};

/** Rendered inside a Link: reports while its navigation is pending. */
export function LinkPendingReporter() {
  const { pending: waiting } = useLinkStatus();
  useEffect(() => {
    if (!waiting) return;
    pending += 1;
    emit();
    return () => {
      pending -= 1;
      emit();
    };
  }, [waiting]);
  return null;
}

// A write started by a click (a Server Action in a transition) only disabled
// its button, which then read as a dead control for the seconds the write
// and the page's new rendering took (Sacha, 28/10/2026: « je sais pas si on
// a cliqué »). Rather than a prop on each of the 366 buttons that disable
// themselves while pending, a button that disables itself right after its
// click is taken for a write in flight: it alone (not its disabled
// neighbours) shows a spinner in place of its icon (`data-busy`,
// app/globals.css), and the bar runs, until it is enabled again or leaves
// the page.
const DISABLED_WITHIN_MS = 400;
const BUSY_AT_MOST_MS = 30_000;
const CHECK_MS = 200;

const isDisabled = (button: HTMLButtonElement) =>
  button.disabled ||
  button.hasAttribute("data-disabled") ||
  button.getAttribute("aria-disabled") === "true";

function watchPresses(): () => void {
  const busy = new Map<HTMLButtonElement, number>();
  let timer: number | null = null;

  const release = (button: HTMLButtonElement) => {
    busy.delete(button);
    button.removeAttribute("data-busy");
    button.removeAttribute("aria-busy");
    pending -= 1;
    emit();
  };
  const check = () => {
    const now = Date.now();
    for (const [button, since] of busy)
      if (
        !button.isConnected ||
        !isDisabled(button) ||
        now - since > BUSY_AT_MOST_MS
      )
        release(button);
    if (busy.size === 0 && timer !== null) {
      window.clearInterval(timer);
      timer = null;
    }
  };
  const hold = (button: HTMLButtonElement) => {
    if (busy.has(button)) return;
    busy.set(button, Date.now());
    button.setAttribute("data-busy", "");
    button.setAttribute("aria-busy", "true");
    pending += 1;
    emit();
    timer ??= window.setInterval(check, CHECK_MS);
  };
  const pressed = (button: HTMLButtonElement | null) => {
    if (!button || isDisabled(button)) return;
    const observer = new MutationObserver(() => {
      if (!isDisabled(button)) return;
      observer.disconnect();
      hold(button);
    });
    observer.observe(button, {
      attributes: true,
      attributeFilter: ["disabled", "data-disabled", "aria-disabled"],
    });
    window.setTimeout(() => observer.disconnect(), DISABLED_WITHIN_MS);
  };

  const onClick = (event: MouseEvent) =>
    pressed(
      event.target instanceof Element
        ? event.target.closest<HTMLButtonElement>("button")
        : null,
    );
  // Enter in a field submits through the form's button without a click (a
  // click is seen twice, held once).
  const onSubmit = (event: SubmitEvent) =>
    event.submitter instanceof HTMLButtonElement && pressed(event.submitter);
  document.addEventListener("click", onClick, true);
  document.addEventListener("submit", onSubmit, true);
  return () => {
    document.removeEventListener("click", onClick, true);
    document.removeEventListener("submit", onSubmit, true);
    if (timer !== null) window.clearInterval(timer);
    for (const button of [...busy.keys()]) release(button);
  };
}

/** The bar, once in the authenticated shell; it also watches the presses. */
export function NavigationProgress() {
  useEffect(watchPresses, []);
  const busy = useSyncExternalStore(
    subscribe,
    () => pending > 0,
    () => false,
  );
  if (!busy) return null;
  return (
    <div
      role="progressbar"
      aria-label={fr.auth.common.loading}
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-0.5 animate-nav-reveal overflow-hidden"
    >
      <div className="h-full w-1/3 animate-nav-progress bg-primary motion-reduce:w-full motion-reduce:animate-none" />
    </div>
  );
}
