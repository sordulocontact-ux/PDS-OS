import "server-only";

import type { ConceptionData } from "@/lib/design/conception";
import type { DirectionData } from "@/lib/design/direction";
import {
  loadBriefIdentity,
  type BriefIdentity,
} from "@/lib/design/brief-identity";
import { briefOpenPoints } from "@/lib/design/brief-open-points";
import {
  loadRetainedProposals,
  type RetainedProposal,
} from "@/lib/design/brief-proposals";
import { DESIGN_TOPICS, type DesignTopic } from "@/lib/design/intentions";
import { validatedReferenceIds } from "@/lib/design/reference-status";
import { isMilestoneChannel } from "@/lib/strategy/calendar";
import { fr } from "@/lib/i18n/fr";
import { createClient } from "@/lib/supabase/server";

// The Brief créatif global (ticket « Conception » § 8): the common frame of
// every deliverable, built by code from what the project holds — never by
// PO — and stored as a version (design_briefs) when a person asks for it.

export type CreativeBriefContent = {
  context: { project: string; artist: string; releaseDate: string | null };
  // The artist's identity the release used, and its deviation (MKT-C2-04);
  // absent when there is neither.
  identity?: BriefIdentity;
  objectives: { strategic: string | null };
  audiences: { audiences: string | null; channels: string[] };
  narrative: {
    angle: string | null;
    parts: Array<{ key: string; value: string }>;
  };
  // The confirmed intentions of the overall direction.
  principles: string[];
  tone: string[];
  showAvoid: string[];
  // A same intention retained by several deliverables.
  coherence: Array<{
    topic: DesignTopic;
    value: string;
    deliverables: string[];
  }>;
  deliverables: Array<{
    title: string;
    status: "confirmed" | "to_qualify";
    // Its own answers: a precision or a deviation from the direction.
    intentions: Array<{ topic: DesignTopic; value: string }>;
    // What it takes from the release's direction as is (MKT-C2-06).
    inherits?: DesignTopic[];
    // The creative proposal retained, and how many its history holds
    // (MKT-C2-10).
    retained?: RetainedProposal;
  }>;
  references: Array<{ label: string; url: string | null; targets: string[] }>;
  constraints: Array<{ type: string; text: string }>;
  decisions: Array<{
    version: number;
    section: string;
    decision: string;
    comment: string | null;
    at: string;
  }>;
  sources: Array<{ kind: "strategy" | "call" | "import"; label: string }>;
  openPoints: string[];
};

const direction = (data: ConceptionData, topic: DesignTopic) =>
  data.intentions
    .filter(
      (i) =>
        i.status === "confirmed" &&
        i.target === "direction" &&
        i.topic === topic,
    )
    .map((i) => i.value);

const normalize = (v: string) => v.trim().toLowerCase().replace(/\s+/g, " ");

/** What the Stratégie says that the Conception does not already read. */
async function loadStrategyExtras(projectId: string) {
  const supabase = await createClient();
  const [objectiveRes, milestonesRes] = await Promise.all([
    supabase
      .from("current_field_values")
      .select("value")
      .eq("project_id", projectId)
      .eq("deliverable", "strategy")
      .eq("field_key", "strategic_objective")
      .eq("status", "confirmed")
      .maybeSingle(),
    supabase.from("milestones").select("channel").eq("project_id", projectId),
  ]);
  const objective = objectiveRes.data?.value;
  const channels = [
    ...new Set((milestonesRes.data ?? []).map((m) => m.channel)),
  ].filter(isMilestoneChannel);
  return {
    strategic:
      typeof objective === "string" && objective.trim() ? objective : null,
    channels: channels.map((c) => fr.strategyCalendar.channels[c]),
  };
}

/** The Brief as the project stands now, ready to be stored as a version. */
export async function buildCreativeBrief(
  project: { id: string; title: string; artistName: string },
  data: ConceptionData,
  directionData: DirectionData,
): Promise<CreativeBriefContent> {
  const t = fr.conceptionDirection.brief;
  const [extras, identity, retained] = await Promise.all([
    loadStrategyExtras(project.id),
    loadBriefIdentity(project.id),
    loadRetainedProposals(project.id),
  ]);
  const titleOf = new Map(data.deliverables.map((d) => [d.id, d.title]));
  const directionTitle = fr.conceptionDirection.summary.direction;

  const shared = new Map<
    string,
    { topic: DesignTopic; value: string; deliverables: Set<string> }
  >();
  for (const i of data.intentions) {
    if (i.status !== "confirmed" || !i.deliverableId) continue;
    const key = `${i.topic}|${normalize(i.value)}`;
    const entry = shared.get(key) ?? {
      topic: i.topic,
      value: i.value,
      deliverables: new Set(),
    };
    entry.deliverables.add(titleOf.get(i.deliverableId) ?? "");
    shared.set(key, entry);
  }

  const validated = validatedReferenceIds(
    directionData.submissions.map((s) => ({
      mode: s.mode,
      snapshot: s.snapshot,
      decisions: s.decisions,
    })),
  );
  const sectionTitle = (key: string) =>
    key === ""
      ? fr.conceptionDirection.versions.whole
      : key === "direction"
        ? directionTitle
        : (titleOf.get(key) ?? key);

  const openPoints = briefOpenPoints(
    data,
    directionData,
    Boolean(extras.strategic),
  );

  return {
    context: {
      project: project.title,
      artist: project.artistName,
      releaseDate: data.known.releaseDate,
    },
    ...(identity ? { identity } : {}),
    objectives: { strategic: extras.strategic },
    audiences: { audiences: data.known.audiences, channels: extras.channels },
    narrative: {
      angle: data.known.narrative,
      parts: data.known.narrativeParts,
    },
    principles: [...direction(data, "story"), ...direction(data, "look")],
    tone: direction(data, "tone"),
    showAvoid: direction(data, "musts"),
    coherence: [...shared.values()]
      .filter((e) => e.deliverables.size > 1)
      .map((e) => ({
        topic: e.topic,
        value: e.value,
        deliverables: [...e.deliverables],
      })),
    deliverables: data.deliverables.map((d) => ({
      title: d.title,
      status: d.status,
      ...(d.strategyDeliverableId && retained.has(d.strategyDeliverableId)
        ? { retained: retained.get(d.strategyDeliverableId) }
        : {}),
      inherits: DESIGN_TOPICS.filter(
        (topic) =>
          direction(data, topic).length > 0 &&
          !data.intentions.some(
            (i) =>
              i.status === "confirmed" &&
              i.deliverableId === d.id &&
              i.topic === topic,
          ),
      ),
      intentions: DESIGN_TOPICS.flatMap((topic) =>
        data.intentions
          .filter(
            (i) =>
              i.status === "confirmed" &&
              i.deliverableId === d.id &&
              i.topic === topic,
          )
          .map((i) => ({ topic, value: i.value })),
      ),
    })),
    references: data.references
      .filter((r) => validated.has(r.id))
      .map((r) => ({
        label: r.title ?? r.fileName ?? r.url ?? "",
        url: r.url,
        targets: r.links.map((l) =>
          l.deliverableId
            ? (titleOf.get(l.deliverableId) ?? "")
            : directionTitle,
        ),
      })),
    constraints: data.known.constraints,
    decisions: [...directionData.submissions].reverse().flatMap((s) =>
      s.decisions.map((d) => ({
        version: s.number,
        section: sectionTitle(d.section),
        decision: fr.conception.decided[d.decision],
        comment: d.comment,
        at: d.decidedAt,
      })),
    ),
    sources: [
      { kind: "strategy", label: t.sourceKinds.strategy },
      ...data.sources.map((s) => ({ kind: s.kind, label: s.title })),
    ],
    openPoints,
  };
}
