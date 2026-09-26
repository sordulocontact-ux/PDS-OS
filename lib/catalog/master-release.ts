import { todayInParis } from "@/lib/insights/dates";

/** One release of a project the master is linked to. */
export type MasterReleaseCandidate = {
  title: string;
  plannedReleaseDate: string | null;
  onlineDetectedAt: string | null;
};

export type MasterReleaseStatus = "online" | "planned" | "undated";

export type MasterRelease = {
  title: string;
  plannedReleaseDate: string | null;
  status: MasterReleaseStatus;
  // Other releases of the same master, shown as "+N".
  otherCount: number;
};

export function releaseStatusOf(
  release: MasterReleaseCandidate,
): MasterReleaseStatus {
  if (release.onlineDetectedAt) return "online";
  return release.plannedReleaseDate ? "planned" : "undated";
}

/**
 * The release shown on a master's row (docs/DESIGN.md, page Master): the next
 * one to come (not online, dated today or later, then undated), otherwise the
 * most recent one. Pure code: dates and statuses are facts, never the model's.
 */
export function pickMasterRelease(
  releases: MasterReleaseCandidate[],
  today = todayInParis(),
): MasterRelease | null {
  if (releases.length === 0) return null;

  const upcoming = releases
    .filter(
      (r) =>
        !r.onlineDetectedAt &&
        (r.plannedReleaseDate === null || r.plannedReleaseDate >= today),
    )
    .sort(byDate("asc"));
  const chosen = upcoming[0] ?? [...releases].sort(byDate("desc"))[0];

  return {
    title: chosen.title,
    plannedReleaseDate: chosen.plannedReleaseDate,
    status: releaseStatusOf(chosen),
    otherCount: releases.length - 1,
  };
}

// Dated releases first, in the given order; undated ones last.
function byDate(order: "asc" | "desc") {
  return (a: MasterReleaseCandidate, b: MasterReleaseCandidate) => {
    const x = a.plannedReleaseDate;
    const y = b.plannedReleaseDate;
    if (x === y) return 0;
    if (x === null) return 1;
    if (y === null) return -1;
    return order === "asc" ? x.localeCompare(y) : y.localeCompare(x);
  };
}
