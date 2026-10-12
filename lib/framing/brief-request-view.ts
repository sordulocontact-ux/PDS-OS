// The validator's requests on the Brief (PROJ-UX-06), as the Brief page
// reads them: where each one points, whether the latest version changed it,
// what is still open. Decided by code from the stored versions, the same
// comparison as the database (framing_brief_answers). Client-safe.

import { routes } from "@/lib/auth/redirects";
import {
  snapshotOf,
  type BriefSnapshot,
  type SnapshotItem,
} from "@/lib/framing/brief-snapshot";
import type { Dimension, QuestionKey } from "@/lib/framing/dimensions";
import { fr } from "@/lib/i18n/fr";

export type BriefRequest = {
  id: string;
  // The version the validator read when asking.
  briefId: string;
  dimension: Dimension;
  questionKey: QuestionKey | null;
  body: string;
  mandatory: boolean;
  state: "open" | "resolved" | "rejected";
  resolution: "modified" | "justified" | "withdrawn" | null;
  resolutionNote: string | null;
  resolvedBriefId: string | null;
  createdAt: string;
  resolvedAt: string | null;
  authorName: string | null;
  resolverName: string | null;
};

type Version = { id: string; version: number; content: unknown };

/** « Objectif · Objectif du projet », or the dimension alone. */
export function requestAnchor(request: BriefRequest): string {
  const t = fr.framingIntel;
  const dimension = t.dimensions[request.dimension];
  return request.questionKey
    ? `${dimension} · ${t.questions[request.questionKey].label}`
    : dimension;
}

/** Where the request is corrected: its question, or its dimension. */
export function requestHref(projectId: string, request: BriefRequest): string {
  return request.questionKey
    ? routes.projectFramingQuestion(
        projectId,
        request.dimension,
        request.questionKey,
      )
    : routes.projectFramingStep(projectId, request.dimension);
}

const answersOf = (
  snapshot: BriefSnapshot | null,
  dimension: Dimension,
  key: QuestionKey | null,
): string =>
  JSON.stringify(
    (snapshot?.dimensions ?? [])
      .filter((d) => d.dimension === dimension)
      .flatMap((d) => d.items)
      .filter((item: SnapshotItem) => key === null || item.key === key)
      .map((item) => [item.key, item.value ?? null, item.lines ?? []])
      .sort(([a], [b]) => String(a).localeCompare(String(b))),
  );

/**
 * Whether the latest version changed what an open request points at since
 * the version it was asked on (then « Marquer comme corrigée » needs no
 * justification; the database checks it again).
 */
export function requestChanged(
  request: BriefRequest,
  versions: Version[],
): boolean {
  const asked = versions.find((v) => v.id === request.briefId);
  const latest = versions[0];
  if (!asked || !latest || latest.version <= asked.version) return false;
  return (
    answersOf(
      snapshotOf(latest.content),
      request.dimension,
      request.questionKey,
    ) !==
    answersOf(snapshotOf(asked.content), request.dimension, request.questionKey)
  );
}

export const isOpenRequest = (r: BriefRequest) => r.state === "open";
export const blocksValidation = (r: BriefRequest) =>
  r.state === "open" && r.mandatory;

/** The requests a Brief item shows in place: its question's, then none. */
export function requestsAt(
  requests: BriefRequest[],
  dimension: Dimension,
  key: QuestionKey | null,
): BriefRequest[] {
  return requests.filter(
    (r) => r.dimension === dimension && r.questionKey === key,
  );
}
