"use client";

import { createContext, useContext } from "react";

// The open step's why, no longer written under its title (Sacha, 27/11/2026:
// « les header sont toujours beaucoup trop surchargés »): the module's
// header hands it to its actions, and « Qui fait quoi » says it.
const StepWhyContext = createContext<string | null>(null);

export function StepWhyProvider({
  why,
  children,
}: {
  why: string | null;
  children: React.ReactNode;
}) {
  return <StepWhyContext value={why}>{children}</StepWhyContext>;
}

/** The open step's why, inside a module header's actions; else null. */
export function useStepWhy(): string | null {
  return useContext(StepWhyContext);
}
