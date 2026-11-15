import "server-only";

import { FINANCE_FILES_BUCKET } from "@/lib/finance/file-rules";
import type {
  FinanceProof,
  ProofKind,
  ProofReading,
} from "@/lib/finance/proofs";
import { personName } from "@/lib/projects/types";
import { createClient } from "@/lib/supabase/server";

// A signed link to look at the file, for the time of a visit.
const LINK_SECONDS = 3600;

const PROOF_COLUMNS =
  "id, file_path, file_name, mime, source, email_from, received_at, read_state, read_values, kind, vendor, vendor_verified, amount_cents, amount_verified, vat_cents, vat_verified, issued_on, issued_on_verified, reference, reference_verified, checked_at, line_id, attached_at, dismissed_at, dismiss_reason, uploader:people!finance_proofs_uploaded_by_fkey(first_name, last_name), checker:people!finance_proofs_checked_by_fkey(first_name, last_name), attacher:people!finance_proofs_attached_by_fkey(first_name, last_name)";

type Who = { first_name: string | null; last_name: string | null } | null;
const nameOf = (who: Who) =>
  who ? personName(who.first_name, who.last_name) || null : null;

/** The reading kept as it came (read_values), or null. */
function readingOf(raw: unknown): ProofReading | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const text = (v: unknown) => (typeof v === "string" ? v : null);
  const cents = (v: unknown) => (typeof v === "number" ? v : null);
  return {
    vendor: text(r.vendor),
    amountCents: cents(r.amountCents),
    vatCents: cents(r.vatCents),
    issuedOn: text(r.issuedOn),
    reference: text(r.reference),
  };
}

const KINDS: ProofKind[] = ["receipt", "invoice", "other"];

/**
 * The proofs of the box, newest first, each with a signed link to its file
 * and who dropped, checked and attached it. Read with the session: who reads
 * Finance sees them all, a member the ones they sent (RLS).
 */
export async function loadProofs(): Promise<{
  proofs: FinanceProof[];
  error: boolean;
}> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("finance_proofs")
    .select(PROOF_COLUMNS)
    .order("received_at", { ascending: false })
    .limit(500);
  if (error) console.error("loadProofs:", error.message);
  const rows = data ?? [];
  const { data: links } =
    rows.length > 0
      ? await supabase.storage.from(FINANCE_FILES_BUCKET).createSignedUrls(
          rows.map((r) => r.file_path),
          LINK_SECONDS,
        )
      : { data: [] };
  const urlOf = new Map(
    (links ?? []).flatMap((l) =>
      l.path && l.signedUrl ? [[l.path, l.signedUrl] as const] : [],
    ),
  );
  return {
    proofs: rows.map((r): FinanceProof => ({
      id: r.id,
      path: r.file_path,
      fileName: r.file_name,
      mime: r.mime,
      url: urlOf.get(r.file_path) ?? null,
      source: r.source === "email" ? "email" : "upload",
      from: nameOf(r.uploader),
      emailFrom: r.email_from,
      receivedAt: r.received_at,
      readState:
        r.read_state === "read" || r.read_state === "failed"
          ? r.read_state
          : "pending",
      kind: KINDS.find((k) => k === r.kind) ?? null,
      values: {
        vendor: r.vendor,
        amountCents: r.amount_cents === null ? null : Number(r.amount_cents),
        vatCents: r.vat_cents === null ? null : Number(r.vat_cents),
        issuedOn: r.issued_on,
        reference: r.reference,
      },
      verified: {
        vendor: r.vendor_verified,
        amount: r.amount_verified,
        vat: r.vat_verified,
        issuedOn: r.issued_on_verified,
        reference: r.reference_verified,
      },
      read: readingOf(r.read_values),
      checkedBy: nameOf(r.checker),
      checkedAt: r.checked_at,
      lineId: r.line_id,
      attachedBy: nameOf(r.attacher),
      attachedAt: r.attached_at,
      dismissedAt: r.dismissed_at,
      dismissReason: r.dismiss_reason,
    })),
    error: Boolean(error),
  };
}

/** The names of the envelopes a spend can go on (finance_targets), by id. */
export async function loadEnvelopeNames(): Promise<Map<string, string>> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("finance_targets");
  if (error) console.error("loadEnvelopeNames:", error.message);
  return new Map((data ?? []).map((t) => [t.id, t.name] as const));
}

/** How many proofs are still « à traiter » (neither attached nor set
 * aside): the count by Justificatifs in Finance's sidebar (lot 5). */
export async function countOpenProofs(): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("finance_proofs")
    .select("id", { count: "exact", head: true })
    .is("line_id", null)
    .is("dismissed_at", null);
  if (error) console.error("countOpenProofs:", error.message);
  return count ?? 0;
}

/** What the ⌘K search needs of a proof, and nothing more: no signed link,
 * no reading. Newest first, as the box. */
export type ProofIndexRow = {
  id: string;
  fileName: string;
  vendor: string | null;
  amountCents: number | null;
  reference: string | null;
  lineId: string | null;
  dismissed: boolean;
};

export async function loadProofIndex(): Promise<ProofIndexRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("finance_proofs")
    .select(
      "id, file_name, vendor, amount_cents, reference, line_id, dismissed_at",
    )
    .order("received_at", { ascending: false })
    .limit(500);
  if (error) console.error("loadProofIndex:", error.message);
  return (data ?? []).map((r) => ({
    id: r.id,
    fileName: r.file_name,
    vendor: r.vendor,
    amountCents: r.amount_cents === null ? null : Number(r.amount_cents),
    reference: r.reference,
    lineId: r.line_id,
    dismissed: r.dismissed_at !== null,
  }));
}
