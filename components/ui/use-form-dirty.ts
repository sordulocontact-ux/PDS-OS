"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** What a form holds, comparable as text (useFormDirty, the dialog guard). */
export const formSnapshot = (form: HTMLFormElement) =>
  JSON.stringify(
    [...new FormData(form).entries()].map(([key, value]) => [
      key,
      typeof value === "string" ? value : value.name,
    ]),
  );

/**
 * Whether a form differs from what it showed when it mounted (PROJ-UX-08:
 * « Enregistrer » inactive without a change). The comparison reads the
 * form's own values, so a custom control (menu, date picker) counts as soon
 * as it writes its hidden field. Mount the form again after a save (a `key`)
 * to start from the saved values.
 */
export function useFormDirty() {
  const formRef = useRef<HTMLFormElement>(null);
  const initial = useRef<string | null>(null);
  const [dirty, setDirty] = useState(false);

  // Two frames after mounting: custom controls have written their fields.
  useEffect(() => {
    const id = requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        if (formRef.current) initial.current = formSnapshot(formRef.current);
      }),
    );
    return () => cancelAnimationFrame(id);
  }, []);

  // After the event: controls update their hidden fields on the next frame.
  const check = useCallback(() => {
    requestAnimationFrame(() => {
      const form = formRef.current;
      if (!form || initial.current === null) return;
      setDirty(formSnapshot(form) !== initial.current);
    });
  }, []);

  return { formRef, dirty, check };
}
