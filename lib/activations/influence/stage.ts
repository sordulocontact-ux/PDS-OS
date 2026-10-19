// The step of an influence collaboration, computed from its objects (ticket
// « Influence », Statuts › Collaboration) ; never stored. Client-safe.

import type { TargetOutcome } from "@/lib/activations/model";

export type CollaborationStage =
  | "candidate"
  | "concept_to_validate"
  | "validated_internal"
  | "to_contact"
  | "negotiation"
  | "agreement_to_obtain"
  | "agreed"
  | "content_in_progress"
  | "in_validation"
  | "ready_to_publish"
  | "published_declared"
  | "published_verified"
  | "administration"
  | TargetOutcome;

export type CollaborationFacts = {
  outcome: TargetOutcome | null;
  conceptStatus: string | null;
  // A brief or a message drafted or validated, not sent yet.
  messagePrepared: boolean;
  messageSent: boolean;
  proposals: { acceptedAt: string | null }[];
  agreementAccepted: boolean;
  contents: { decision: string | null }[];
  publication: "none" | "declared" | "verified";
  paymentStatus: string | null;
};

/** From the end of the path back : the furthest step its facts prove. */
export function collaborationStage(f: CollaborationFacts): CollaborationStage {
  if (f.outcome) return f.outcome;
  if (f.publication === "verified")
    return f.paymentStatus && f.paymentStatus !== "paid_verified"
      ? "administration"
      : "published_verified";
  if (f.publication === "declared") return "published_declared";
  if (f.contents.some((c) => c.decision === "approved"))
    return "ready_to_publish";
  if (f.contents.some((c) => c.decision === null)) return "in_validation";
  if (f.agreementAccepted)
    return f.contents.length > 0 ? "content_in_progress" : "agreed";
  const latest = f.proposals.at(-1);
  if (latest?.acceptedAt) return "agreement_to_obtain";
  if (f.proposals.length > 0 || f.messageSent) return "negotiation";
  if (f.conceptStatus === "validated")
    return f.messagePrepared ? "to_contact" : "validated_internal";
  if (f.conceptStatus === "to_validate") return "concept_to_validate";
  return "candidate";
}

/** The parts of a collaboration's fiche. */
export type CollabPart =
  | "concept"
  | "negotiation"
  | "messages"
  | "rights"
  | "contents"
  | "publication"
  | "metrics"
  | "payment"
  | "journal";

/**
 * The parts shown open in a collaboration's card for its step (proto
 * collabCard: one gesture at a time); the others stay folded under « Toute
 * la collaboration ».
 */
export function collabFocus(stage: CollaborationStage): CollabPart[] {
  switch (stage) {
    case "candidate":
    case "concept_to_validate":
      return ["concept"];
    case "validated_internal":
    case "to_contact":
      return ["concept", "messages"];
    case "negotiation":
    case "agreement_to_obtain":
      return ["negotiation"];
    case "agreed":
    case "content_in_progress":
    case "in_validation":
      return ["contents"];
    case "ready_to_publish":
    case "published_declared":
      return ["publication"];
    case "published_verified":
    case "administration":
      return ["publication", "payment"];
    default:
      return ["publication", "metrics"];
  }
}
