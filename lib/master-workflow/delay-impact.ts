// What a delay signalled by the engineer touches (PROJ-AMEL-02,
// docs/ARCHITECTURE.md § 8 septies, « Fil avec l'ingénieur »): the Brief's
// dates of the stage and the ones after it, still to come, moved by the
// days announced, and whether the master final then passes the release.
// Proposed by the code, applied by a person, never by itself. Pure.

import { BRIEF_DATES, type BriefDate } from "@/lib/master-workflow/brief-types";

// The dates each stage holds, then those that follow it.
const FROM_STAGE: Record<"mix" | "mastering", BriefDate> = {
  mix: "mixV1Due",
  mastering: "masteringDue",
};

const DAY_MS = 24 * 60 * 60 * 1000;

/** "2026-10-10" plus `days`, as a "YYYY-MM-DD" date (UTC, no time zone). */
export function addDays(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS)
    .toISOString()
    .slice(0, 10);
}

export type DateImpact = { key: BriefDate; from: string; to: string };

export function delayImpact(input: {
  stage: "mix" | "mastering";
  days: number;
  dates: Record<BriefDate, string | null>;
  // "YYYY-MM-DD" in Paris.
  today: string;
  releaseDate: string | null;
}): { impacts: DateImpact[]; beyondRelease: boolean } {
  const from = BRIEF_DATES.indexOf(FROM_STAGE[input.stage]);
  const impacts = BRIEF_DATES.slice(from).flatMap((key): DateImpact[] => {
    const date = input.dates[key];
    // A date already passed is a fact, not something to move.
    if (!date || date < input.today) return [];
    return [{ key, from: date, to: addDays(date, input.days) }];
  });
  const final = impacts.find((i) => i.key === "masterFinalDue");
  return {
    impacts,
    beyondRelease:
      final !== undefined &&
      input.releaseDate !== null &&
      final.to > input.releaseDate,
  };
}
