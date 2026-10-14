// « PO propose des étapes modulables » (parcours 15): suggested by the code
// from what the project knows, never stored until a person adds one, and
// never with a person: nobody is assigned by default (the provider of the
// simulation is no default value). Client-safe.

import type { SoundCapture } from "@/lib/production/brief";
import type { PostStepKey } from "@/lib/production/post/rules";

// What each step waits for (shown, PROD-025): the edit after the files are
// prepared, the grading and subtitles after the edit, the exports last.
export const STEP_AFTER: Partial<Record<PostStepKey, PostStepKey[]>> = {
  edit: ["files_prep"],
  live_mix: ["files_prep"],
  grading: ["edit"],
  subtitles: ["edit"],
  exports_qc: ["edit", "grading", "live_mix", "subtitles"],
};

export type StepSuggestion = {
  key: Exclude<PostStepKey, "other">;
  because: "always" | "liveSound" | "subtitles";
};

/**
 * The usual steps of an edit, in their order, minus those already organised:
 * the live mix only when the director's brief captures the sound live, the
 * subtitling only when the Fiche Livrable asks for subtitles.
 */
export function suggestPostSteps(input: {
  existing: readonly PostStepKey[];
  soundCapture: SoundCapture | null;
  // From the handed-over Fiche Livrable; null = not decided.
  subtitles: boolean | null;
}): StepSuggestion[] {
  const liveSound =
    input.soundCapture === "live" || input.soundCapture === "mixed";
  const all: (StepSuggestion | null)[] = [
    { key: "files_prep", because: "always" },
    { key: "edit", because: "always" },
    liveSound ? { key: "live_mix", because: "liveSound" } : null,
    { key: "grading", because: "always" },
    input.subtitles === true
      ? { key: "subtitles", because: "subtitles" }
      : null,
    { key: "exports_qc", because: "always" },
  ];
  const taken = new Set(input.existing);
  return all.flatMap((s) => (s && !taken.has(s.key) ? [s] : []));
}
