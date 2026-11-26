import { BUDGET_FAMILIES, type BudgetFamily } from "@/lib/budget/types";
import type { FileType } from "@/lib/catalog/file-type";
/**
 * Category hues of docs/DESIGN.md § 3 ter: tell categories apart at a glance
 * in a table (the stage a project is at, its type). A hue carries no state,
 * unlike a tone (lib/ui/state-tones.ts); the label always carries the meaning.
 */
import type { JourneyModuleKey } from "@/lib/journey/types";
import type { ProjectType } from "@/lib/projects/types";

export type Hue =
  | "sky"
  | "indigo"
  | "violet"
  | "pink"
  | "orange"
  | "yellow"
  | "lime"
  | "teal"
  | "sand"
  | "slate"
  // File types only (fileTypeHue): read as a state anywhere else.
  | "red"
  | "green";

/** One hue per stage of the business (project_stages.key), in order. */
const stageHues: Record<string, Hue> = {
  framing: "sky",
  launch_strategy: "indigo",
  design: "pink",
  production: "orange",
  delivery: "teal",
  defense: "yellow",
  review: "slate",
};

export const stageHue = (key: string): Hue => stageHues[key] ?? "slate";

/** Distinct from every stage hue: both sit on the same row of the list. */
export const projectTypeHue: Record<ProjectType, Hue> = {
  music_release: "violet",
  content: "lime",
  event: "sand",
};

/** « Projet collectif », beside the type's hue in the projects list and the
 * overview's head: every hue already sits on that row, slate is the quiet one. */
export const projectCollectiveHue: Hue = "slate";

/** What a spend goes to (« Pour » of a quick spend): a project or an artist,
 * told apart at a glance in the list (Sacha 11/11/2026). */
export const budgetTargetHue: Record<
  "project" | "artist" | "cost_center" | "off_budget",
  Hue
> = {
  project: "violet",
  artist: "orange",
  // The Finance's own envelopes (lot 3, 13/11/2026).
  cost_center: "teal",
  off_budget: "slate",
};

/** One hue per workflow (the Travail's « Module » tag), close to its stage's
 * hue: the Cadrage sky, the Marketing pink, the Distribution teal. */
export const moduleHue: Record<JourneyModuleKey, Hue> = {
  framing: "sky",
  marketing: "pink",
  master: "indigo",
  legal: "sand",
  distribution: "teal",
};

/** A project's titles in its order (Juridique): the same title keeps the same
 * hue on every row, so its lines are found at a glance; cycles past ten. */
const titleHues: Hue[] = [
  "sky",
  "violet",
  "orange",
  "teal",
  "pink",
  "lime",
  "indigo",
  "yellow",
  "sand",
  "slate",
];

export const titleHue = (position: number): Hue =>
  titleHues[position % titleHues.length] ?? "slate";

/** The pale background and dark text of each hue (badges, calendar events). */
export const hueClass: Record<Hue, string> = {
  sky: "bg-[var(--hue-sky-bg)] text-[color:var(--hue-sky-fg)]",
  indigo: "bg-[var(--hue-indigo-bg)] text-[color:var(--hue-indigo-fg)]",
  violet: "bg-[var(--hue-violet-bg)] text-[color:var(--hue-violet-fg)]",
  pink: "bg-[var(--hue-pink-bg)] text-[color:var(--hue-pink-fg)]",
  orange: "bg-[var(--hue-orange-bg)] text-[color:var(--hue-orange-fg)]",
  yellow: "bg-[var(--hue-yellow-bg)] text-[color:var(--hue-yellow-fg)]",
  lime: "bg-[var(--hue-lime-bg)] text-[color:var(--hue-lime-fg)]",
  teal: "bg-[var(--hue-teal-bg)] text-[color:var(--hue-teal-fg)]",
  sand: "bg-[var(--hue-sand-bg)] text-[color:var(--hue-sand-fg)]",
  slate: "bg-[var(--hue-slate-bg)] text-[color:var(--hue-slate-fg)]",
  red: "bg-[var(--hue-red-bg)] text-[color:var(--hue-red-fg)]",
  green: "bg-[var(--hue-green-bg)] text-[color:var(--hue-green-fg)]",
};

/** The dark text of each hue alone, without its pale background: a file's
 * icon drawn bare in its type's color (FileTypeIcon, Sacha 25/11/2026). */
export const hueTextClass: Record<Hue, string> = {
  sky: "text-[color:var(--hue-sky-fg)]",
  indigo: "text-[color:var(--hue-indigo-fg)]",
  violet: "text-[color:var(--hue-violet-fg)]",
  pink: "text-[color:var(--hue-pink-fg)]",
  orange: "text-[color:var(--hue-orange-fg)]",
  yellow: "text-[color:var(--hue-yellow-fg)]",
  lime: "text-[color:var(--hue-lime-fg)]",
  teal: "text-[color:var(--hue-teal-fg)]",
  sand: "text-[color:var(--hue-sand-fg)]",
  slate: "text-[color:var(--hue-slate-fg)]",
  red: "text-[color:var(--hue-red-fg)]",
  green: "text-[color:var(--hue-green-fg)]",
};

/** A file's type at a glance in every table of files (FileTypeIcon), as in
 * any file manager (Accordee, Sacha 24/11/2026): the PDF red, the
 * spreadsheet green, the text blue, the slides orange. */
export const fileTypeHue: Record<FileType, Hue> = {
  pdf: "red",
  sheet: "green",
  text: "sky",
  slides: "orange",
  image: "violet",
  audio: "indigo",
  video: "pink",
  archive: "sand",
  other: "slate",
};

/** The calendar's hue of a call: one per project, the same on every week
 * (drawn from its id); slate for an internal meeting. */
export function projectHue(projectId: string | null): Hue {
  if (!projectId) return "slate";
  let hash = 0;
  for (const char of projectId) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return titleHues[hash % (titleHues.length - 1)] ?? "sky";
}

/** A poste's shade, the same everywhere it shows (Finance › Dépenses' Poste
 * column, a spend's sheet, the split by poste), as the proto's small square
 * (Sacha 15/11/2026): the chart's one-ink ramp, given by the poste's place
 * in BUDGET_FAMILIES so it never changes with the amounts. */
const POST_SHADES = [
  { fill: "bg-chart-5", stroke: "stroke-chart-5" },
  { fill: "bg-chart-3", stroke: "stroke-chart-3" },
  { fill: "bg-chart-4", stroke: "stroke-chart-4" },
  { fill: "bg-chart-2", stroke: "stroke-chart-2" },
  { fill: "bg-chart-1", stroke: "stroke-chart-1" },
] as const;

/** A slice's shade by its place, darkest first (the split of the budgets):
 * the same ramp as the postes, cycling past five. */
export const rampShade = (index: number) =>
  POST_SHADES[index % POST_SHADES.length];

type Shade = { fill: string; stroke: string };

/**
 * The shades of slices drawn side by side, each its own (Sacha 17/11/2026:
 * Studio and Production de contenus both black in the split by poste, the
 * ramp having five shades for twelve postes): a slice keeps its shade when
 * no slice before it took it, else the first of the ramp still free.
 */
export function distinctShades(shades: Shade[]): Shade[] {
  const ramp: Shade[] = [...POST_SHADES, postShade(null)];
  const taken = new Set<string>();
  return shades.map((shade) => {
    const free = taken.has(shade.stroke)
      ? (ramp.find((r) => !taken.has(r.stroke)) ?? shade)
      : shade;
    taken.add(free.stroke);
    return free;
  });
}

export function postShade(family: BudgetFamily | null) {
  const index = family ? BUDGET_FAMILIES.indexOf(family) : -1;
  return index < 0
    ? {
        fill: "bg-[var(--border-default)]",
        stroke: "stroke-[var(--border-default)]",
      }
    : POST_SHADES[index % POST_SHADES.length];
}
