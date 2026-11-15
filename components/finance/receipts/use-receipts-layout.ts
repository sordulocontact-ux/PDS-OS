"use client";

import { useSyncExternalStore } from "react";

export type ReceiptsLayout = "grid" | "list";

// A display preference of this browser only (CLAUDE.md rule 7 forbids
// localStorage for business data, not for this): grid or list.
const KEY = "pds-fin-receipts";
const EVENT = "pds-fin-receipts";

function read(): ReceiptsLayout {
  try {
    return localStorage.getItem(KEY) === "list" ? "list" : "grid";
  } catch {
    return "grid";
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(EVENT, onChange);
  };
}

/** The box of proofs as a grid of previews or as a list, remembered. */
export function useReceiptsLayout() {
  const layout = useSyncExternalStore(subscribe, read, () => "grid" as const);
  const setLayout = (next: ReceiptsLayout) => {
    try {
      localStorage.setItem(KEY, next);
    } catch {
      // Storage refused (private window): the choice is not kept.
    }
    window.dispatchEvent(new Event(EVENT));
  };
  return [layout, setLayout] as const;
}
