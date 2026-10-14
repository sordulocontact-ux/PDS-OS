// Who produces a deliverable and who holds each role (Ibé, 14/10:
// docs/PRODUCTION-METIER.md § 0), read from production_sheets. Client-safe.

import type { Member } from "@/lib/framing/related";
import type { Holder } from "@/lib/production/sheet";
import type { Database } from "@/lib/supabase/database.types";

type SheetRow = Database["public"]["Tables"]["production_sheets"]["Row"];

export type OrganizationKind = "internal" | "external";
export const PROGRESS_KEYS = ["calls", "gear", "crew", "schedule"] as const;
export type ProgressKey = (typeof PROGRESS_KEYS)[number];
export type DirectionStatus = "draft" | "submitted" | "approved" | "changes";

export type SheetOrganization = {
  // Null: not chosen yet (the first step of the journey).
  kind: OrganizationKind | null;
  company: Holder | null;
  // Null: the project's owner handles what the line producer does.
  lineProducer: Member | null;
  quoteValidator: Member | null;
  dop: Holder | null;
  organizedAt: string | null;
  // The production company's own report of its preproduction.
  progress: Record<ProgressKey, boolean>;
  progressAt: string | null;
  direction: {
    status: DirectionStatus;
    comment: string | null;
    submittedAt: string | null;
    decidedBy: string | null;
    decidedAt: string | null;
  };
};

const DIRECTION: readonly DirectionStatus[] = [
  "draft",
  "submitted",
  "approved",
  "changes",
];

export function organizationOf(
  row: SheetRow,
  holderOf: (
    personId: string | null,
    contactId: string | null,
  ) => Holder | null,
  nameOf: (personId: string | null) => string | null,
): SheetOrganization {
  const member = (id: string | null): Member | null =>
    id ? { personId: id, name: nameOf(id) ?? "—" } : null;
  const progress = (row.company_progress ?? {}) as Record<string, unknown>;
  return {
    kind:
      row.organization === "internal" || row.organization === "external"
        ? row.organization
        : null,
    company: holderOf(null, row.company_contact_id),
    lineProducer: member(row.line_producer_person_id),
    quoteValidator: member(row.quote_validator_person_id),
    dop: holderOf(row.dop_person_id, row.dop_contact_id),
    organizedAt: row.organized_at,
    progress: Object.fromEntries(
      PROGRESS_KEYS.map((k) => [k, progress[k] === true]),
    ) as Record<ProgressKey, boolean>,
    progressAt: row.company_progress_at,
    direction: {
      status: DIRECTION.find((s) => s === row.direction_status) ?? "draft",
      comment: row.direction_comment,
      submittedAt: row.direction_submitted_at,
      decidedBy: nameOf(row.direction_decided_by),
      decidedAt: row.direction_decided_at,
    },
  };
}
