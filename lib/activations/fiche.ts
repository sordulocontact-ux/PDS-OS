import "server-only";

import { notFound } from "next/navigation";
import { cache } from "react";

import {
  canValidateMarketing,
  canWriteActivation,
} from "@/lib/activations/access";
import { loadActivationsBoard } from "@/lib/activations/board";
import type { Access } from "@/lib/auth/access";
import { loadMembers } from "@/lib/framing/related";
import { requireLaunchedProject } from "@/lib/projects/queries";

/** One activation of a launched project, with who may do what. Cached per
 * request (the layout and the page share it). 404 when not visible. */
export const loadActivationFiche = cache(
  async (projectId: string, activationId: string, access: Access) => {
    const project = await requireLaunchedProject(projectId);
    const [board, members, canValidate] = await Promise.all([
      loadActivationsBoard(projectId),
      loadMembers(access),
      canValidateMarketing(projectId),
    ]);
    const activation = board.summaries.find((a) => a.id === activationId);
    if (!activation) notFound();
    return {
      project,
      board,
      activation,
      members,
      canWrite: canWriteActivation(access, project, activation),
      canValidate,
    };
  },
);

export type ActivationFiche = Awaited<ReturnType<typeof loadActivationFiche>>;
