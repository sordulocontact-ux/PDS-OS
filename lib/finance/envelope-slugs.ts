// The URL's word for an envelope's kind (/app/finance/budgets/<slug>/<id>).
// Client-safe.
import type { EnvelopeKind } from "@/lib/finance/envelopes";

export const ENVELOPE_SLUG = {
  project: "projet",
  artist: "artiste",
  cost_center: "centre",
} as const satisfies Record<EnvelopeKind, string>;

export const kindOfSlug = (slug: string): EnvelopeKind | null =>
  (Object.entries(ENVELOPE_SLUG).find(([, s]) => s === slug)?.[0] as
    EnvelopeKind | undefined) ?? null;
