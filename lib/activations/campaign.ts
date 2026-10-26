// An in-house campaign read from its module objects: each collaboration's
// step (influence) and the proof computed from the publications or the
// coverage (proto syncActProof: « N publications vérifiées sur M créateurs
// engagés », never one link for the whole campaign). Pure: the module facts
// are read by lib/activations/module-facts.ts.

import {
  collaborationStage,
  type CollaborationStage,
} from "@/lib/activations/influence/stage";
import type { TargetOutcome } from "@/lib/activations/model";
import type { ModuleFacts } from "@/lib/activations/module-facts";
import type { ProofState } from "@/lib/activations/states";
import type { EvidenceRecord } from "@/lib/activations/types";
import { fr } from "@/lib/i18n/fr";

const t = fr.activationJourney.derived;

// Out of the campaign: refused, without answer, abandoned, cancelled…
const EXITS: readonly string[] = [
  "refused",
  "no_response",
  "abandoned",
  "cancelled",
  "declined",
  "dispute",
];

export type CollabView = {
  targetId: string;
  name: string;
  stage: CollaborationStage;
  outcome: TargetOutcome | null;
  publication: "none" | "declared" | "verified";
  // An agreement link waits for the creator…
  agreementPending: boolean;
  // …and was declared sent to her (MKT-INF-002).
  agreementSent: boolean;
  // The latest position came from the creator (a counter-proposal).
  creatorSpokeLast: boolean;
  // A brief prepared and its circuit: draft, to validate, validated.
  briefStatus: string | null;
  paymentStatus: string | null;
  // Taken in the campaign: terms accepted, an agreement, a content or a
  // publication (budget readers see the terms, others what follows).
  engaged: boolean;
};

const live = (e: EvidenceRecord) => e.withdrawnAt === null;

/** Each collaboration of an influence campaign in house, with its step. */
export function collaborationsOf(
  activationId: string,
  m: ModuleFacts,
  evidences: EvidenceRecord[],
): CollabView[] {
  return m.targets
    .filter((x) => x.activation_id === activationId)
    .map((x) => {
      const pubs = evidences.filter(
        (e) => e.targetId === x.id && e.kind === "publication" && live(e),
      );
      const publication = pubs.some((e) => e.checks[0]?.result === "verified")
        ? "verified"
        : pubs.length > 0
          ? "declared"
          : "none";
      const messages = m.messages.filter(
        (msg) => msg.target_id === x.id && msg.kind !== "pitch",
      );
      const proposals = m.proposals.filter((p) => p.target_id === x.id);
      const agreements = m.agreements.filter((g) => g.target_id === x.id);
      const contents = m.contents.filter((c) => c.target_id === x.id);
      const payment =
        m.payments.find((p) => p.target_id === x.id)?.status ?? null;
      const outcome = (x.outcome ?? null) as TargetOutcome | null;
      const accepted = agreements.some((g) => g.status === "accepted");
      const stage = collaborationStage({
        outcome,
        conceptStatus:
          m.sheets.find((s) => s.kind === "concept" && s.target_id === x.id)
            ?.status ?? null,
        messagePrepared: messages.some((msg) =>
          ["draft", "to_validate", "validated"].includes(msg.status),
        ),
        messageSent: messages.some((msg) => msg.status === "sent_declared"),
        proposals: proposals.map((p) => ({ acceptedAt: p.accepted_at })),
        agreementAccepted: accepted,
        contents: contents.map((c) => ({ decision: c.decision })),
        publication,
        paymentStatus: payment,
      });
      const open = messages.filter((msg) =>
        ["draft", "to_validate", "validated"].includes(msg.status),
      );
      return {
        targetId: x.id,
        name: x.name,
        stage,
        outcome,
        publication,
        agreementPending: agreements[0]?.status === "pending",
        agreementSent: agreements[0]?.sent_at != null,
        creatorSpokeLast: proposals.at(-1)?.party === "creator",
        briefStatus: open.at(-1)?.status ?? null,
        paymentStatus: payment,
        engaged:
          !EXITS.includes(outcome ?? "") &&
          (proposals.some((p) => p.accepted_at) ||
            accepted ||
            m.rights.some(
              (r) => r.target_id === x.id && r.status === "accepted",
            ) ||
            contents.length > 0 ||
            publication !== "none"),
      };
    });
}

export type DerivedProof = {
  state: ProofState;
  text: string;
  missing: string[];
  kind: "influence" | "press";
};

/** The proof of a campaign in house, from what each person verified. */
export function derivedProof(
  activation: { id: string; kind: string; mode: string | null },
  m: ModuleFacts,
  evidences: EvidenceRecord[],
): DerivedProof | null {
  if (activation.mode !== "internal") return null;
  if (activation.kind === "influence") {
    const engaged = collaborationsOf(activation.id, m, evidences).filter(
      (c) => c.engaged,
    );
    const published = engaged.filter((c) => c.publication !== "none");
    const verified = published.filter((c) => c.publication === "verified");
    return {
      kind: "influence",
      state:
        published.length === 0
          ? "to_provide"
          : verified.length === engaged.length
            ? "verified"
            : "provided_unverified",
      text: t.influence(verified.length, engaged.length),
      missing: engaged
        .filter((c) => c.publication !== "verified")
        .map((c) =>
          c.publication === "none"
            ? t.missingPublication(c.name)
            : t.toVerifyPublication(c.name),
        ),
    };
  }
  if (activation.kind === "press") {
    const coverage = evidences.filter(
      (e) =>
        e.activationId === activation.id &&
        e.targetId !== null &&
        e.kind === "coverage" &&
        live(e) &&
        e.checks[0]?.result !== "unavailable",
    );
    const verified = coverage.filter((e) => e.checks[0]?.result === "verified");
    const media = (targetId: string | null) =>
      m.targets.find((x) => x.id === targetId)?.name ?? "—";
    return {
      kind: "press",
      state:
        coverage.length === 0
          ? "to_provide"
          : verified.length === coverage.length
            ? "verified"
            : "provided_unverified",
      text: t.press(verified.length, coverage.length),
      missing: coverage
        .filter((e) => e.checks[0]?.result !== "verified")
        .map((e) => t.toVerifyCoverage(media(e.targetId))),
    };
  }
  return null;
}
