// The Brief in a few facts (recap card and shareable Brief), written by code
// from the stored rows: what was confirmed or proposed, never rephrased by PO.
// Client-safe.

import { isActivation, type GuideData } from "@/lib/framing/guide";
import type { FramingData } from "@/lib/framing/queries";
import { teamBoard } from "@/lib/framing/team-board";
import { fr } from "@/lib/i18n/fr";

export type BriefFactKey =
  "timing" | "needs" | "activations" | "frame" | "team" | "sources";

export type BriefFact = {
  key: BriefFactKey;
  label: string;
  value: string | null;
};

const join = (items: string[]) => (items.length ? items.join(" · ") : null);

export function briefObjective(data: Pick<GuideData, "fields">): string | null {
  return data.fields.find((f) => f.key === "objective")?.value ?? null;
}

export function briefFacts(
  data: GuideData & Pick<FramingData, "reports">,
): BriefFact[] {
  const t = fr.framingGuide;
  const { roles } = teamBoard(data.team, data.needs);
  const open = roles.filter((r) => !r.member).length;
  const people = data.team.map((m) => m.display_name);
  const frameTypes = t.frame.types as Record<string, string>;

  return [
    {
      key: "timing",
      label: t.steps.timing,
      value: data.fields.find((f) => f.key === "timing")?.value ?? null,
    },
    {
      key: "needs",
      label: t.needs.needsTitle,
      value: join(
        data.needs.filter((n) => !isActivation(n.family)).map((n) => n.label),
      ),
    },
    {
      key: "activations",
      label: t.needs.activationsTitle,
      value: join(
        data.needs.filter((n) => isActivation(n.family)).map((n) => n.label),
      ),
    },
    {
      key: "frame",
      label: t.steps.frame,
      value: join(
        data.constraints.map(
          (c) => `${frameTypes[c.type] ?? frameTypes.other} : ${c.text}`,
        ),
      ),
    },
    {
      key: "team",
      label: t.steps.team,
      value: join([...people, ...(open > 0 ? [t.line.team(0, open)] : [])]),
    },
    {
      key: "sources",
      label: t.brief.sources,
      value: t.brief.sourcesLine(
        data.reports.map((r) => t.brief.callTitle(r.callTitle)),
      ),
    },
  ];
}
