import "server-only";

import { isBudgetFamily, isBudgetStatus } from "@/lib/budget/types";
import { loadEngines } from "@/lib/finance/engine-queries";
import type { EngineData } from "@/lib/finance/engines";
import { FINANCE_FILES_BUCKET } from "@/lib/finance/file-rules";
import {
  isIncomeKind,
  isReminderChannel,
  type FinanceFile,
  type Income,
} from "@/lib/finance/money-in";
import type { PaidDay, Statement } from "@/lib/finance/treasury";
import type { FinanceLine } from "@/lib/finance/types";
import { createClient } from "@/lib/supabase/server";

export type FinanceTarget = {
  // A deal and a member name an income's deal and owner (lot 2).
  kind: "project" | "artist" | "deal" | "member" | "cost_center";
  id: string;
  name: string;
  archived: boolean;
};

export type TreasuryData = {
  statement: Statement | null;
  reserveCents: number;
  incomes: Income[];
  receipts: PaidDay[];
  paid: PaidDay[];
  upcoming: FinanceLine[];
  targets: FinanceTarget[];
  engines: EngineData;
  error: boolean;
};

const INCOME_COLUMNS =
  "id, label, kind, amount_cents, contact_id, payer_name, project_id, artist_id, deal_id, owner_person_id, vat_bp, expected_on, invoice_number, invoiced_on, due_on, sent_on, file_path, file_name, next_action, next_action_on, note, cancelled_at, cancel_reason, receipts:finance_receipts(id, amount_cents, received_on, note), credits:finance_credit_notes(id, number, issued_on, amount_cents, reason, file_path, file_name), reminders:finance_reminders(id, reminded_on, channel, note, created_by), contact:network_contacts!finance_incomes_contact_same_org(name)";

// A PDF opened from a page: an hour is enough to click it.
const SIGNED_SECONDS = 3600;

/**
 * What the treasury and the money in are computed from, in one round of
 * reads with the user's session: the last statement of the account, the
 * reserve, every income and its receipts, the spends paid by day and those
 * still to pay up to `until`, the names of projects and artists. Nothing
 * without read_finance (RLS and the finance_* functions,
 * supabase/migrations/20261113100101_treasury.sql).
 */
export async function loadTreasury(until: string): Promise<TreasuryData> {
  const supabase = await createClient();
  const [statement, settings, incomes, cashOut, upcoming, targets, engines] =
    await Promise.all([
      supabase
        .from("treasury_balances")
        .select("balance_cents, as_of")
        .order("as_of", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase.from("treasury_settings").select("reserve_cents").maybeSingle(),
      supabase
        .from("finance_incomes")
        .select(INCOME_COLUMNS)
        .order("expected_on", { ascending: true }),
      supabase.rpc("finance_cash_out"),
      supabase.rpc("finance_lines", {
        p_kind: "upcoming",
        p_to: until,
        p_limit: 200,
      }),
      supabase.rpc("finance_targets"),
      loadEngines(supabase),
    ]);
  const results = { statement, settings, incomes, cashOut, upcoming, targets };
  for (const [name, result] of Object.entries(results))
    if (result.error)
      console.error(`loadTreasury (${name}):`, result.error.message);

  const rows = incomes.data ?? [];
  const paths = rows.flatMap((r) => [
    ...(r.file_path ? [r.file_path] : []),
    ...(r.credits ?? []).flatMap((c) => (c.file_path ? [c.file_path] : [])),
  ]);
  const signed = paths.length
    ? await supabase.storage
        .from(FINANCE_FILES_BUCKET)
        .createSignedUrls(paths, SIGNED_SECONDS)
    : null;
  if (signed?.error)
    console.error("loadTreasury (files):", signed.error.message);
  const urls = new Map(
    (signed?.data ?? []).flatMap((x) =>
      x.path && x.signedUrl ? [[x.path, x.signedUrl]] : [],
    ),
  );
  const fileOf = (
    path: string | null,
    name: string | null,
  ): FinanceFile | null =>
    path && name ? { path, name, url: urls.get(path) ?? null } : null;
  const nameOf = new Map(
    (targets.data ?? []).map((t) => [t.id, t.name] as const),
  );
  return {
    statement: statement.data
      ? {
          cents: Number(statement.data.balance_cents),
          asOf: statement.data.as_of,
        }
      : null,
    reserveCents: Number(settings.data?.reserve_cents ?? 0),
    incomes: rows.map((r) => ({
      id: r.id,
      label: r.label,
      kind: isIncomeKind(r.kind) ? r.kind : "other",
      cents: Number(r.amount_cents),
      contactId: r.contact_id,
      payer: r.contact?.name ?? r.payer_name,
      projectId: r.project_id,
      artistId: r.artist_id,
      dealId: r.deal_id,
      ownerId: r.owner_person_id,
      vatBp: r.vat_bp,
      expectedOn: r.expected_on,
      invoiceNumber: r.invoice_number,
      invoicedOn: r.invoiced_on,
      dueOn: r.due_on,
      sentOn: r.sent_on,
      file: fileOf(r.file_path, r.file_name),
      nextAction: r.next_action,
      nextActionOn: r.next_action_on,
      note: r.note,
      cancelledAt: r.cancelled_at,
      cancelReason: r.cancel_reason,
      receipts: (r.receipts ?? [])
        .map((x) => ({
          id: x.id,
          cents: Number(x.amount_cents),
          receivedOn: x.received_on,
          note: x.note,
        }))
        .sort((a, b) => a.receivedOn.localeCompare(b.receivedOn)),
      credits: (r.credits ?? [])
        .map((c) => ({
          id: c.id,
          number: c.number,
          issuedOn: c.issued_on,
          cents: Number(c.amount_cents),
          reason: c.reason,
          file: fileOf(c.file_path, c.file_name),
        }))
        .sort((a, b) => a.issuedOn.localeCompare(b.issuedOn)),
      reminders: (r.reminders ?? [])
        .map((x) => ({
          id: x.id,
          remindedOn: x.reminded_on,
          channel: isReminderChannel(x.channel) ? x.channel : "other",
          note: x.note,
          by: x.created_by ? (nameOf.get(x.created_by) ?? null) : null,
        }))
        .sort((a, b) => b.remindedOn.localeCompare(a.remindedOn)),
    })),
    receipts: rows.flatMap((r) =>
      (r.receipts ?? []).map((x) => ({
        day: x.received_on,
        cents: Number(x.amount_cents),
      })),
    ),
    paid: (cashOut.data ?? [])
      .filter((r) => r.status === "paid")
      .map((r) => ({ day: r.day, cents: Number(r.total_cents) })),
    upcoming: (upcoming.data ?? []).map((r) => ({
      id: r.line_id,
      label: r.label,
      cents: Number(r.amount_cents),
      family: isBudgetFamily(r.family) ? r.family : null,
      status: isBudgetStatus(r.status) ? r.status : "planned",
      spentOn: r.spent_on,
      projectId: r.project_id,
      artistId: r.artist_id,
      dueOn: r.due_on,
      contactName: r.contact_name,
    })),
    targets: (targets.data ?? []).flatMap((r): FinanceTarget[] =>
      r.kind === "project" ||
      r.kind === "artist" ||
      r.kind === "deal" ||
      r.kind === "member" ||
      r.kind === "cost_center"
        ? [{ kind: r.kind, id: r.id, name: r.name, archived: r.archived }]
        : [],
    ),
    engines: engines.engines,
    error:
      engines.error || Object.values(results).some((r) => Boolean(r.error)),
  };
}
