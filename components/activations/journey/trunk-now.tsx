import { ToneCallout } from "@/components/ui/tone-callout";
import { reserveText } from "@/lib/activations/describe";
import { proposedDue } from "@/lib/activations/levers";
import type { ActivationPeople } from "@/lib/activations/people";
import { lastStatusEvent } from "@/lib/activations/status-events";
import type {
  ActivationSummary,
  EvidenceRecord,
} from "@/lib/activations/types";
import { fr } from "@/lib/i18n/fr";
import { formatDay, formatShortDay } from "@/lib/utils/day";

import { ProofForm, VerifyProofForm } from "./proof-forms";
import { SnapshotForm } from "./snapshot-form";
import { DesignateForm, DueForm, GestureButton } from "./trunk-gestures";

const t = fr.activationJourney;

const Note = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[length:var(--type-body-sm)] leading-[var(--type-body-sm-lh)] text-[color:var(--text-secondary)]">
    {children}
  </p>
);

/**
 * The trunk's gesture in « Maintenant » when it is the viewer's turn (proto
 * actBody): designate, set the due date (proposed from the launch
 * calendar), launch, declare done (refused for a campaign not begun),
 * provide or verify the proof, record a snapshot, close, resume.
 */
export async function TrunkNow({
  projectId,
  activation: a,
  people,
  evidences,
  pressSent,
}: {
  projectId: string;
  activation: ActivationSummary;
  people: ActivationPeople;
  evidences: EvidenceRecord[];
  // RP in house: a first message declared sent.
  pressSent: boolean;
}) {
  const trunk = a.actions.find((x) => x.key.startsWith("trunk:"));
  if (!trunk?.who.viewer) return null;
  const ids = { projectId, activationId: a.id };
  switch (trunk.rule) {
    case "resume": {
      const event = await lastStatusEvent(a.id, "suspended", people.members);
      return (
        <div className="flex flex-col gap-3">
          <ToneCallout tone="warning">
            {t.gesture.resumeCallout(
              event?.by ?? "—",
              event ? formatShortDay(event.at, { bare: true }) : "—",
              a.statusReason ?? "",
            )}
          </ToneCallout>
          <GestureButton ids={ids} gesture="resume" />
        </div>
      );
    }
    case "designate":
      return (
        <DesignateForm
          ids={ids}
          members={people.members}
          defaultPersonId={people.projectOwner.personId}
        />
      );
    case "due": {
      const proposal = await proposedDue(projectId, a.leverId);
      return (
        <DueForm
          ids={ids}
          proposed={proposal?.date ?? null}
          hint={
            proposal
              ? t.gesture.proposed(proposal.from, formatDay(proposal.date))
              : null
          }
        />
      );
    }
    case "launch":
      return <GestureButton ids={ids} gesture="launch" />;
    case "declare_done": {
      const note =
        a.derived?.kind === "influence" && a.derived.state === "to_provide"
          ? a.derived.missing.length === 0
            ? t.gesture.noCreator
            : t.gesture.noPublication
          : a.kind === "press" && a.mode === "internal" && !pressSent
            ? t.gesture.noMessage
            : null;
      return (
        <div className="flex flex-col gap-2.5">
          {note && <Note>{note}</Note>}
          <span className="text-[length:var(--type-micro)] leading-[var(--type-micro-lh)] text-[color:var(--text-tertiary)]">
            {t.gesture.doneNote}
          </span>
          <GestureButton ids={ids} gesture="declare_done" />
        </div>
      );
    }
    case "evidence_missing":
      return <ProofForm ids={ids} />;
    case "evidence_verify": {
      const evidence = evidences.find(
        (e) =>
          e.activationId === a.id &&
          e.targetId === null &&
          e.withdrawnAt === null &&
          e.checks.length === 0,
      );
      if (!evidence) return null;
      return (
        <VerifyProofForm
          projectId={projectId}
          evidenceId={evidence.id}
          url={evidence.url}
          provided={t.gesture.proofIs(
            people.members.find((m) => m.personId === evidence.createdBy)
              ?.name ?? "—",
            formatShortDay(evidence.createdAt, { bare: true }),
          )}
        />
      );
    }
    case "metrics_missing":
      return (
        <SnapshotForm
          projectId={projectId}
          activationId={a.id}
          unit={t.units[a.kind]}
          defaultSource={a.mode === "agency" ? "agency" : "internal"}
        />
      );
    case "close":
      return (
        <div className="flex flex-col gap-2.5">
          {a.reserves.length > 0 && (
            <Note>
              {t.gesture.closeReserves(a.reserves.map(reserveText).join(" · "))}
            </Note>
          )}
          <GestureButton ids={ids} gesture="close" />
        </div>
      );
    default:
      return null;
  }
}
