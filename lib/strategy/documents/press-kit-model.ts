// The Dossier de presse (ticket Stratégie § 12): an external document for
// the media, built like the Plan de sortie (pages of blocks, the same
// direction and renderer: lib/strategy/documents/editorial-html.ts) from the
// validated Brief, the artist sheet, the project and the generator's choices
// (strategy_document_drafts.config, kind press_kit). Never a budget.
// Client-safe.

import { z } from "zod";

import {
  directionSchema,
  type Direction,
} from "@/lib/strategy/documents/direction";
import {
  orderedPagesFor,
  pageChoiceSchemaFor,
  visualSchema,
  type DocPage,
  type ReleasePlanContent,
} from "@/lib/strategy/documents/release-plan-model";

export const PRESS_KIT_PAGES = [
  "cover",
  "artist",
  "news",
  "story",
  "narrative",
  "visuals",
  "release_info",
  "listen",
  "contacts",
  "press_info",
  "free",
] as const;
export type PressKitPage = (typeof PRESS_KIT_PAGES)[number];

// The texts of the dossier the owner reviews (prefilled from known data).
export const PRESS_BLOCKS = [
  "artist",
  "news",
  "story",
  "narrative",
  "press_info",
] as const;
export type PressBlock = (typeof PRESS_BLOCKS)[number];

/** A generated version of the Dossier de presse, as stored. */
export type PressKitContent = {
  kind: "press_kit";
  project: ReleasePlanContent["project"];
  direction: Direction;
  pages: DocPage[];
  generatedBy: string;
  generatedAt: string;
};

/** A stored version, read defensively: null when it is not a Dossier. */
export function pressKitOf(raw: unknown): PressKitContent | null {
  const value = raw as Partial<PressKitContent> | null;
  return value?.kind === "press_kit" &&
    Array.isArray(value.pages) &&
    value.project &&
    directionSchema.safeParse(value.direction).success
    ? (value as PressKitContent)
    : null;
}

// ---------------------------------------------------------------------------
// Generator choices (strategy_document_drafts.config)
// ---------------------------------------------------------------------------

const text = (max: number) => z.string().trim().max(max);
const httpsUrl = z
  .string()
  .trim()
  .max(1000)
  .regex(/^https:\/\/[^\s"'<>]+$/i);

export const pressTextSchema = z.object({
  key: z.enum(PRESS_BLOCKS),
  text: text(6000),
  // Left out of the dossier by the owner.
  excluded: z.boolean(),
});
export type PressText = z.infer<typeof pressTextSchema>;

export const pressLinkSchema = z.object({
  label: text(80).min(1),
  url: httpsUrl,
});
export type PressLink = z.infer<typeof pressLinkSchema>;

export const pressContactSchema = z.object({
  name: text(120).min(1),
  role: text(120),
  email: z.union([z.literal(""), z.email().max(200)]),
  phone: text(40),
});
export type PressContact = z.infer<typeof pressContactSchema>;

export const pressPageChoiceSchema = pageChoiceSchemaFor(PRESS_KIT_PAGES);
export type PressPageChoice = z.infer<typeof pressPageChoiceSchema>;

export const pressKitConfigSchema = z.object({
  texts: z.array(pressTextSchema).max(PRESS_BLOCKS.length).optional(),
  textsConfirmed: z.boolean().optional(),
  links: z.array(pressLinkSchema).max(12).optional(),
  contacts: z.array(pressContactSchema).max(6).optional(),
  linksConfirmed: z.boolean().optional(),
  // The same visual sources and direction as the Plan de sortie.
  visuals: z.array(visualSchema).max(40).optional(),
  selected: z.array(z.string().max(1100)).max(24).optional(),
  visualsConfirmed: z.boolean().optional(),
  direction: directionSchema.optional(),
  pages: z.array(pressPageChoiceSchema).max(20).optional(),
  pagesConfirmed: z.boolean().optional(),
});
export type PressKitConfig = z.infer<typeof pressKitConfigSchema>;

/** A stored config, read defensively: anything unreadable starts over. */
export function pressKitConfigOf(raw: unknown): PressKitConfig {
  const parsed = pressKitConfigSchema.safeParse(raw ?? {});
  return parsed.success ? parsed.data : {};
}

/** The dossier's pages in their order, every known page present once. */
export const orderedPressPages = (
  chosen: PressPageChoice[] = [],
): PressPageChoice[] => orderedPagesFor(PRESS_KIT_PAGES, chosen);
