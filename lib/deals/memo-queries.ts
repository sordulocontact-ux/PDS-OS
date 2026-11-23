import "server-only";

import type {
  DealContract,
  DealMemo,
  MemoCheck,
  MemoFile,
  MemoTerm,
} from "@/lib/deals/memos";
import { parseTermValue } from "@/lib/deals/term-format";
import { termOf, TERM_STATES, type TermState } from "@/lib/deals/terms";
import type { DealKind } from "@/lib/deals/types";
import { personName } from "@/lib/projects/types";
import { createClient } from "@/lib/supabase/server";

// Read with the user's session (BIZ 7): whoever reads the deal reads its
// memos, its contract (read_deal_contract) and the checks.

const isState = (v: unknown): v is TermState =>
  typeof v === "string" && (TERM_STATES as readonly string[]).includes(v);

type Person = { first_name: string; last_name: string | null } | null;
const nameOf = (p: Person) =>
  p ? personName(p.first_name, p.last_name) : null;

/** A memo's photo read back in the configured order; a term no longer in
 * the configuration, or no longer of its shape, is left out. */
function termsOf(kind: DealKind, raw: unknown): MemoTerm[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item): MemoTerm[] => {
    if (!item || typeof item !== "object") return [];
    const { key, value, state } = item as Record<string, unknown>;
    const term = typeof key === "string" ? termOf(kind, key) : null;
    const parsed = term ? parseTermValue(term.format, value) : null;
    return term && parsed && isState(state)
      ? [{ key: term.key, format: term.format, value: parsed, state }]
      : [];
  });
}

const MEMO_COLUMNS =
  "id, number, status, source, terms, stage, created_at, validated_at, email_from, email_subject, email_text, received_at, submitted_at, changes_reason, changes_at, correction_sent_at, correction_sent_to, sent_at, sent_to, author:people!deal_memos_created_by_fkey(first_name, last_name), validator:people!deal_memos_validated_by_fkey(first_name, last_name), submitter:people!deal_memos_submitted_by_fkey(first_name, last_name), changer:people!deal_memos_changes_by_fkey(first_name, last_name), sender:people!deal_memos_sent_by_fkey(first_name, last_name)";

// A link to open a received PDF lives an hour (the page is read again long
// before).
const FILE_LINK_SECONDS = 3600;

/** The PDFs of the memos received by e-mail, by memo, each with its link. */
async function memoFiles(
  supabase: Awaited<ReturnType<typeof createClient>>,
  memoIds: string[],
): Promise<Map<string, MemoFile[]>> {
  const byMemo = new Map<string, MemoFile[]>();
  if (memoIds.length === 0) return byMemo;
  const { data, error } = await supabase
    .from("deal_memo_files")
    .select("id, memo_id, path, file_name")
    .in("memo_id", memoIds)
    .order("created_at");
  if (error) console.error("memoFiles:", error.message);
  const rows = data ?? [];
  if (rows.length === 0) return byMemo;
  const { data: links } = await supabase.storage
    .from("deal-files")
    .createSignedUrls(
      rows.map((r) => r.path),
      FILE_LINK_SECONDS,
    );
  const urlOf = new Map(
    (links ?? []).flatMap((l) => (l.path ? [[l.path, l.signedUrl]] : [])),
  );
  for (const r of rows) {
    const list = byMemo.get(r.memo_id) ?? [];
    list.push({ id: r.id, name: r.file_name, url: urlOf.get(r.path) ?? null });
    byMemo.set(r.memo_id, list);
  }
  return byMemo;
}

/** The deal's memos, the latest first. `withFiles`: the links to open the
 * PDFs received by e-mail (the page; not the PDF export). */
export async function loadDealMemos(
  dealId: string,
  kind: DealKind,
  withFiles = false,
): Promise<DealMemo[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("deal_memos")
    .select(MEMO_COLUMNS)
    .eq("deal_id", dealId)
    .order("number", { ascending: false });
  if (error) console.error("loadDealMemos:", error.message);
  const rows = data ?? [];
  const files = withFiles
    ? await memoFiles(
        supabase,
        rows.filter((m) => m.source !== "pds").map((m) => m.id),
      )
    : new Map<string, MemoFile[]>();
  return rows.map((m) => ({
    id: m.id,
    number: m.number,
    status: m.status === "validated" ? "validated" : "draft",
    source:
      m.source === "email" ? "email" : m.source === "upload" ? "upload" : "pds",
    terms: termsOf(kind, m.terms),
    stage: m.stage,
    createdBy: nameOf(m.author),
    createdAt: m.created_at,
    validatedBy: nameOf(m.validator),
    validatedAt: m.validated_at,
    email: m.received_at
      ? {
          from: m.email_from,
          subject: m.email_subject,
          text: m.email_text,
          receivedAt: m.received_at,
        }
      : null,
    files: files.get(m.id) ?? [],
    submitted: m.submitted_at
      ? { by: nameOf(m.submitter), at: m.submitted_at }
      : null,
    changes:
      m.changes_at && m.changes_reason
        ? { reason: m.changes_reason, by: nameOf(m.changer), at: m.changes_at }
        : null,
    correction: m.correction_sent_at
      ? { at: m.correction_sent_at, to: m.correction_sent_to }
      : null,
    sent: m.sent_at
      ? { by: nameOf(m.sender), at: m.sent_at, to: m.sent_to }
      : null,
  }));
}

/** The deal's contract, or null when none is linked. */
export async function loadDealContract(
  dealId: string,
): Promise<DealContract | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("read_deal_contract", { p_deal_id: dealId })
    .maybeSingle();
  if (error) console.error("read_deal_contract:", error.message);
  if (!data) return null;
  return {
    id: data.contract_id,
    source: data.source === "participation" ? "participation" : "deal",
    title: data.title,
    type: data.type,
    status: data.status,
    signedOn: data.signed_on ?? null,
    amountCents: data.amount_cents ?? null,
    visible: data.visible,
  };
}

/** The checks of a memo against one contract. */
export async function loadMemoChecks(
  memoId: string,
  contractId: string,
): Promise<MemoCheck[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("deal_memo_checks")
    .select(
      "term_key, verdict, note, checked_at, author:people!deal_memo_checks_checked_by_fkey(first_name, last_name)",
    )
    .eq("memo_id", memoId)
    .eq("contract_id", contractId);
  if (error) console.error("loadMemoChecks:", error.message);
  return (data ?? []).map((c) => ({
    key: c.term_key,
    verdict: c.verdict === "different" ? "different" : "conform",
    note: c.note,
    by: nameOf(c.author),
    at: c.checked_at,
  }));
}

/** The contracts a deal may name, for whoever writes it (not a
 * participation's deal: its contract is the participation's). */
export async function loadDealContractOptions(
  dealId: string,
): Promise<Record<string, string>> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_deal_contract_options", {
    p_deal_id: dealId,
  });
  if (error) console.error("list_deal_contract_options:", error.message);
  return Object.fromEntries((data ?? []).map((c) => [c.contract_id, c.title]));
}
