// Where each step of the journey lives: one page per step, under the
// deliverable (no catch-all route, docs/ARCHITECTURE.md § 12). Client-safe.

import { routes } from "@/lib/auth/redirects";

import type { StepKey } from "./types";

export const stepHref = (
  projectId: string,
  deliverableId: string,
  key: StepKey,
): string => routes.projectProductionStep(projectId, deliverableId, key);
