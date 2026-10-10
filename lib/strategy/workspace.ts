import "server-only";

import { cache } from "react";

import type { Member } from "@/lib/framing/related";
import {
  listProjectCreatives,
  type CreativeMember,
} from "@/lib/projects/creatives";
import { createClient } from "@/lib/supabase/server";

export type DocumentKind = "brief" | "release_plan" | "press_kit";
export const DOCUMENT_KINDS: readonly DocumentKind[] = [
  "brief",
  "release_plan",
  "press_kit",
];

export type DocumentReview = {
  id: string;
  personId: string;
  name: string;
  state: "pending" | "approved" | "changes_requested" | "cancelled";
  comment: string | null;
  decidedAt: string | null;
  remindedAt: string | null;
};

export type StrategyDocument = {
  id: string;
  kind: DocumentKind;
  version: number;
  state: string;
  content: unknown;
  createdAt: string;
  createdByName: string;
  sentAt: string | null;
  decidedAt: string | null;
  decidedByName: string | null;
  changeComment: string | null;
  requestNote: string | null;
  reviews: DocumentReview[];
};

export type StrategyContext = {
  startedAt: string | null;
  revisionOpen: boolean;
  // Newest first, every kind.
  documents: StrategyDocument[];
  creatives: CreativeMember[];
};

const nameOf = (members: Member[], id: string | null) =>
  (id && members.find((m) => m.personId === id)?.name) || "—";

/** The workspace, the documents with their reviews, the creative team. */
export const loadStrategyContext = cache(
  async (projectId: string, members: Member[]): Promise<StrategyContext> => {
    const supabase = await createClient();
    const [workspace, documents, creatives] = await Promise.all([
      supabase
        .from("strategy_workspaces")
        .select("started_at, revision_opened_at")
        .eq("project_id", projectId)
        .maybeSingle(),
      supabase
        .from("strategy_documents")
        .select("*, strategy_document_reviews(*)")
        .eq("project_id", projectId)
        .order("version", { ascending: false }),
      listProjectCreatives(projectId),
    ]);
    return {
      startedAt: workspace.data?.started_at ?? null,
      revisionOpen: Boolean(workspace.data?.revision_opened_at),
      documents: (documents.data ?? []).map((d) => ({
        id: d.id,
        kind: d.kind as DocumentKind,
        version: d.version,
        state: d.state,
        content: d.content,
        createdAt: d.created_at,
        createdByName: nameOf(members, d.created_by),
        sentAt: d.sent_at,
        decidedAt: d.decided_at,
        decidedByName: d.decided_by ? nameOf(members, d.decided_by) : null,
        changeComment: d.change_comment,
        requestNote: d.request_note,
        reviews: (d.strategy_document_reviews ?? [])
          .map((r) => ({
            id: r.id,
            personId: r.person_id,
            name: nameOf(members, r.person_id),
            state: r.state as DocumentReview["state"],
            comment: r.comment,
            decidedAt: r.decided_at,
            remindedAt: r.reminded_at,
          }))
          .sort((a, b) => a.name.localeCompare(b.name, "fr")),
      })),
      creatives,
    };
  },
);

/** Versions of one kind, newest first. */
export const versionsOf = (docs: StrategyDocument[], kind: DocumentKind) =>
  docs.filter((d) => d.kind === kind);

/** The reference version of a kind: the latest approved one. */
export const approvedOf = (docs: StrategyDocument[], kind: DocumentKind) =>
  docs.find((d) => d.kind === kind && d.state === "approved") ?? null;
