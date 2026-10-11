import "server-only";

import { notFound } from "next/navigation";
import { cache } from "react";

import {
  canValidateMarketing,
  canWriteActivation,
} from "@/lib/activations/access";
import { loadActivationsBoard } from "@/lib/activations/board";
import type { ActivationSummary } from "@/lib/activations/types";
import type { Access } from "@/lib/auth/access";
import { routes } from "@/lib/auth/redirects";
import { loadMembers } from "@/lib/framing/related";
import { fr } from "@/lib/i18n/fr";
import { requireLaunchedProject } from "@/lib/projects/queries";

const t = fr.activations.tabs;

/** The tabs of an activation's page, by kind and mode : Pilotage always ;
 * Influence and RP add their framing ; in house, the concepts (Influence)
 * and the collaborations or targets ; through an agency, its file and its
 * report. Six at most. */
export function activationTabs(projectId: string, a: ActivationSummary) {
  const tab = (key: string) =>
    routes.projectActivationTab(projectId, a.id, key);
  const tabs = [
    {
      href: routes.projectActivation(projectId, a.id),
      label: t.pilotage,
      exact: true,
    },
  ];
  if (a.kind !== "influence" && a.kind !== "press") return tabs;
  tabs.push({ href: tab("framing"), label: t.framing, exact: false });
  if (a.mode === "agency")
    tabs.push(
      { href: tab("agency"), label: t.agency, exact: false },
      { href: tab("report"), label: t.report, exact: false },
    );
  else {
    if (a.kind === "influence")
      tabs.push({ href: tab("concepts"), label: t.concepts, exact: false });
    tabs.push({
      href: tab("targets"),
      label: a.kind === "influence" ? t.collaborations : t.targets,
      exact: false,
    });
  }
  return tabs;
}

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
