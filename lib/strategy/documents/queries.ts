import "server-only";

import { trackedCache } from "@/lib/projects/live-deps";

import type { Member } from "@/lib/framing/related";
import {
  listProjectCreatives,
  type CreativeMember,
} from "@/lib/projects/creatives";
import type { DocumentKind } from "@/lib/strategy/documents/model";
import { createClient } from "@/lib/supabase/server";

export type DocumentReview = {
  id: string;
  personId: string;
  name: string;
  state: "pending" | "approved" | "changes_requested" | "cancelled";
  comment: string | null;
  decidedAt: string | null;
  remindedAt: string | null;
  // MKT-S1-16: the critical alerts accepted, an approval with reserves.
  acceptedAlerts: string[];
  withReserves: boolean;
};

export type StrategyDocument = {
  id: string;
  kind: DocumentKind;
  version: number;
  state: "pending" | "sent" | "approved" | "changes_requested" | "superseded";
  content: unknown;
  createdAt: string;
  createdByName: string;
  sentAt: string | null;
  decidedAt: string | null;
  requestNote: string | null;
  changeComment: string | null;
  reviews: DocumentReview[];
};

export type StrategyDocuments = {
  revisionOpen: boolean;
  // Newest first, every kind.
  documents: StrategyDocument[];
  creatives: CreativeMember[];
};

const nameOf = (members: Member[], id: string | null) =>
  (id && members.find((m) => m.personId === id)?.name) || "—";

/**
 * The strategy's documents with their reviews, the revision flag and the
 * project's creative team (who may be asked to validate). RLS decides: a
 * reviewer reads the version sent to them.
 */
export const loadStrategyDocuments = trackedCache(
  async (projectId: string, members: Member[]): Promise<StrategyDocuments> => {
    const supabase = await createClient();
    const [workspace, documents, creatives] = await Promise.all([
      supabase
        .from("strategy_workspaces")
        .select("revision_opened_at")
        .eq("project_id", projectId)
        .maybeSingle(),
      supabase
        .from("strategy_documents")
        .select("*, strategy_document_reviews(*)")
        .eq("project_id", projectId)
        .order("version", { ascending: false }),
      listProjectCreatives(projectId),
    ]);
    if (documents.error)
      console.error("loadStrategyDocuments:", documents.error.message);
    return {
      revisionOpen: Boolean(workspace.data?.revision_opened_at),
      documents: (documents.data ?? []).map((d) => ({
        id: d.id,
        kind: d.kind as DocumentKind,
        version: d.version,
        state: d.state as StrategyDocument["state"],
        content: d.content,
        createdAt: d.created_at,
        createdByName: nameOf(members, d.created_by),
        sentAt: d.sent_at,
        decidedAt: d.decided_at,
        requestNote: d.request_note,
        changeComment: d.change_comment,
        reviews: (d.strategy_document_reviews ?? [])
          .map((r) => ({
            id: r.id,
            personId: r.person_id,
            name: nameOf(members, r.person_id),
            state: r.state as DocumentReview["state"],
            comment: r.comment,
            decidedAt: r.decided_at,
            remindedAt: r.reminded_at,
            acceptedAlerts: r.accepted_alerts,
            withReserves: r.with_reserves,
          }))
          .sort((a, b) => a.name.localeCompare(b.name, "fr")),
      })),
      creatives,
    };
  },
);
