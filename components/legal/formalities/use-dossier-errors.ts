"use client";

import { useEffect, useRef, useState } from "react";

import { dossierErrors } from "@/lib/legal/formalities/field-errors";

/** Once « Valider le dossier » is tried, what the dossier misses (codes of
 * formality_missing) said under each field until its value is fixed; the
 * first field in red takes the focus when the validation ends. */
export function useDossierErrors(
  missing: string[],
  values: Record<string, unknown>,
  pending: boolean,
) {
  const [tried, setTried] = useState(false);
  const [edited, setEdited] = useState<ReadonlySet<string>>(new Set());
  const root = useRef<HTMLDivElement>(null);
  const focusNext = useRef(false);

  useEffect(() => {
    if (pending || !focusNext.current) return;
    focusNext.current = false;
    const first = root.current?.querySelector<HTMLElement>(
      '[aria-invalid="true"]',
    );
    first?.focus({ preventScroll: true });
    first?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [pending, missing]);

  return {
    root,
    errors: tried ? dossierErrors(missing, values, edited) : null,
    markEdited: (key: string) => setEdited((all) => new Set(all).add(key)),
    attempt: () => {
      setTried(true);
      setEdited(new Set());
      focusNext.current = true;
    },
  };
}
