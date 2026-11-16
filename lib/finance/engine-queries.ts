import "server-only";

import {
  DEFAULT_ENGINE_SETTINGS,
  type EngineData,
} from "@/lib/finance/engines";
import type { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

/**
 * What the engines compute from (lot 5,
 * 20261113500101_finance_fundings.sql): the Orchard contract and the titles
 * the Distribution delivered since its start
 * (20261116100101_finance_orchard_contract.sql), the formats and shows, the
 * Pay Later lines and draws. Read with the session (RLS:
 * read_finance); nothing for anyone else.
 */
export async function loadEngines(
  supabase: Supabase,
): Promise<{ engines: EngineData; error: boolean }> {
  const [settings, formats, shows, lines, draws, deliveries] =
    await Promise.all([
      supabase
        .from("finance_engine_settings")
        .select(
          "orchard_tranche_cents, orchard_titles_per_tranche, orchard_titles_counted, orchard_contract_cents, orchard_counts_from, orchard_advances_received",
        )
        .maybeSingle(),
      supabase
        .from("finance_show_formats")
        .select(
          "id, name, cost_cents, provisional_titles, template_id, archived_at",
        )
        .order("name"),
      supabase
        .from("finance_shows")
        .select(
          "id, format_id, label, planned_on, cost_center_id, cancelled_at",
        )
        .order("planned_on"),
      supabase
        .from("finance_credit_lines")
        .select("id, name, limit_cents, archived_at")
        .order("name"),
      supabase
        .from("finance_credit_draws")
        .select(
          "id, credit_line_id, line_id, label, amount_cents, drawn_on, installments, fee_bp",
        )
        .order("drawn_on"),
      supabase.rpc("finance_orchard_deliveries"),
    ]);
  const results = { settings, formats, shows, lines, draws, deliveries };
  for (const [name, result] of Object.entries(results))
    if (result.error)
      console.error(`loadEngines (${name}):`, result.error.message);
  const s = settings.data;
  return {
    engines: {
      settings: s
        ? {
            orchardTrancheCents: Number(s.orchard_tranche_cents),
            orchardTitlesPerTranche: s.orchard_titles_per_tranche,
            orchardTitlesCounted: s.orchard_titles_counted,
            orchardContractCents:
              s.orchard_contract_cents === null
                ? null
                : Number(s.orchard_contract_cents),
            orchardCountsFrom: s.orchard_counts_from,
            orchardAdvancesReceived: s.orchard_advances_received,
          }
        : DEFAULT_ENGINE_SETTINGS,
      formats: (formats.data ?? []).map((f) => ({
        id: f.id,
        name: f.name,
        costCents: Number(f.cost_cents),
        provisionalTitles: f.provisional_titles,
        templateId: f.template_id,
        archived: f.archived_at !== null,
      })),
      shows: (shows.data ?? []).map((x) => ({
        id: x.id,
        formatId: x.format_id,
        label: x.label,
        plannedOn: x.planned_on,
        costCenterId: x.cost_center_id,
        cancelled: x.cancelled_at !== null,
      })),
      creditLines: (lines.data ?? []).map((l) => ({
        id: l.id,
        name: l.name,
        limitCents: Number(l.limit_cents),
        archived: l.archived_at !== null,
      })),
      draws: (draws.data ?? []).map((d) => ({
        id: d.id,
        creditLineId: d.credit_line_id,
        lineId: d.line_id,
        label: d.label,
        cents: Number(d.amount_cents),
        drawnOn: d.drawn_on,
        installments: d.installments,
        feeBp: d.fee_bp,
      })),
      orchardDeliveries: (deliveries.data ?? []).map((d) => ({
        projectId: d.project_id,
        project: d.project_title,
        release: d.release_title,
        day: d.delivered_on,
        titles: d.titles,
      })),
    },
    error: Object.values(results).some((r) => Boolean(r.error)),
  };
}
