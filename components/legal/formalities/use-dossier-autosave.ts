"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { toast } from "@/components/ui/toast";
import { autosaveFormalityValues } from "@/lib/legal/formalities/actions";
import type { Entry } from "@/lib/legal/formalities/field-states";

// A second after the last change: one save per pause, not per key.
const DELAY = 1000;

export type AutosaveState = "idle" | "saving" | "saved" | "failed";

/**
 * The SACEM dossier saved as it is filled (Sacha, 10/11/2026: what was typed
 * was lost on reload). One save at a time, the last values always win; the
 * form keeps what is on screen, only the page's « à faire » is read again
 * from the save. Off once a version was generated: a change there voids the
 * signatures (JUR-03), so it waits for « Générer », and leaving the page with
 * a change not saved asks first.
 */
export function useDossierAutosave({
  projectId,
  formalityId,
  entries,
  enabled,
}: {
  projectId: string;
  formalityId: string;
  entries: Record<string, Entry>;
  enabled: boolean;
}) {
  const [state, setState] = useState<AutosaveState>("idle");
  const latest = useRef(entries);
  // The values loaded with the page (same object until a change).
  const loaded = useRef(entries);
  const dirty = useRef(false);
  const failedOnce = useRef(false);
  const flight = useRef<Promise<void> | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const save = useCallback(async (): Promise<void> => {
    window.clearTimeout(timer.current);
    // A change made during a save is saved right after it.
    while (flight.current) await flight.current;
    if (!dirty.current) return;
    dirty.current = false;
    setState("saving");
    flight.current = autosaveFormalityValues(
      projectId,
      formalityId,
      latest.current,
    )
      .then(
        (result) => ({ ok: result.ok, error: result.ok ? "" : result.error }),
        () => ({ ok: false, error: "" }),
      )
      .then(({ ok, error }) => {
        if (ok) {
          failedOnce.current = false;
          setState(dirty.current ? "saving" : "saved");
          return;
        }
        // Kept for the next change or the next try; said once, not per save.
        dirty.current = true;
        setState("failed");
        if (!failedOnce.current && error) toast.error(error);
        failedOnce.current = true;
      })
      .finally(() => {
        flight.current = null;
      });
    await flight.current;
  }, [projectId, formalityId]);

  useEffect(() => {
    latest.current = entries;
    // The values loaded with the page are not a change.
    if (entries === loaded.current) return;
    dirty.current = true;
    if (!enabled) return;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => void save(), DELAY);
  }, [entries, enabled, save]);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (!dirty.current && !flight.current) return;
      if (enabled) void save();
      e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => {
      window.removeEventListener("beforeunload", warn);
      // Leaving the page within the second: saved on the way out.
      if (enabled && dirty.current) void save();
    };
  }, [enabled, save]);

  return {
    state: enabled ? state : "idle",
    /** Before « Générer » or the draft: no save left that could land after
     * theirs. */
    settle: async () => {
      window.clearTimeout(timer.current);
      if (flight.current) await flight.current;
    },
    /** « Générer » or the draft saved the whole dossier. */
    saved: () => {
      dirty.current = false;
    },
  };
}
