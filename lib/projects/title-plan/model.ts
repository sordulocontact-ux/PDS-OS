// Projet collectif, lot 14 (docs/pds-mic-plan.md § 3.1 « Sortie ≠ plan de
// sortie »): the editorial Plan de sortie of a title — a document shared
// with the artist's team, modelled on the plan Jeho —, its statuses, its
// working draft (title_release_plans.config) and a recorded version's
// document (title_release_plan_versions.content). It reads the title's
// release (lot 13), never carries it. Client-safe.

import { z } from "zod";

import {
  visualSchema,
  type DocImage,
} from "@/lib/strategy/documents/release-plan-model";

export const TITLE_PLAN_STATUSES = [
  "draft",
  "provisional",
  "internal",
  "ready_to_share",
  "revised",
  "active",
  "archived",
] as const;
export type TitlePlanStatus = (typeof TITLE_PLAN_STATUSES)[number];

export function titlePlanStatusOf(value: string): TitlePlanStatus {
  return (TITLE_PLAN_STATUSES as readonly string[]).includes(value)
    ? (value as TitlePlanStatus)
    : "draft";
}

/** A version's link can be given while the plan is shared: ready, revised
 * (after the artist's feedback) or active. */
export const SHAREABLE_STATUSES: readonly TitlePlanStatus[] = [
  "ready_to_share",
  "revised",
  "active",
];

/** What the owner can do on a plan, by its status (the database holds the
 * same rules: set_title_release_plan_status, record_…_version). */
export type TitlePlanGesture =
  | "provisional"
  | "record_internal"
  | "ready"
  | "activate"
  | "record_revised"
  | "archive"
  | "reopen";

export function gesturesOf(plan: {
  status: TitlePlanStatus;
  archivedReason: "title_abandoned" | "closed" | null;
}): { primary: TitlePlanGesture | null; others: TitlePlanGesture[] } {
  switch (plan.status) {
    case "draft":
      return { primary: "provisional", others: [] };
    case "provisional":
      return { primary: "record_internal", others: [] };
    case "internal":
      return { primary: "ready", others: ["record_internal"] };
    case "ready_to_share":
    case "revised":
      return { primary: "activate", others: ["record_revised"] };
    case "active":
      return { primary: null, others: ["record_revised", "archive"] };
    case "archived":
      return {
        primary: plan.archivedReason === "closed" ? "reopen" : null,
        others: [],
      };
  }
}

/** The step a status stands at, for the strip of the seven statuses. */
export const statusStep = (status: TitlePlanStatus) =>
  TITLE_PLAN_STATUSES.indexOf(status);

// ---------------------------------------------------------------------------
// The working draft (title_release_plans.config)
// ---------------------------------------------------------------------------

export const TITLE_PLAN_PRIORITIES = ["high", "normal", "low"] as const;
export type TitlePlanPriority = (typeof TITLE_PLAN_PRIORITIES)[number];

export const TITLE_PLAN_CHANNELS = [
  "instagram",
  "tiktok",
  "youtube",
  "streaming",
  "press",
  "live",
  "other",
] as const;
export type TitlePlanChannel = (typeof TITLE_PLAN_CHANNELS)[number];

const text = (max: number) => z.string().trim().max(max);
const id = z.string().regex(/^[a-z0-9-]{1,40}$/);
const https = z
  .string()
  .trim()
  .max(1000)
  .regex(/^https:\/\/[^\s"'<>]+$/i);
// A visual of the draft, by its key (visualKey).
const visualRef = z.string().max(1100);
// An action of the plan: a Stratégie deliverable (d:) or an activation (a:).
export const actionKeySchema = z.string().regex(/^[da]:[0-9a-f-]{36}$/);

export const phaseSchema = z.object({
  id,
  name: text(60).min(1),
  text: text(600),
});
export type TitlePlanPhase = z.infer<typeof phaseSchema>;

export const actionChoiceSchema = z.object({
  // In the document (a page of the moodboard, its date in the timeline).
  include: z.boolean(),
  // Its text in the document.
  text: text(800),
  visuals: z.array(visualRef).max(5),
});
export type ActionChoice = z.infer<typeof actionChoiceSchema>;

export const timelineEntrySchema = z.object({
  id,
  date: z.iso.date(),
  format: text(120).min(1),
  channel: z.enum(TITLE_PLAN_CHANNELS).nullable(),
  // The account it is posted on (« @Ashvma »), shown in the document.
  account: text(60),
  // Internal: who carries it, whether it is validated.
  owner: z.uuid().nullable(),
  validated: z.boolean(),
  visual: visualRef.nullable(),
});
export type TimelineEntry = z.infer<typeof timelineEntrySchema>;

// What the owner sets on the date of an action (its date is the action's).
export const actionDateSchema = z.object({
  channel: z.enum(TITLE_PLAN_CHANNELS).nullable(),
  account: text(60),
  validated: z.boolean(),
  visual: visualRef.nullable(),
});
export type ActionDate = z.infer<typeof actionDateSchema>;

export const linkSchema = z.object({
  id,
  label: text(80).min(1),
  url: https,
});
export type TitlePlanLink = z.infer<typeof linkSchema>;

export const titlePlanConfigSchema = z.object({
  objective: text(1000).optional(),
  audience: text(1000).optional(),
  message: text(1000).optional(),
  // Internal: never in the document.
  priority: z.enum(TITLE_PLAN_PRIORITIES).nullable().optional(),
  platforms: z.array(text(80).min(1)).max(8).optional(),
  listeningUrl: https.or(z.literal("")).optional(),
  phases: z.array(phaseSchema).max(6).optional(),
  actions: z.record(actionKeySchema, actionChoiceSchema).optional(),
  actionDates: z.record(actionKeySchema, actionDateSchema).optional(),
  timeline: z.array(timelineEntrySchema).max(40).optional(),
  // The images gathered for the plan (dropped here), and the cover chosen.
  visuals: z.array(visualSchema).max(40).optional(),
  cover: visualRef.nullable().optional(),
  // Internal: the team's working links (Drive, assets).
  links: z.array(linkSchema).max(20).optional(),
});
export type TitlePlanConfig = z.infer<typeof titlePlanConfigSchema>;

/** A stored draft, read defensively: what cannot be read starts over. */
export function titlePlanConfigOf(raw: unknown): TitlePlanConfig {
  const parsed = titlePlanConfigSchema.safeParse(raw ?? {});
  return parsed.success ? parsed.data : {};
}

/** One part of the draft, as a dialog saves it (each key replaces its own). */
export const titlePlanPatchSchema = titlePlanConfigSchema.partial();

// ---------------------------------------------------------------------------
// A recorded version's document (title_release_plan_versions.content)
// ---------------------------------------------------------------------------

/**
 * What the shared link and the PDF show, and nothing else: no priority, no
 * one in charge, no validation, no working link, no participation that is
 * not confirmed, no budget (assertNoBudget).
 */
export type TitlePlanContent = {
  kind: "title_release_plan";
  // The title has its own release (a single), or goes out with the
  // compilation.
  single: boolean;
  title: string;
  artist: string;
  guests: string[];
  cover: DocImage | null;
  releaseDate: string | null;
  platforms: string[];
  listeningUrl: string | null;
  objective: string | null;
  audience: string | null;
  message: string | null;
  phases: Array<{ name: string; text: string }>;
  contents: Array<{ title: string; text: string; images: DocImage[] }>;
  timeline: Array<{
    date: string;
    label: string;
    account: string;
    image: DocImage | null;
    releaseDay: boolean;
  }>;
  generatedBy: string;
  generatedAt: string;
};

/** A stored document, read defensively: null when it is not one. */
export function titlePlanOf(raw: unknown): TitlePlanContent | null {
  const value = raw as Partial<TitlePlanContent> | null;
  return value?.kind === "title_release_plan" &&
    typeof value.title === "string" &&
    Array.isArray(value.phases) &&
    Array.isArray(value.contents) &&
    Array.isArray(value.timeline) &&
    Array.isArray(value.platforms) &&
    Array.isArray(value.guests)
    ? (value as TitlePlanContent)
    : null;
}

// ---------------------------------------------------------------------------
// The actions a version read (title_release_plan_versions.sources)
// ---------------------------------------------------------------------------

/** An action as a version read it: what, when, who, for which titles. */
export type PlanSource = { key: string; label: string; fp: string };

/** What tells an action changed: its name, date, person in charge and
 * whether it is the title's own or the project's. */
export function actionFingerprint(action: {
  title: string;
  date: string | null;
  ownerId: string | null;
  dedicated: boolean;
}): string {
  return JSON.stringify([
    action.title,
    action.date,
    action.ownerId,
    action.dedicated,
  ]);
}

export function sourcesOf(raw: unknown): PlanSource[] {
  return Array.isArray(raw)
    ? raw.flatMap((s) =>
        s &&
        typeof s === "object" &&
        typeof (s as PlanSource).key === "string" &&
        typeof (s as PlanSource).fp === "string"
          ? [
              {
                key: (s as PlanSource).key,
                label: String((s as PlanSource).label ?? ""),
                fp: (s as PlanSource).fp,
              },
            ]
          : [],
      )
    : [];
}

/**
 * The actions that changed since a version (computed, never stored): one
 * added to the title or the project, one gone (deleted or no longer
 * concerning the title), one changed. The versions themselves never change.
 */
export function changedSince(
  recorded: PlanSource[],
  live: PlanSource[],
): { added: string[]; removed: string[]; changed: string[] } {
  const before = new Map(recorded.map((s) => [s.key, s]));
  const now = new Map(live.map((s) => [s.key, s]));
  return {
    added: live.filter((s) => !before.has(s.key)).map((s) => s.label),
    removed: recorded.filter((s) => !now.has(s.key)).map((s) => s.label),
    changed: live
      .filter((s) => before.has(s.key) && before.get(s.key)?.fp !== s.fp)
      .map((s) => s.label),
  };
}

export const hasChanges = (c: ReturnType<typeof changedSince>) =>
  c.added.length + c.removed.length + c.changed.length > 0;

/** A new id for a phase, a date or a link of the draft. */
export const draftId = () => crypto.randomUUID().slice(0, 8);
