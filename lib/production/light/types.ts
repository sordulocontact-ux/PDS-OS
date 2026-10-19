// A light journey's versions and decisions (PR-13), in the shape the
// steps show them. Client-safe (types only).

import type { VersionStatus } from "@/lib/production/post/rules";

export type LightVersion = {
  id: string;
  number: number;
  status: VersionStatus;
  url: string | null;
  file: {
    name: string;
    mime: string;
    bytes: number;
    href: string | null;
  } | null;
  width: number | null;
  height: number | null;
  depositedBy: string;
  depositedAt: string;
  decidedBy: string | null;
  decisionNote: string | null;
  intApproved: boolean;
  ext: "none" | "pending" | "approved" | "changes";
};

export type LightDelivery = {
  approvedAt: string | null;
  checkedAt: string | null;
  checkedBy: string | null;
  deliveredAt: string | null;
  deliveredBy: string | null;
  versionId: string | null;
  finalUrl: string | null;
};

export type DeliveryRecipient = {
  name: string;
  purpose: "distribution" | "activations" | "validation" | null;
};

export type LightFacts = {
  // Newest first, drafts left out.
  versions: LightVersion[];
  delivery: LightDelivery | null;
  // The last delivery's recipients.
  recipients: DeliveryRecipient[];
  // The teasers drawn from the clip: the clip's title and whether its edit
  // is validated.
  source: { title: string; cutApproved: boolean } | null;
};
