import "server-only";

import { tool } from "ai";
import { z } from "zod";

import { modelOutput } from "@/lib/assistant/show/model-output";

import type { ChartDisplay } from "@/lib/assistant/display";
import { findNamed, matchByName } from "@/lib/assistant/propose/match";
import { pageRecord } from "@/lib/assistant/page-context";
import {
  isReadResult,
  readFailed,
  targetProject,
  type ReadResult,
} from "@/lib/assistant/read/target";
import { can, type Access } from "@/lib/auth/access";
import { routes } from "@/lib/auth/redirects";
import { loadBudget } from "@/lib/budget/queries";
import { budgetTotals } from "@/lib/budget/types";
import { listMasterSplits } from "@/lib/catalog/master/queries";
import { SPLIT_KINDS } from "@/lib/catalog/master/rules";
import { listMasters } from "@/lib/catalog/queries";
import { masterLabel } from "@/lib/catalog/types";
import { loadBudgets } from "@/lib/finance/budget-queries";
import { liveBudgetRows } from "@/lib/finance/cockpit";
import { byPost, linesOf } from "@/lib/finance/envelopes";
import { monthFlows } from "@/lib/finance/flows";
import { postSlices } from "@/lib/finance/post-slices";
import { spendStage } from "@/lib/finance/spends";
import { addDays, asHorizon, computeTreasury } from "@/lib/finance/treasury";
import { loadTreasury } from "@/lib/finance/treasury-queries";
import { assistantShow } from "@/lib/i18n/fr/assistant-show";
import { budget } from "@/lib/i18n/fr/budget";
import { canSeeProjectBudget } from "@/lib/projects/edit-access";
import { getProject } from "@/lib/projects/queries";
import { parisPlace } from "@/lib/utils/calendar-period";
import { formatAmount } from "@/lib/utils/money";

const t = assistantShow.charts;
const amount = (cents: number) => formatAmount(cents, { ht: false });

const SUBJECTS = [
  "tresorerie",
  "entrees_sorties",
  "depenses_par_poste",
  "budgets",
  "budget_projet",
  "repartition_titre",
] as const;
type Subject = (typeof SUBJECTS)[number];

const FINANCE: Subject[] = [
  "tresorerie",
  "entrees_sorties",
  "depenses_par_poste",
  "budgets",
];

const shown = (
  display: ChartDisplay,
  source: { label: string; href: string },
): ReadResult => ({ facts: [t.shown], sources: [source], display });

async function treasuryChart(
  subject: "tresorerie" | "entrees_sorties",
  horizon: number,
): Promise<ReadResult> {
  const today = parisPlace(new Date()).day;
  const days = asHorizon(horizon);
  const data = await loadTreasury(addDays(today, days));
  if (data.error) return readFailed();
  const treasury = computeTreasury({ ...data, today, horizon: days });
  const source = {
    label: "Finance › Trésorerie",
    href: routes.financeTreasury,
  };
  if (subject === "entrees_sorties")
    return shown(
      {
        kind: "flows",
        title: t.flows,
        flows: monthFlows({
          receipts: data.receipts,
          paid: data.paid,
          treasury,
          today,
        }),
      },
      source,
    );
  if (!treasury) return { facts: [t.noStatement], sources: [source] };
  return shown(
    {
      kind: "treasury",
      title: t.treasury(t.horizons[days] ?? t.horizons[90]),
      points: treasury.points,
      reserveCents: treasury.reserveCents,
      low: treasury.low,
    },
    source,
  );
}

async function postsChart(envelope: string | undefined): Promise<ReadResult> {
  const data = await loadBudgets();
  if (data.error) return readFailed();
  const live = data.envelopes.filter((e) => !e.archived);
  const notes: string[] = [];
  const chosen = envelope?.trim()
    ? findNamed(live, envelope, (e) => e.name, notes)
    : null;
  if (envelope?.trim() && !chosen)
    return {
      facts: [t.notFound(envelope.trim())],
      sources: [],
      gap: "missing",
    };
  // What is committed, invoiced or paid; the planned is not (Trésorerie).
  const spent = (chosen ? [chosen] : live)
    .flatMap((e) => linesOf(e, data.spends))
    .filter((s) => !s.refused && spendStage(s.status) !== "planned");
  const result = shown(
    {
      kind: "donut",
      title: t.posts(chosen?.name ?? null),
      totalLabel: t.postsTotal,
      empty: t.postsEmpty,
      slices: postSlices(byPost(spent)),
    },
    { label: "Finance › Budgets", href: routes.financeBudgets },
  );
  return { ...result, facts: [...notes, ...result.facts] };
}

async function budgetsChart(): Promise<ReadResult> {
  const data = await loadBudgets();
  if (data.error) return readFailed();
  const rows = liveBudgetRows(data.envelopes, data.spends);
  return shown(
    {
      kind: "bars",
      title: t.budgets,
      empty: t.budgetsEmpty,
      unit: "money",
      items: rows.map((r) => ({
        key: r.id,
        label: r.name,
        value: r.engagedCents,
        display: amount(r.engagedCents),
        hint:
          r.currentCents === null
            ? t.budgetNoAmount(amount(r.engagedCents))
            : t.budgetLine(amount(r.engagedCents), amount(r.currentCents)),
      })),
    },
    { label: "Finance › Budgets", href: routes.financeBudgets },
  );
}

async function projectBudgetChart(
  access: Access,
  name: string | undefined,
  pagePath: string | null,
): Promise<ReadResult> {
  const target = await targetProject(name, pagePath);
  if (isReadResult(target)) return target;
  const project = await getProject(target.project.id);
  if (!project) return readFailed();
  const source = {
    label: `${project.title} · Budget`,
    href: routes.projectBudget(project.id),
  };
  if (!canSeeProjectBudget(access, project))
    return { facts: [t.budgetHidden], sources: [] };
  const { error, lines } = await loadBudget(project.id);
  if (error) return readFailed();
  const totals = budgetTotals(lines, project.budgetCents);
  const s = budget.statuses;
  const items = (
    [
      ["planned", totals.plannedCents],
      ["proposed", totals.proposedCents],
      [
        "committed",
        totals.committedCents - totals.invoicedCents - totals.paidCents,
      ],
      ["invoiced", totals.invoicedCents],
      ["paid", totals.paidCents],
    ] as const
  )
    .filter(([, cents]) => cents > 0)
    .map(([status, cents]) => ({
      key: status,
      label: s[status],
      value: cents,
      display: amount(cents),
    }));
  return shown(
    {
      kind: "bars",
      title: t.projectBudget(project.title),
      empty: t.projectBudgetEmpty,
      unit: "money",
      items,
    },
    source,
  );
}

async function splitsChart(
  access: Access,
  title: string | undefined,
  kind: "master" | "publishing",
  pagePath: string | null,
): Promise<ReadResult> {
  if (!can(access, "manage_catalog"))
    return { facts: [t.splitsHidden], sources: [] };
  const { masters, error } = await listMasters();
  if (error) return readFailed();
  const page = pageRecord(pagePath);
  const master = title?.trim()
    ? (matchByName(masters, title, (m) => masterLabel(m)) ??
      matchByName(masters, title, (m) => m.title))
    : page?.kind === "master"
      ? masters.find((m) => m.id === page.id)
      : undefined;
  if (!master)
    return {
      facts: [title?.trim() ? t.notFound(title.trim()) : t.which],
      sources: [],
      ...(title?.trim() ? { gap: "missing" as const } : {}),
    };
  const { splits, error: splitsError } = await listMasterSplits(master.id);
  if (splitsError) return readFailed();
  const label = masterLabel(master);
  return shown(
    {
      kind: "bars",
      title: t.splits(label, t.splitKinds[kind]),
      empty: t.splitsEmpty,
      unit: "percent",
      items: splits
        .filter((s) => s.kind === kind)
        .map((s) => ({
          key: s.id,
          label: s.party,
          // Hundredths of a percent: the bars compare, the text says it.
          value: Math.round(s.share * 100),
          display: `${s.share.toLocaleString("fr-FR")} %`,
        })),
    },
    { label, href: routes.master(master.id) },
  );
}

/**
 * « Montre-moi la trésorerie », « un graphique des dépenses par poste »
 * (wave 1, docs/ASSISTANT.md § 3 sexies). Every figure is computed by the
 * same code as the page that shows it (lib/finance/, lib/budget/,
 * lib/catalog/), with the viewer's session; the model only picks the
 * chart. Drawn under the answer by the app's own chart components.
 */
export function showChartTool(access: Access, pagePath: string | null) {
  return tool({
    description:
      "Affiche un graphique sous la réponse, calculé par l'application. tresorerie = solde du compte et prévision jusqu'à l'horizon, point bas et réserve ; entrees_sorties = entrées et sorties d'argent par mois ; depenses_par_poste = dépenses engagées, facturées ou payées par poste, de tout le label ou d'une enveloppe nommée (projet, artiste, centre de coût) ; budgets = ce que chaque enveloppe a engagé ; budget_projet = le budget d'un projet par état (estimé, proposé, engagé, facturé, payé) ; repartition_titre = les parts (splits) master ou édition d'un titre. Les quatre premiers lisent la Finance (direction et Finance). À appeler pour « montre-moi… », « un graphique de… », « visualise… », « camembert », « courbe ». Après l'appel, commente le graphique en une ou deux phrases, sans recopier tous ses chiffres.",
    inputSchema: z.object({
      subject: z.enum(SUBJECTS),
      horizon: z
        .number()
        .int()
        .optional()
        .describe(
          "Pour tresorerie et entrees_sorties : 30, 90, 180 ou 365 jours (90 par défaut)",
        ),
      envelope: z
        .string()
        .max(100)
        .optional()
        .describe(
          "Pour depenses_par_poste : nom de l'enveloppe (projet, artiste, centre de coût) ; absent = tout le label",
        ),
      project: z
        .string()
        .max(100)
        .optional()
        .describe("Pour budget_projet : nom du projet ; absent = page ouverte"),
      title: z
        .string()
        .max(100)
        .optional()
        .describe(
          "Pour repartition_titre : nom du titre ; absent = fiche ouverte",
        ),
      splitKind: z
        .enum(SPLIT_KINDS)
        .optional()
        .describe(
          "Pour repartition_titre : master (défaut) ou publishing (édition)",
        ),
    }),
    toModelOutput: modelOutput,
    execute: async (input): Promise<ReadResult> => {
      if (FINANCE.includes(input.subject) && !can(access, "read_finance"))
        return { facts: [t.hidden], sources: [] };
      try {
        switch (input.subject) {
          case "tresorerie":
          case "entrees_sorties":
            return await treasuryChart(input.subject, input.horizon ?? 90);
          case "depenses_par_poste":
            return await postsChart(input.envelope);
          case "budgets":
            return await budgetsChart();
          case "budget_projet":
            return await projectBudgetChart(access, input.project, pagePath);
          case "repartition_titre":
            return await splitsChart(
              access,
              input.title,
              input.splitKind ?? "master",
              pagePath,
            );
        }
      } catch (error) {
        console.error("show_chart:", error);
        return readFailed();
      }
    },
  });
}
