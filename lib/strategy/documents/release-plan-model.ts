// The Plan de sortie (ticket Stratégie § 11): an external, editorial document
// for the artist's team. A generated version (strategy_documents.content) is
// a list of pages made of blocks, written by the server from the validated
// strategy and the generator's choices (strategy_document_drafts.config),
// rendered to HTML by lib/strategy/documents/release-plan-html.ts for the
// preview, the shared link and the PDF. No block ever carries a budget.
// Client-safe.

import { z } from "zod";

import {
  directionSchema,
  type Direction,
} from "@/lib/strategy/documents/direction";

export const RELEASE_PLAN_PAGES = [
  "cover",
  "release_info",
  "positioning",
  "narrative",
  "phases",
  "setup",
  "contents",
  "moodboard",
  "timeline",
  "free",
] as const;
export type ReleasePlanPage = (typeof RELEASE_PLAN_PAGES)[number];

export type DocImage = { url: string; alt: string };

export type Block =
  | { type: "text"; text: string }
  // Short titled paragraphs (the narrative's parts, the positioning).
  | { type: "entries"; items: Array<{ label: string; text: string }> }
  | { type: "facts"; items: Array<{ label: string; value: string }> }
  | { type: "list"; items: string[] }
  // Links to follow (listening links): https only, checked when rendered.
  | { type: "links"; items: Array<{ label: string; url: string }> }
  | { type: "groups"; items: Array<{ label: string; lines: string[] }> }
  | { type: "images"; images: DocImage[] }
  | { type: "palette"; colors: string[] }
  | {
      type: "phases";
      items: Array<{ name: string; range: string; lines: string[] }>;
    }
  | {
      type: "timeline";
      items: Array<{ when: string; title: string; detail: string }>;
    };

// A page of an editorial document (Plan de sortie, Dossier de presse): its
// key is the document's own page key.
export type DocPage = {
  key: string;
  title: string;
  // The cover's eyebrow and subtitle; empty elsewhere.
  eyebrow?: string;
  subtitle?: string;
  image?: DocImage | null;
  blocks: Block[];
};

/** A generated version of the Plan de sortie, as stored. */
export type ReleasePlanContent = {
  kind: "release_plan";
  project: {
    title: string;
    artist: string;
    type: string;
    releaseDate: string | null;
  };
  direction: Direction;
  pages: DocPage[];
  generatedBy: string;
  generatedAt: string;
};

/** A stored version, read defensively: null when it is not a Plan. */
export function releasePlanOf(raw: unknown): ReleasePlanContent | null {
  const value = raw as Partial<ReleasePlanContent> | null;
  return value?.kind === "release_plan" &&
    Array.isArray(value.pages) &&
    value.project &&
    directionSchema.safeParse(value.direction).success
    ? (value as ReleasePlanContent)
    : null;
}

// Keys that only ever exist in the internal Brief de sortie.
const BUDGET_KEYS = /budget|amount|envelope|cents/i;

/**
 * An external document (Plan de sortie, Dossier de presse) never carries a
 * budget (ticket § 6, § 11 and § 12): checked
 * on the content itself before a version is written, whatever built it.
 */
export function assertNoBudget(value: unknown, path = "content"): void {
  if (Array.isArray(value)) {
    value.forEach((item, i) => assertNoBudget(item, `${path}[${i}]`));
    return;
  }
  if (value && typeof value === "object")
    for (const [key, child] of Object.entries(value)) {
      if (BUDGET_KEYS.test(key))
        throw new Error(`document carries a budget field: ${path}.${key}`);
      assertNoBudget(child, `${path}.${key}`);
    }
}

// ---------------------------------------------------------------------------
// Generator choices (strategy_document_drafts.config)
// ---------------------------------------------------------------------------

const text = (max: number) => z.string().trim().max(max);
const name = text(200);

// A visual the owner allowed in the document, by where it comes from.
export const visualSchema = z.discriminatedUnion("source", [
  z.object({ source: z.literal("artist_picture"), id: z.uuid(), name }),
  z.object({ source: z.literal("project_file"), id: z.uuid(), name }),
  z.object({ source: z.literal("master_file"), id: z.uuid(), name }),
  // Dropped in the generator, already in the public 'document-visuals'.
  z.object({
    source: z.literal("upload"),
    path: z
      .string()
      .regex(/^[0-9a-f-]{36}\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp)$/),
    name,
  }),
  // A visual reference on the web.
  z.object({
    source: z.literal("reference"),
    url: z
      .string()
      .max(1000)
      .regex(/^https:\/\/[^\s"'<>]+$/i),
    name,
  }),
]);
export type Visual = z.infer<typeof visualSchema>;

/** One key per visual, whatever its source. */
export const visualKey = (v: Visual) =>
  v.source === "upload"
    ? `upload:${v.path}`
    : v.source === "reference"
      ? `reference:${v.url}`
      : `${v.source}:${v.id}`;

export const phaseSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]{1,40}$/),
  name: text(80).min(1),
  // Bounds in days from the release (J-10 = -10); null = open-ended.
  from: z.number().int().min(-365).max(365).nullable(),
  to: z.number().int().min(-365).max(365).nullable(),
});
export type Phase = z.infer<typeof phaseSchema>;

export const formatSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]{1,40}$/),
  // The validated deliverable it comes from, if any.
  deliverableId: z.uuid().nullable(),
  title: text(200).min(1),
  note: text(300),
  include: z.boolean(),
});
export type Format = z.infer<typeof formatSchema>;

/** A page choice of a document whose pages are `keys`. */
export const pageChoiceSchemaFor = <K extends readonly [string, ...string[]]>(
  keys: K,
) =>
  z.object({
    key: z.enum(keys),
    hidden: z.boolean(),
    // The page's own title and text, when the owner rewrote them.
    title: text(120).optional(),
    text: text(4000).optional(),
  });
export const pageChoiceSchema = pageChoiceSchemaFor(RELEASE_PLAN_PAGES);
export type PageChoice = z.infer<typeof pageChoiceSchema>;
// A page choice whatever the document (the recap step serves both).
export type AnyPageChoice = {
  key: string;
  hidden: boolean;
  title?: string;
  text?: string;
};

export const releasePlanConfigSchema = z.object({
  phases: z.array(phaseSchema).max(12).optional(),
  phasesConfirmed: z.boolean().optional(),
  formats: z.array(formatSchema).max(40).optional(),
  formatsConfirmed: z.boolean().optional(),
  // Every visual the owner gathered, and those allowed in the document.
  visuals: z.array(visualSchema).max(40).optional(),
  selected: z.array(z.string().max(1100)).max(24).optional(),
  visualsConfirmed: z.boolean().optional(),
  direction: directionSchema.optional(),
  pages: z.array(pageChoiceSchema).max(20).optional(),
  pagesConfirmed: z.boolean().optional(),
});
export type ReleasePlanConfig = z.infer<typeof releasePlanConfigSchema>;

/** A stored config, read defensively: anything unreadable starts over. */
export function releasePlanConfigOf(raw: unknown): ReleasePlanConfig {
  const parsed = releasePlanConfigSchema.safeParse(raw ?? {});
  return parsed.success ? parsed.data : {};
}

/**
 * A document's pages in their order, every known page present once; the
 * free page starts hidden.
 */
export function orderedPagesFor<C extends AnyPageChoice>(
  keys: readonly C["key"][],
  chosen: C[] = [],
): C[] {
  const seen = new Set<string>();
  const list = chosen.filter((p) => {
    if (seen.has(p.key)) return false;
    seen.add(p.key);
    return true;
  });
  for (const key of keys)
    if (!seen.has(key)) list.push({ key, hidden: key === "free" } as C);
  return list;
}

/** The Plan de sortie's pages in their order. */
export const orderedPages = (chosen: PageChoice[] = []): PageChoice[] =>
  orderedPagesFor(RELEASE_PLAN_PAGES, chosen);
