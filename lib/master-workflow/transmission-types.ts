// The package sent to the mix engineer (lot 4, ticket § 8): its shape as
// stored (a snapshot) and as the engineer's page reads it, and the state of
// a sending, computed by code. Client-safe.

import { z } from "zod";

const file = z.object({ fileName: z.string(), url: z.string() });

export const masterPackageSchema = z.object({
  // Mix (the first packages, before lot 7, have none) or mastering.
  role: z.enum(["mix", "mastering"]).default("mix"),
  project: z.string(),
  engineer: z.string(),
  titles: z.array(
    z.object({
      title: z.string(),
      artists: z.string(),
      // The confirmed source (mix) or the validated Mix final (mastering):
      // its audio state, worded.
      source: file.extend({ state: z.string() }),
      stems: z.array(file),
    }),
  ),
  direction: z.string().nullable(),
  references: z.string().nullable(),
  constraints: z.string().nullable(),
  // Worded ("Mix final", "Instrumental").
  deliverables: z.array(z.string()),
  revisions: z.number().nullable(),
  mixV1Due: z.string().nullable().default(null),
  mixFinalDue: z.string().nullable().default(null),
  masteringDue: z.string().nullable().default(null),
  masterFinalDue: z.string().nullable().default(null),
});
export type MasterPackage = z.infer<typeof masterPackageSchema>;

/** A sending to the mix engineer, as the follow-up lists it. */
export type TransmissionRow = {
  id: string;
  sentAt: string;
  sentBy: string | null;
  engineer: string;
  note: string | null;
  acknowledgedAt: string | null;
  revokedAt: string | null;
  expiresAt: string;
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
] as const;
export type TransmissionState = (typeof TRANSMISSION_STATES)[number];

const DAY_MS = 24 * 60 * 60 * 1000;

/** The state of a sending at `now`: computed by code, never stored. */
export function transmissionState(
  row: Pick<
    TransmissionRow,
    "sentAt" | "acknowledgedAt" | "revokedAt" | "expiresAt"
  >,
  now: Date,
): TransmissionState {
  if (row.acknowledgedAt) return "received";
  if (row.revokedAt) return "replaced";
  if (Date.parse(row.expiresAt) < now.getTime()) return "expired";
  const days = (now.getTime() - Date.parse(row.sentAt)) / DAY_MS;
  return days >= REMIND_AFTER_DAYS ? "to_remind" : "waiting";
}
