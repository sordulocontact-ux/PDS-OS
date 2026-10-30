"use client";

import { useEffect, useRef } from "react";

import { PdsLogo } from "@/components/shell/pds-logo";

// How long the logo stays centred, counted from the decision before the first
// paint; the movement itself is timed by the tokens of app/globals.css.
const HOLD_MS = 1000;
const REDUCED_HOLD_MS = 400;
// A page slower than this no longer waits for its logo: the splash just fades.
const MAX_WAIT_MS = 3000;

// The logo this page shows at rest: only one is laid out at a time (sidebar on
// desktop, header on mobile).
function findLanding() {
  return Array.from(
    document.querySelectorAll<SVGSVGElement>("[data-entry-logo]"),
  ).find((logo) => logo.getBoundingClientRect().width > 0);
}

// Sends the logo onto the page's own, then hands over to it.
async function leave(logo: SVGSVGElement, splash: HTMLElement) {
  const root = document.documentElement;
  const landing = findLanding();
  if (landing) {
    const from = logo.getBoundingClientRect();
    const to = landing.getBoundingClientRect();
    const x = to.left + to.width / 2 - (from.left + from.width / 2);
    const y = to.top + to.height / 2 - (from.top + from.height / 2);
    logo.style.setProperty("--entry-x", `${x}px`);
    logo.style.setProperty("--entry-y", `${y}px`);
    logo.style.setProperty("--entry-scale", String(to.width / from.width));
    logo.style.setProperty("--entry-color", getComputedStyle(landing).color);
    logo.style.setProperty("--entry-opacity", "1");
  }
  root.dataset.entry = "leaving";
  await Promise.allSettled(
    splash.getAnimations({ subtree: true }).map((run) => run.finished),
  );
  delete root.dataset.entry;
  delete root.dataset.entryAt;
}

// Plays the splash decided by the script of entry-splash.tsx; without that
// decision it stays hidden by CSS and does nothing.
export function EntrySplashPlayer() {
  const logoRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const root = document.documentElement;
    const logo = logoRef.current;
    const splash = logo?.parentElement;
    if (root.dataset.entry !== "hold" || !logo || !splash) return;

    const startedAt = Number(root.dataset.entryAt);
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const hold = reduced ? REDUCED_HOLD_MS : HOLD_MS;
    const observer = new MutationObserver(() => {
      if (findLanding()) go();
    });
    let timer: number | undefined;

    function go() {
      observer.disconnect();
      window.clearTimeout(timer);
      void leave(logo!, splash!);
    }

    timer = window.setTimeout(
      () => {
        if (findLanding()) return go();
        // The shell is still streaming: leave as soon as its logo arrives.
        observer.observe(document.body, { childList: true, subtree: true });
        timer = window.setTimeout(
          go,
          startedAt + MAX_WAIT_MS - performance.now(),
        );
      },
      startedAt + hold - performance.now(),
    );

    return () => {
      observer.disconnect();
      window.clearTimeout(timer);
    };
  }, []);

  return (
    <div className="entry-splash" aria-hidden>
      <div className="entry-splash-backdrop" />
      <PdsLogo ref={logoRef} className="entry-splash-logo" />
    </div>
  );
}
