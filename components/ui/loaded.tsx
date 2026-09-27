"use client";

import type { ReactNode } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { useLoaded } from "@/components/ui/use-loaded";

/** What a panel needs is loading, failed, or ready (loaded once on mount). */
export function Loaded<T>({
  load,
  loadingLabel,
  errorLabel,
  children,
}: {
  load: () => Promise<T>;
  loadingLabel: string;
  errorLabel: string;
  children: (data: T) => ReactNode;
}) {
  const state = useLoaded(load);
  if (state.status === "loading")
    return (
      <p role="status" className="text-sm text-muted-foreground">
        {loadingLabel}
      </p>
    );
  if (state.status === "error")
    return <FormMessage kind="error">{errorLabel}</FormMessage>;
  return children(state.data);
}
