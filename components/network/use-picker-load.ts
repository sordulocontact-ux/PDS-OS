"use client";

import { useRef } from "react";

/** The `load` of a `PersonPickerField`: read once for every picker of a
 * form, read again (`fresh`) after a contact was added to the Réseau. */
export function usePickerLoad<T>(load: () => Promise<T[]>) {
  const cached = useRef<Promise<T[]> | null>(null);
  return (fresh?: boolean) =>
    fresh || !cached.current ? (cached.current = load()) : cached.current;
}
