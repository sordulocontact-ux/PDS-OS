// The Framing as a guided review (docs/ARCHITECTURE.md § 6): the screen
// shown, each point's status and one-line summary, and what is left to do.
// All computed by code from the stored rows, never by PO. Client-safe.

import { NEED_PRESETS } from "@/lib/framing/needs-presets";
import type { FramingData } from "@/lib/framing/queries";
import { teamBoard } from "@/lib/framing/team-board";
import { fr } from "@/lib/i18n/fr";

export const FRAMING_STEPS = [
  "objective",
  "timing",
  "needs",
  "frame",
  "team",
] as const;
export type FramingStep = (typeof FRAMING_STEPS)[number];
export type FramingView = "overview" | FramingStep | "summary";

export const FRAMING_VIEWS: readonly FramingView[] = [
  "overview",
  ...FRAMING_STEPS,
  "summary",
];

export function parseView(value: string | string[] | undefined): FramingView {
  return FRAMING_VIEWS.find((v) => v === value) ?? "overview";
}

export function nextView(view: FramingView): FramingView | null {
  return FRAMING_VIEWS[FRAMING_VIEWS.indexOf(view) + 1] ?? null;
}

export function previousView(view: FramingView): FramingView | null {
  return FRAMING_VIEWS[FRAMING_VIEWS.indexOf(view) - 1] ?? null;
}

export type StepStatus = "empty" | "to_review" | "confirmed";

function statusOf(rows: Array<{ review_status: string }>): StepStatus {
  if (rows.length === 0) return "empty";
  return rows.some((r) => r.review_status === "proposed")
    ? "to_review"
    : "confirmed";
}

/** Promotion & diffusion needs are "activations"; everything else is a need. */
export const isActivation = (family: string) =>
  family === "promotion_distribution";

export const NEED_GROUPS = {
  needs: ["creation_content", "experiences_activations"],
  activations: ["promotion_distribution"],
} as const;
export type NeedGroup = keyof typeof NEED_GROUPS;

export type NeedChip = {
  key: string;
  label: string;
  family: string;
  need: FramingData["needs"][number] | null;
};

const normalize = (s: string) => s.trim().toLowerCase();

/** Preset chips of a group, then the group's needs typed by hand or by a call. */
export function needChips(
  needs: FramingData["needs"],
  group: NeedGroup,
): NeedChip[] {
  const presetLabels: Record<string, string> = fr.framing.needs.presets;
  const families: readonly (keyof typeof NEED_PRESETS)[] = NEED_GROUPS[group];
  // A need of family "other" sits with the needs, never with the activations.
  const inGroup = needs.filter((n) =>
    group === "activations" ? isActivation(n.family) : !isActivation(n.family),
  );
  const presets = families.flatMap((family) =>
    (NEED_PRESETS[family] as readonly string[]).map((preset) => {
      const label = presetLabels[preset];
      return {
        key: preset,
        label,
        family,
        need:
          inGroup.find((n) => normalize(n.label) === normalize(label)) ?? null,
      };
    }),
  );
  const taken = new Set(presets.map((p) => normalize(p.label)));
  const extra = inGroup
    .filter((n) => !taken.has(normalize(n.label)))
    .map((n) => ({ key: n.id, label: n.label, family: n.family, need: n }));
  return [...presets, ...extra];
}

export type GuideData = Pick<
  FramingData,
  "fields" | "needs" | "team" | "constraints" | "openPoints"
>;

export type StepOverview = {
  step: FramingStep;
  status: StepStatus;
  line: string;
};

export function framingOverview(data: GuideData): StepOverview[] {
  const t = fr.framingGuide;
  const field = (key: "objective" | "timing"): StepOverview => {
    const f = data.fields.find((x) => x.key === key);
    return {
      step: key,
      status: !f?.value
        ? "empty"
        : f.status === "proposed"
          ? "to_review"
          : "confirmed",
      line: f?.value ?? t.line.empty,
    };
  };
  const activations = data.needs.filter((n) => isActivation(n.family)).length;
  const types = [...new Set(data.constraints.map((c) => c.type))];
  const board = teamBoard(data.team, data.needs);

  return [
    field("objective"),
    field("timing"),
    {
      step: "needs",
      status: statusOf(data.needs),
      line: data.needs.length
        ? t.line.needs(data.needs.length - activations, activations)
        : t.line.empty,
    },
    {
      step: "frame",
      status: statusOf(data.constraints),
      line: types.length
        ? types
            .map((type, i) => {
              const label: string =
                t.frame.types[type as keyof typeof t.frame.types] ?? type;
              return i === 0 ? label : label.toLowerCase();
            })
            .join(", ")
        : t.line.noConstraint,
    },
    {
      step: "team",
      status: statusOf(data.team),
      line: t.line.team(
        data.team.filter((m) => m.review_status === "confirmed").length,
        board.roles.filter((r) => !r.member).length,
      ),
    },
  ];
}

export type Todo = {
  key: string;
  label: string;
  detail: string;
  view: FramingView;
};

/** What still blocks a clean Brief: points to confirm, roles, open questions. */
export function framingTodos(data: GuideData): Todo[] {
  const t = fr.framingGuide;
  const toReview = framingOverview(data)
    .filter((s) => s.status !== "confirmed")
    .map((s) => ({
      key: `step-${s.step}`,
      label:
        s.status === "empty"
          ? `${t.steps[s.step]} · ${t.statuses.empty}`
          : t.summary.toReview(t.steps[s.step]),
      detail: s.line,
      view: s.step,
    }));
  const roles = teamBoard(data.team, data.needs)
    .roles.filter((r) => !r.member)
    .map((r) => ({
      key: `role-${r.role}`,
      label: t.summary.roleToFind(t.team.roles[r.role]),
      detail: t.steps.team,
      view: "team" as const,
    }));
  const points = data.openPoints
    .filter((p) => p.status === "open")
    .map((p) => ({
      key: `point-${p.id}`,
      label: p.question,
      detail: t.summary.openPoint,
      view: "summary" as const,
    }));
  return [...toReview, ...roles, ...points];
}
