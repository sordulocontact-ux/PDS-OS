// Production: the director's brief (ticket « Workflow Production complet »,
// parcours 2). It completes the creative direction validated in Conception
// with the approach to the shoot; it never restates it. Three closed choices
// feed the needs PO suggests (lib/production/roles.ts); the rest is free text.
// Same lists as the database. Client-safe.

export const COVERAGES = ["one_take", "cut", "mixed"] as const;
export type Coverage = (typeof COVERAGES)[number];
export const CAMERA_SETUPS = ["single", "multi"] as const;
export type CameraSetup = (typeof CAMERA_SETUPS)[number];
export const SOUND_CAPTURES = ["playback", "live", "mixed"] as const;
export type SoundCapture = (typeof SOUND_CAPTURES)[number];

export type ProductionBriefChoices = {
  coverage: Coverage | null;
  cameraSetup: CameraSetup | null;
  soundCapture: SoundCapture | null;
};

// In the order the brief reads: intent, coverage, camera, sound, run of show,
// constraints, references, needs still to confirm.
export const BRIEF_TEXT_FIELDS = [
  "stagingIntent",
  "coverageNote",
  "cameraNote",
  "soundNote",
  "runOfShow",
  "constraintsNote",
  "referencesNote",
  "openNeeds",
] as const;
export type BriefTextField = (typeof BRIEF_TEXT_FIELDS)[number];

export type ProductionBrief = ProductionBriefChoices &
  Record<BriefTextField, string | null>;

export const MAX_BRIEF_TEXT = 4000;

const oneOf =
  <T extends string>(list: readonly T[]) =>
  (value: unknown): T | null =>
    typeof value === "string" && (list as readonly string[]).includes(value)
      ? (value as T)
      : null;

export const coverageOf = oneOf(COVERAGES);
export const cameraSetupOf = oneOf(CAMERA_SETUPS);
export const soundCaptureOf = oneOf(SOUND_CAPTURES);

/** The topics of the brief nobody has filled yet: shown as « non renseigné ». */
export function missingBriefTopics(brief: ProductionBrief) {
  return {
    stagingIntent: !brief.stagingIntent,
    coverage: !brief.coverage && !brief.coverageNote,
    camera: !brief.cameraSetup && !brief.cameraNote,
    sound: !brief.soundCapture && !brief.soundNote,
    runOfShow: !brief.runOfShow,
    constraintsNote: !brief.constraintsNote,
    referencesNote: !brief.referencesNote,
  };
}
