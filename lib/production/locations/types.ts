// The search for a location (PROD-011 to PROD-013): candidates, their
// media, the people consulted and their opinions. Client-safe, types and
// pure helpers only.

import type { Holder } from "@/lib/production/sheet";

export const LOCATION_ROLES = ["artistic", "technical", "production"] as const;
export type LocationRole = (typeof LOCATION_ROLES)[number];

export const VERDICTS = ["favorable", "reserved", "unfavorable"] as const;
export type Verdict = (typeof VERDICTS)[number];

export type LocationStatus = "candidate" | "discarded" | "chosen";

export type LocationMedia = {
  id: string;
  url: string | null;
  file: { fileName: string; href: string | null; mime: string } | null;
};

export type LocationReview = {
  id: string;
  who: string;
  // The consulted holder it comes from, to know who answered.
  holderKey: string;
  role: LocationRole;
  verdict: Verdict;
  comment: string | null;
  at: string;
};

export type LocationOption = {
  id: string;
  name: string;
  address: string | null;
  url: string | null;
  contactNote: string | null;
  priceCents: number | null;
  priceNote: string | null;
  availability: string | null;
  constraints: string | null;
  verification: "to_verify" | "verified";
  status: LocationStatus;
  decisionReason: string | null;
  decidedBy: string | null;
  decidedAt: string | null;
  media: LocationMedia[];
  reviews: LocationReview[];
};

export type LocationConsult = {
  id: string;
  holder: Holder;
  role: LocationRole;
};

export type LocationsData = {
  options: LocationOption[];
  consults: LocationConsult[];
  // The viewer is consulted: their role (they give an opinion).
  viewerRole: LocationRole | null;
  viewerKey: string | null;
};

export const holderKey = (h: { kind: string; id: string }) =>
  `${h.kind}:${h.id}`;

/** What a candidate still lacks to be compared (PROD-011). */
export function missingOf(
  o: LocationOption,
): ("price" | "availability" | "constraints" | "media")[] {
  return [
    ...(o.priceCents === null && !o.priceNote ? (["price"] as const) : []),
    ...(!o.availability ? (["availability"] as const) : []),
    ...(!o.constraints ? (["constraints"] as const) : []),
    ...(o.media.length === 0 ? (["media"] as const) : []),
  ];
}

/** Who among the consulted has not given an opinion on every candidate
 * still in the running (PROD-012). */
export function awaited(data: Pick<LocationsData, "options" | "consults">) {
  const live = data.options.filter((o) => o.status !== "discarded");
  return data.consults.filter((c) =>
    live.some(
      (o) => !o.reviews.some((r) => r.holderKey === holderKey(c.holder)),
    ),
  );
}
