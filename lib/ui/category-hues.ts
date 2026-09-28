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
