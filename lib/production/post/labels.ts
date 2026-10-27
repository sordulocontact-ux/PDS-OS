// Names the code writes for the postproduction: a step, a version, a
// timecode. Client-safe.

import { productionPost } from "@/lib/i18n/fr/production-post";
import { formatTimecode } from "@/lib/production/post/timecode";
import { formatDate } from "@/lib/release/format";
import type { PostStep, PostVersion } from "@/lib/production/post/types";

const fr = { productionPost };

const t = fr.productionPost;

/** A step's name: its own for « Autre étape », else the preset's. */
export const stepLabel = (step: Pick<PostStep, "key" | "label">) =>
  step.key === "other" && step.label ? step.label : t.steps.keys[step.key];

/** The version's name: « V3 » or « V3 · Montage final ». */
export const versionName = (v: Pick<PostVersion, "number" | "label">) =>
  v.label ? t.versions.named(v.number, v.label) : t.versions.name(v.number);

/** « 01:24 », or « Général » for a comment without a timecode. */
export const timecodeLabel = (ms: number | null) =>
  ms === null ? t.comments.general : formatTimecode(ms);

/** « Du 3 novembre 2026 au 7 novembre 2026 », one end only, or null. */
export function stepPeriod(from: string | null, to: string | null) {
  if (from && to) return t.steps.period(formatDate(from), formatDate(to));
  if (from) return t.steps.from(formatDate(from));
  return to ? t.steps.until(formatDate(to)) : null;
}
