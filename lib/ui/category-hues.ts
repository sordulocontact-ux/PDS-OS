/**
 * Category hues of docs/DESIGN.md § 3 ter: tell categories apart at a glance
 * in a table (the stage a project is at, its type). A hue carries no state,
 * unlike a tone (lib/ui/state-tones.ts); the label always carries the meaning.
 */
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
  | "slate";

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
};

/** The calendar's hue of a call: one per project, the same on every week
 * (drawn from its id); slate for an internal meeting. */
export function projectHue(projectId: string | null): Hue {
  if (!projectId) return "slate";
  let hash = 0;
  for (const char of projectId) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return titleHues[hash % (titleHues.length - 1)] ?? "sky";
}
