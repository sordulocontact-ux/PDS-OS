import "server-only";

import type { BudgetFamily } from "@/lib/budget/types";
import { isBudgetFamily } from "@/lib/budget/types";
import { loadEngines } from "@/lib/finance/engine-queries";
import type { ShowFormat } from "@/lib/finance/engines";
import type { Envelope, EnvelopeKind, Revision } from "@/lib/finance/envelopes";
import { loadSpends } from "@/lib/finance/spend-queries";
import type { FinanceSpend } from "@/lib/finance/spends";
import { createClient } from "@/lib/supabase/server";

export type TemplateLine = {
  label: string;
  family: BudgetFamily | null;
  subpost: string | null;
  cents: number;
};

export type BudgetTemplate = {
  id: string;
  name: string;
  lines: TemplateLine[];
};

export type BudgetsData = {
  envelopes: Envelope[];
  spends: FinanceSpend[];
  templates: BudgetTemplate[];
  // The show formats, for « Planifier une émission » from a budget.
  formats: ShowFormat[];
  error: boolean;
};

const REVISION_KIND: Record<string, EnvelopeKind> = {
  project: "project",
  artist_budget: "artist",
  cost_center: "cost_center",
};

/** A template's lines, as stored (jsonb): the readable ones only. */
export function templateLines(raw: unknown): TemplateLine[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((x): TemplateLine[] => {
    if (!x || typeof x !== "object") return [];
    const o = x as Record<string, unknown>;
    const cents = Number(o.amount_cents);
    if (typeof o.label !== "string" || !Number.isFinite(cents)) return [];
    return [
      {
        label: o.label,
        family: isBudgetFamily(o.family) ? o.family : null,
        subpost: typeof o.subpost === "string" ? o.subpost : null,
        cents,
      },
    ];
  });
}

/**
 * Every envelope of the label (projects, artists, cost centers), with its
 * revisions and the share PDS finances, every spend, the templates; for
 * whoever reads Finance (finance_* functions and RLS,
 * 20261113400101_finance_budgets.sql). Read with the session.
 */
export async function loadBudgets(): Promise<BudgetsData> {
  const supabase = await createClient();
  const [
    projects,
    artists,
    centers,
    revisions,
    shares,
    templates,
    spends,
    engines,
  ] = await Promise.all([
    supabase.rpc("finance_projects"),
    supabase.rpc("finance_artists"),
    supabase
      .from("finance_cost_centers")
      .select("id, name, budget_cents, archived_at")
      .order("name"),
    supabase
      .from("budget_revisions")
      .select(
        "target_kind, target_id, before_cents, after_cents, reason, created_at",
      )
      .order("created_at"),
    supabase
      .from("finance_envelope_shares")
      .select("target_kind, target_id, pds_share_bp"),
    supabase
      .from("finance_budget_templates")
      .select("id, name, lines")
      .is("archived_at", null)
      .order("name"),
    loadSpends(),
    loadEngines(supabase),
  ]);
  const results = { projects, artists, centers, revisions, shares, templates };
  for (const [name, result] of Object.entries(results))
    if (result.error)
      console.error(`loadBudgets (${name}):`, result.error.message);

  const revisionsOf = new Map<string, Revision[]>();
  const artistBudgetOf = new Map(
    (artists.data ?? []).flatMap((a) =>
      a.budget_id ? [[a.budget_id, a.artist_id] as const] : [],
    ),
  );
  for (const r of revisions.data ?? []) {
    const kind = REVISION_KIND[r.target_kind];
    const id =
      kind === "artist" ? artistBudgetOf.get(r.target_id) : r.target_id;
    if (!kind || !id) continue;
    const key = `${kind}:${id}`;
    revisionsOf.set(key, [
      ...(revisionsOf.get(key) ?? []),
      {
        beforeCents: r.before_cents === null ? null : Number(r.before_cents),
        afterCents: r.after_cents === null ? null : Number(r.after_cents),
        reason: r.reason,
        at: r.created_at,
      },
    ]);
  }
  const shareOf = new Map(
    (shares.data ?? []).map((s) => [
      `${s.target_kind}:${s.target_id}`,
      s.pds_share_bp,
    ]),
  );
  const envelope = (
    kind: EnvelopeKind,
    e: Omit<Envelope, "kind" | "revisions" | "pdsShareBp">,
  ): Envelope => ({
    ...e,
    kind,
    revisions: revisionsOf.get(`${kind}:${e.id}`) ?? [],
    pdsShareBp: shareOf.get(`${kind}:${e.id}`) ?? 10000,
  });

  return {
    envelopes: [
      ...(projects.data ?? []).map((p) =>
        envelope("project", {
          id: p.project_id,
          name: p.title,
          archived: p.archived,
          currentCents: p.budget_cents === null ? null : Number(p.budget_cents),
          period: null,
        }),
      ),
      ...(artists.data ?? []).map((a) =>
        envelope("artist", {
          id: a.artist_id,
          name: a.name,
          archived: a.archived,
          currentCents: a.budget_cents === null ? null : Number(a.budget_cents),
          period: a.starts_on
            ? { startsOn: a.starts_on, endsOn: a.ends_on }
            : null,
        }),
      ),
      ...(centers.data ?? []).map((c) =>
        envelope("cost_center", {
          id: c.id,
          name: c.name,
          archived: c.archived_at !== null,
          currentCents: c.budget_cents === null ? null : Number(c.budget_cents),
          period: null,
        }),
      ),
    ],
    spends: spends.spends,
    templates: (templates.data ?? []).map((t) => ({
      id: t.id,
      name: t.name,
      lines: templateLines(t.lines),
    })),
    formats: engines.engines.formats,
    error:
      spends.error ||
      engines.error ||
      Object.values(results).some((r) => Boolean(r.error)),
  };
}
