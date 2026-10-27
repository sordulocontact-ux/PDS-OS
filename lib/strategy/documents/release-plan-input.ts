// What the validated strategy already says, as the Plan de sortie reads it
// (ticket Stratégie § 11): never asked again, and never the budget (not
// even read here). Client-safe.

import { framing } from "@/lib/i18n/fr/framing";
import { strategyPilot } from "@/lib/i18n/fr/strategy-pilot";
import { strategyReleasePlan } from "@/lib/i18n/fr/strategy-release-plan";
import type { ProjectDetail } from "@/lib/projects/types";
import { deliverableTitle } from "@/lib/strategy/deliverable-title";
import type { ReleasePlanInput } from "@/lib/strategy/documents/release-plan-build";
import type { Format } from "@/lib/strategy/documents/release-plan-model";
import type { StrategyData } from "@/lib/strategy/queries";

const fr = { framing, strategyReleasePlan, strategyPilot };

/** The validated deliverables as formats, when none were chosen yet. */
export function formatsFrom(data: StrategyData): Format[] {
  return data.deliverables.map((d) => ({
    id: `d-${d.id.slice(0, 8)}`,
    deliverableId: d.id,
    title: deliverableTitle(d.title, d.quantity),
    note: "",
    include: true,
  }));
}

/** The Plan de sortie's input from the validated strategy and the project. */
export function releasePlanInput(
  project: ProjectDetail,
  kind: string,
  data: StrategyData,
  generatedBy: string,
): Omit<ReleasePlanInput, "images"> {
  const field = (key: "positioning" | "audiences" | "narrative") =>
    data.fields.find((f) => f.key === key && f.status === "confirmed")?.value ??
    null;
  const parts = fr.strategyPilot.narrative.parts as Record<string, string>;
  const families = fr.framing.needs.families as Record<string, string>;
  const angle = field("narrative");
  return {
    project: {
      title: project.title,
      artist: project.artistName,
      type: kind,
      releaseDate: data.referenceDate,
    },
    positioning: field("positioning"),
    audiences: field("audiences"),
    objective:
      data.strategicObjective.status === "confirmed"
        ? data.strategicObjective.value
        : null,
    narrative: [
      ...data.narrativeParts.flatMap((p) =>
        p.status === "confirmed" && p.value
          ? [{ label: parts[p.key] ?? p.key, text: p.value }]
          : [],
      ),
      ...(angle
        ? [{ label: fr.strategyReleasePlan.content.angle, text: angle }]
        : []),
    ],
    levers: data.levers
      .filter((l) => l.state === "selected" && l.review_status === "confirmed")
      .map((l) => ({ label: l.label, family: families[l.family] ?? l.family })),
    milestones: data.milestones.map((m) => ({
      occurs_on: m.occurs_on,
      title: m.title,
      channel: m.channel,
    })),
    formats: formatsFrom(data),
    generatedBy,
    generatedAt: new Date().toISOString(),
  };
}
