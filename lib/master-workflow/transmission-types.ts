// The package sent to the mix engineer (lot 4, ticket § 8): its shape as
// stored (a snapshot) and as the engineer's page reads it, and the state of
// a sending, computed by code. Client-safe.

import { z } from "zod";

const file = z.object({ fileName: z.string(), url: z.string() });

export const masterPackageSchema = z.object({
  // Mix (the first packages, before lot 7, have none) or mastering.
  role: z.enum(["mix", "mastering"]).default("mix"),
  project: z.string(),
  // What the package is the mix of: a collective's titles (« Echo test »,
  // test de parcours du 26/11/2026, M9); none: the project (a simple
  // project, the packages sent before).
  subject: z.string().nullable().default(null),
  engineer: z.string(),
  titles: z.array(
    z.object({
      // The title, where the engineer deposits a version (none in the
      // packages sent before 10/10/2026: no deposit through those links).
      masterId: z.uuid().nullable().default(null),
      title: z.string(),
      artists: z.string(),
      // The confirmed source (mix) or the validated Mix final (mastering):
      // its audio state, worded.
      source: file.extend({ state: z.string() }),
      stems: z.array(file),
      // The source replaced on the live link (final vocals arrived).
      sourceUpdatedAt: z.string().nullable().default(null),
    }),
  ),
  direction: z.string().nullable(),
  references: z.string().nullable(),
  constraints: z.string().nullable(),
  // Worded ("Mix final", "Instrumental").
  deliverables: z.array(z.string()),
  revisions: z.number().nullable(),
  // Every date of the Brief, each with its meaning (PROJ-BUG-07), and the
  // project's planned release; never merged into one.
  mixV1Due: z.string().nullable().default(null),
  mixFinalDue: z.string().nullable().default(null),
  masteringDue: z.string().nullable().default(null),
  masterFinalDue: z.string().nullable().default(null),
  releaseDue: z.string().nullable().default(null),
  // « Livrables et formats » and the formats asked (PROJ-UX-08).
  formats: z.string().nullable().default(null),
});
export type MasterPackage = z.infer<typeof masterPackageSchema>;

/** What a package is the mix of, as the engineer reads it (their page, the
 * e-mail): a collective's titles in the package (« Echo test », « Echo test
 * et Néons »), never the collective's name; a simple project's title. */
export function packageSubject(
  project: { title: string; collective: boolean },
  titles: ReadonlyArray<{ title: string }>,
): string {
  if (!project.collective || titles.length === 0) return project.title;
  return new Intl.ListFormat("fr-FR", { type: "conjunction" }).format(
    titles.map((t) => t.title),
  );
}

/** A sending to the mix engineer, as the follow-up lists it. */
export type TransmissionRow = {
  id: string;
  // When the link was created (« Créé »).
  sentAt: string;
  sentBy: string | null;
  engineer: string;
  note: string | null;
  // PROJ-UX-09: each step of the link's life, apart and dated.
  linkSentAt: string | null;
  openedAt: string | null;
  acknowledgedAt: string | null;
  deliveredAt: string | null;
  revokedAt: string | null;
  revokeReason: string | null;
  expiresAt: string;
  // Titles sent without stems, on purpose.
  withoutStems: string[];
  // Added to the mix link of the same engineer (PROJ-BUG-09).
  continued: boolean;
};

// Without an answer this long after a sending, it is time to remind
// (decided 05/10/2026: the ticket asks to follow "attente, relances"
// without a delay; three days leave a weekend).
export const REMIND_AFTER_DAYS = 3;

export const TRANSMISSION_STATES = [
  "received",
  "waiting",
  "to_remind",
  "expired",
  "replaced",
  "revoked",
] as const;
export type TransmissionState = (typeof TRANSMISSION_STATES)[number];

const DAY_MS = 24 * 60 * 60 * 1000;

/** The state of a sending at `now`: computed by code, never stored. */
export function transmissionState(
  row: Pick<
    TransmissionRow,
    "sentAt" | "acknowledgedAt" | "revokedAt" | "expiresAt" | "revokeReason"
  >,
  now: Date,
): TransmissionState {
  if (row.revokedAt && row.revokeReason) return "revoked";
  if (row.acknowledgedAt) return "received";
  if (row.revokedAt) return "replaced";
  if (Date.parse(row.expiresAt) < now.getTime()) return "expired";
  const days = (now.getTime() - Date.parse(row.sentAt)) / DAY_MS;
  return days >= REMIND_AFTER_DAYS ? "to_remind" : "waiting";
}

// An open link this close to its end says so before it surprises anyone.
export const EXPIRY_WARNING_DAYS = 3;

/** Whole days left before a link expires (negative once expired). */
export const daysLeft = (expiresAt: string, now: Date) =>
  Math.floor((Date.parse(expiresAt) - now.getTime()) / DAY_MS);
