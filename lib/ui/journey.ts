// The generic journey of a module (docs/VISION-UX.md § 4): steps, their state,
// who acts now. Shared by Production and Juridique. Client-safe.

export type JourneyStatus = "done" | "current" | "blocked" | "upcoming";

/** Someone who holds a role: a member of PDS, or a contact through a link. */
export type JourneyPerson = { name: string; viewer: boolean; viaLink: boolean };

export type JourneyActor = JourneyPerson & { todo: string };

export type JourneyStep = {
  key: string;
  href: string;
  title: string;
  why: string;
  status: JourneyStatus;
  owner: { name: string; role: string } | null;
  validator: { name: string; role: string } | null;
  prereq: string[];
  next: string[];
  actor: JourneyActor | null;
  summary: string | null;
};

/** The viewer's own open actions first, then what others are expected to do. */
export function nowOf<S extends JourneyStep>(
  steps: S[],
): { mine: S[]; waiting: S[] } {
  const open = steps.filter((s) => s.actor);
  return {
    mine: open.filter((s) => s.actor?.viewer),
    waiting: open.filter((s) => !s.actor?.viewer),
  };
}
