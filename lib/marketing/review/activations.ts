import "server-only";

import { cache } from "react";

import { loadActivationsBoard } from "@/lib/activations/board";
import { loadActivationPeople } from "@/lib/activations/people";
import { phaseOf } from "@/lib/activations/phase";

import type { ReviewActivation } from "./review-activation";

/**
 * The project's activations as the Suivi & bilan reads them: the
 * Activations' own summaries (lib/activations/board.ts, cached per request
 * and already read by the project's journeys), with the viewer's session
 * (RLS decides) — the same phase, proof and statistics on both screens.
 */
export const loadReviewActivations = cache(
  async (projectId: string): Promise<ReviewActivation[]> => {
    const [board, people] = await Promise.all([
      loadActivationsBoard(projectId),
      loadActivationPeople(projectId),
    ]);
    return board.summaries.map((a) => ({
      id: a.id,
      title: a.title,
      status: a.status,
      reason: a.statusReason,
      ownerName: a.ownerPersonId ? people.person(a.ownerPersonId).name : null,
      startsOn: a.startsOn ?? a.createdAt.slice(0, 10),
      phase: phaseOf(a),
      proof: a.proof,
      measure: a.measure,
      lastFigure: a.lastFigure,
    }));
  },
);
