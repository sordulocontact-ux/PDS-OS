"use client";

import { useEffect, useRef, useState } from "react";

import {
  dossierErrors,
  withToConfirm,
} from "@/lib/legal/formalities/field-errors";
import type { FieldStateEntry } from "@/lib/legal/formalities/field-states";

/** Once « Générer la version à signer » is tried, what the dossier misses
 * (codes of formality_missing) and what is still « À vérifier » said in red
 * under each field until its value is fixed or confirmed; the first one —
 * a field in red or a « Confirmer » — takes the focus, whether the attempt
 * was refused on screen or by the server. */
export function useDossierErrors(
  missing: string[],
  values: Record<string, unknown>,
  pending: boolean,
  states: {
    items: FieldStateEntry[];
    sourceOf: (key: string) => string | null;
  },
) {
  const [tried, setTried] = useState(false);
  // One more per attempt: a refusal on screen changes neither `pending`
  // nor `missing`, and must take the focus all the same.
  const [attempts, setAttempts] = useState(0);
  const [edited, setEdited] = useState<ReadonlySet<string>>(new Set());
  const root = useRef<HTMLDivElement>(null);
  const focusNext = useRef(false);

  useEffect(() => {
    if (pending || !focusNext.current) return;
    focusNext.current = false;
    // The first in the page's order, whichever it is.
    const first = root.current?.querySelector<HTMLElement>(
      '[aria-invalid="true"], [data-to-confirm]',
    );
    first?.focus({ preventScroll: true });
    first?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [pending, missing, attempts]);

  return {
    root,
    errors: tried
      ? withToConfirm(
          dossierErrors(missing, values, edited),
          states.items,
          states.sourceOf,
        )
      : null,
    markEdited: (key: string) => setEdited((all) => new Set(all).add(key)),
    attempt: () => {
      setTried(true);
      setEdited(new Set());
      setAttempts((n) => n + 1);
      focusNext.current = true;
    },
  };
}
