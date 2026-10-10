// The Brief de sortie as a snapshot (ticket Stratégie § 8 and § 9): what a
// version says, written once by the server from the strategy's data and
// stored in strategy_documents.content. Reviewers read it, V1 is frozen in
// it, its PDF is drawn from it; the live Brief page renders the same shape
// (built on the fly), so a version looks exactly like what was sent. Every
// figure, date and state is written by code (CLAUDE.md, rule 6). Internal:
// the budget is in it. Client-safe (pure).

import { z } from "zod";

import { formatEuros } from "@/lib/budget/types";
import { formatBriefDate } from "@/lib/framing/assess";
import { fr } from "@/lib/i18n/fr";
import type { Arbitration } from "@/lib/strategy/brief";
import type { StrategyBudget } from "@/lib/strategy/budget";
import { dayOffset } from "@/lib/strategy/calendar";
import { deliverableTitle } from "@/lib/strategy/deliverable-title";
import {
  STRATEGY_DIMENSIONS,
  type StrategyDimension,
} from "@/lib/strategy/dimensions";
import type { StrategyData } from "@/lib/strategy/queries";

const line = z.object({
  // Bold head (a name), then a muted tail; `warn`: still to arbitrate.
  head: z.string().nullable(),
  rest: z.string().nullable(),
  warn: z.boolean(),
});
const item = z.object({
  label: z.string().nullable(),
  value: z.string().nullable(),
  lines: z.array(line),
  // Said when there is neither a value nor a line.
  empty: z.string(),
});
const snapshotSchema = z.object({
  format: z.literal(1),
  generatedOn: z.string(),
  project: z.object({
    title: z.string(),
    artist: z.string(),
    kind: z.string(),
    releaseDate: z.string().nullable(),
  }),
  toDecide: z.array(
    z.object({
      key: z.string(),
      dimension: z.enum(STRATEGY_DIMENSIONS),
      text: z.string(),
    }),
  ),
  sections: z.array(
    z.object({
      dimension: z.enum(STRATEGY_DIMENSIONS),
      toDecide: z.boolean(),
      items: z.array(item),
    }),
  ),
});

export type SnapshotLine = z.infer<typeof line>;
export type SnapshotItem = z.infer<typeof item>;
export type BriefSnapshot = z.infer<typeof snapshotSchema>;

/** A stored content read back; null if it is not a Brief snapshot. */
export function briefSnapshotOf(value: unknown): BriefSnapshot | null {
  const parsed = snapshotSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

const number = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 });
const joined = (parts: Array<string | null | undefined>) =>
  parts.filter(Boolean).join(" · ") || null;

type Family = keyof typeof fr.framing.needs.families;

export type SnapshotInput = {
  data: StrategyData;
  budget: StrategyBudget;
  toDecide: Arbitration[];
  project: { title: string; artist: string; kind: string };
  // "YYYY-MM-DD" in Paris.
  today: string;
};

export function buildBriefSnapshot(input: SnapshotInput): BriefSnapshot {
  const { data, budget } = input;
  const t = fr.strategyBrief.sections;
  const parts = fr.strategyPilot.narrative.parts;
  const families = fr.framing.needs.families;
  const field = (key: "positioning" | "audiences" | "narrative") =>
    data.fields.find((f) => f.key === key)?.value ?? null;
  const text = (value: string | null): SnapshotItem => ({
    label: null,
    value,
    lines: [],
    empty: t.empty,
  });
  const people = new Map(data.members.map((m) => [m.personId, m.name]));
  const leverName = new Map(data.levers.map((l) => [l.id, l.label]));
  const channels = fr.strategyCalendar.channels;
  const kept = data.levers.filter(
    (l) => l.state === "selected" && l.review_status === "confirmed",
  );
  const open = data.levers.filter(
    (l) =>
      l.review_status !== "rejected" &&
      (l.state === "to_decide" || l.review_status === "proposed"),
  );
  const totals = (p: number, v: number, d: number) =>
    t.budgetTotals(formatEuros(p), formatEuros(v), formatEuros(d));

  const items: Record<StrategyDimension, SnapshotItem[]> = {
    positioning: [text(field("positioning"))],
    audiences: [text(field("audiences"))],
    narrative: [
      ...data.narrativeParts.map((p) => ({
        label: parts[p.key as keyof typeof parts],
        value: p.value,
        lines: [],
        empty: t.empty,
      })),
      {
        label: t.narrativeAngle,
        value: field("narrative"),
        lines: [],
        empty: t.empty,
      },
    ],
    levers: [
      {
        label: null,
        value: null,
        empty: t.leversNone,
        lines: [
          ...(Object.keys(families) as Family[]).flatMap((family) => {
            const labels = kept.filter((l) => l.family === family);
            return labels.length
              ? [
                  {
                    head: null,
                    rest: `${families[family]} : ${labels.map((l) => l.label).join(", ")}`,
                    warn: false,
                  },
                ]
              : [];
          }),
          ...open.map((l) => ({
            head: null,
            rest: fr.strategyBrief.toDecide.lever(l.label),
            warn: true,
          })),
        ],
      },
    ],
    deliverables: [
      {
        label: null,
        value: null,
        empty: t.deliverablesNone,
        lines: data.deliverables.map((d) => ({
          head: deliverableTitle(d.title, d.quantity),
          rest: joined([
            leverName.get(d.lever_id),
            d.assignee_person_id ? people.get(d.assignee_person_id) : null,
            d.due_date ? formatBriefDate(d.due_date) : null,
          ]),
          warn: false,
        })),
      },
    ],
    calendar: [
      {
        label: null,
        value: null,
        empty: t.milestonesNone,
        lines: data.milestones.map((m) => ({
          head: data.referenceDate
            ? fr.strategy.calendar.dayOffset(
                dayOffset(m.occurs_on, data.referenceDate),
              )
            : null,
          rest: joined([
            m.title,
            formatBriefDate(m.occurs_on),
            channels[m.channel as keyof typeof channels] ?? m.channel,
          ]),
          warn: false,
        })),
      },
    ],
    budget: [
      {
        label: null,
        value: totals(
          budget.proposedCents,
          budget.validatedCents,
          budget.toDecideCents,
        ),
        empty: t.empty,
        lines: [
          {
            head: null,
            rest:
              budget.envelopeCents === null || budget.remainingCents === null
                ? t.noEnvelope
                : t.envelope(
                    formatEuros(budget.envelopeCents),
                    formatEuros(budget.remainingCents),
                  ),
            warn: budget.remainingCents !== null && budget.remainingCents < 0,
          },
          ...budget.byLever.map((l) => ({
            head: l.label,
            rest: totals(l.proposedCents, l.validatedCents, l.toDecideCents),
            warn: l.toDecideCents > 0,
          })),
        ],
      },
    ],
    objectives: [
      {
        label: t.objective,
        value: data.strategicObjective.value,
        lines: [],
        empty: t.empty,
      },
      {
        label: null,
        value: null,
        empty: t.kpisNone,
        lines: data.objectives.map((o) => ({
          head: o.label,
          rest: joined([
            o.kind === "qualitative"
              ? t.qualitative
              : o.target === null
                ? t.noTarget
                : t.target(
                    [number.format(o.target), o.unit].filter(Boolean).join(" "),
                  ),
            o.due_on ? formatBriefDate(o.due_on) : null,
          ]),
          warn: false,
        })),
      },
    ],
  };

  const flagged = new Set(input.toDecide.map((a) => a.dimension));
  return {
    format: 1,
    generatedOn: input.today,
    project: { ...input.project, releaseDate: data.referenceDate },
    toDecide: input.toDecide,
    sections: STRATEGY_DIMENSIONS.map((dimension) => ({
      dimension,
      toDecide: flagged.has(dimension),
      items: items[dimension],
    })),
  };
}
