// The external documents of the Strategy (ticket § 11 and § 12): the Plan de
// sortie (artist's team) and the Dossier de presse (media). A generated
// version is a list of pages made of blocks, written by the server from the
// validated Brief and the generator's choices, rendered to HTML by one
// renderer (lib/strategy/documents/render.ts) for the preview, the shared
// link and the PDF. No block ever carries a budget. Client-safe.

import { z } from "zod";

export const THEMES = ["night", "paper", "color"] as const;
export type Theme = (typeof THEMES)[number];

// The visual direction: a closed theme and an accent colour (#rrggbb only,
// checked before it reaches any CSS).
export const accentSchema = z.string().regex(/^#[0-9a-f]{6}$/i);
export const DEFAULT_ACCENT = "#1f1f1f";

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
export const PRESS_KIT_PAGES = [
  "cover",
  "artist",
  "news",
  "story",
  "universe",
  "release_info",
  "listen",
  "contacts",
  "press_info",
] as const;
export type ReleasePlanPage = (typeof RELEASE_PLAN_PAGES)[number];
export type PressKitPage = (typeof PRESS_KIT_PAGES)[number];
export type PageKey = ReleasePlanPage | PressKitPage;

export type DocImage = { url: string; alt: string };

export type Block =
  | { type: "text"; text: string }
  // Short titled paragraphs (the narrative's parts).
  | { type: "entries"; items: Array<{ label: string; text: string }> }
  | { type: "facts"; items: Array<{ label: string; value: string }> }
  | { type: "list"; items: string[] }
  | { type: "images"; images: DocImage[] }
  | { type: "palette"; colors: string[] }
  | {
      type: "phases";
      items: Array<{ name: string; range: string; lines: string[] }>;
    }
  | {
      type: "timeline";
      items: Array<{ when: string; title: string; detail: string }>;
    }
  | { type: "links"; items: Array<{ label: string; url: string }> };

export type DocPage = {
  key: PageKey;
  title: string;
  // The cover's eyebrow and subtitle; empty elsewhere.
  eyebrow?: string;
  subtitle?: string;
  image?: DocImage | null;
  blocks: Block[];
};

export type ExternalDoc = {
  kind: "release_plan" | "press_kit";
  project: {
    title: string;
    artist: string;
    type: string;
    releaseDate: string | null;
  };
  theme: Theme;
  accent: string;
  pages: DocPage[];
  generatedBy: string;
};

/** A stored version, read defensively. */
export function externalDocOf(raw: unknown): ExternalDoc | null {
  const value = raw as Partial<ExternalDoc> | null;
  return (value?.kind === "release_plan" || value?.kind === "press_kit") &&
    Array.isArray(value.pages) &&
    value.project &&
    (THEMES as readonly string[]).includes(value.theme ?? "") &&
    accentSchema.safeParse(value.accent).success
    ? (value as ExternalDoc)
    : null;
}

// ---------------------------------------------------------------------------
// Generator choices (strategy_document_drafts.config)
// ---------------------------------------------------------------------------

const text = (max: number) => z.string().trim().max(max);

// A visual the owner allowed in the document, by its source.
export const visualSchema = z.object({
  source: z.enum([
    "artist_picture",
    "project_file",
    "artist_file",
    "master_file",
  ]),
  // The file's id (project, artist or title file) or the artist's (artist_picture).
  id: z.uuid(),
  name: text(200),
});
export type Visual = z.infer<typeof visualSchema>;

const pageChoice = <K extends string>(keys: readonly [K, ...K[]]) =>
  z.object({
    key: z.enum(keys),
    hidden: z.boolean(),
    // A page's own title and text, when the owner rewrote them.
    title: text(120).optional(),
    text: text(4000).optional(),
  });

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
  // The committed deliverable it comes from, if any.
  deliverableId: z.uuid().nullable(),
  title: text(200).min(1),
  note: text(300),
  include: z.boolean(),
});
export type Format = z.infer<typeof formatSchema>;

export const directionSchema = z.object({
  theme: z.enum(THEMES),
  accent: accentSchema,
  // Colours read from the selected images in the browser (moodboard).
  palette: z.array(accentSchema).max(6).optional(),
  // « Valider »: the owner chose it (a proposal stays a proposal until then).
  accepted: z.boolean(),
});
export type Direction = z.infer<typeof directionSchema>;

export const releasePlanConfigSchema = z.object({
  phases: z.array(phaseSchema).max(12).optional(),
  phasesConfirmed: z.boolean().optional(),
  formats: z.array(formatSchema).max(40).optional(),
  formatsConfirmed: z.boolean().optional(),
  visuals: z.array(visualSchema).max(24).optional(),
  visualsConfirmed: z.boolean().optional(),
  direction: directionSchema.optional(),
  pages: z.array(pageChoice(RELEASE_PLAN_PAGES)).max(20).optional(),
  pagesConfirmed: z.boolean().optional(),
});
export type ReleasePlanConfig = z.infer<typeof releasePlanConfigSchema>;

export const pressKitConfigSchema = z.object({
  artistText: text(4000).optional(),
  newsText: text(2000).optional(),
  storyText: text(4000).optional(),
  contactsText: text(1000).optional(),
  pressInfoText: text(2000).optional(),
  contentConfirmed: z.boolean().optional(),
  visuals: z.array(visualSchema).max(24).optional(),
  visualsConfirmed: z.boolean().optional(),
  direction: directionSchema.optional(),
  pages: z.array(pageChoice(PRESS_KIT_PAGES)).max(20).optional(),
  pagesConfirmed: z.boolean().optional(),
});
export type PressKitConfig = z.infer<typeof pressKitConfigSchema>;

/** A stored config, read defensively: anything unreadable starts over. */
export function releasePlanConfigOf(raw: unknown): ReleasePlanConfig {
  const parsed = releasePlanConfigSchema.safeParse(raw ?? {});
  return parsed.success ? parsed.data : {};
}
export function pressKitConfigOf(raw: unknown): PressKitConfig {
  const parsed = pressKitConfigSchema.safeParse(raw ?? {});
  return parsed.success ? parsed.data : {};
}

/** The pages in their order, every known page present once. */
export function orderedPages<K extends PageKey>(
  all: readonly K[],
  chosen: Array<{
    key: K;
    hidden: boolean;
    title?: string;
    text?: string;
  }> = [],
) {
  const seen = new Set<K>();
  const list = chosen.filter((p) => {
    if (seen.has(p.key)) return false;
    seen.add(p.key);
    return true;
  });
  for (const key of all) if (!seen.has(key)) list.push({ key, hidden: false });
  return list;
}
