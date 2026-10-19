import { EvidenceSection } from "@/components/activations/evidence/evidence-section";
import { JournalSection } from "@/components/activations/journal-section";
import { MessagesSection } from "@/components/activations/messages/messages-section";
import { MetricsSection } from "@/components/activations/metrics/metrics-section";
import { Fold } from "@/components/ui/fold";
import { TargetHeader } from "@/components/activations/targets/target-header";
import type { ActivationFiche } from "@/lib/activations/fiche";
import { loadActivationFiles } from "@/lib/activations/files/queries";
import { loadActivationJournal } from "@/lib/activations/journal";
import { loadMessages } from "@/lib/activations/messages/queries";
import { loadPressKit } from "@/lib/activations/press-kit";
import { composeInterviewBrief } from "@/lib/activations/press/brief";
import { loadOpportunities } from "@/lib/activations/press/queries";
import { loadSheets, versionsOf } from "@/lib/activations/sheet-queries";
import type { TargetRecord } from "@/lib/activations/targets";
import type { Access } from "@/lib/auth/access";
import { fr } from "@/lib/i18n/fr";
import { todayInParis } from "@/lib/insights/dates";

import { OpportunitiesSection } from "./opportunities-section";

/**
 * One press target in house (ticket RP § 5.2 to 5.7) : its messages — pitch
 * from the common template, follow-ups held back after a refusal —, its
 * opportunities and interviews, its coverage declared then verified, the
 * audience figures when there are any, and its journal.
 */
export async function PressTarget({
  fiche,
  target,
  access,
  inCard = false,
}: {
  fiche: ActivationFiche;
  target: TargetRecord;
  access: Access;
  // Inside its folded card of the activation page.
  inCard?: boolean;
}) {
  const {
    activation: a,
    project,
    board,
    members,
    canWrite,
    canValidate,
  } = fiche;
  const [messages, opportunities, sheets, kit, files, journal] =
    await Promise.all([
      loadMessages(a.id),
      loadOpportunities(a.id),
      loadSheets(a.id, a.kind),
      loadPressKit(project.id),
      loadActivationFiles(a.id),
      loadActivationJournal(a.id, members, target.id),
    ]);
  const scope = {
    organizationId: access.organizationId ?? "",
    projectId: project.id,
    activationId: a.id,
  };
  const today = todayInParis();
  const mine = messages.filter((m) => m.targetId === target.id);
  const lastPitch = mine.filter((m) => m.kind === "pitch").at(-1);
  const framing = versionsOf(sheets, "framing", null).find(
    (v) => v.status === "validated",
  );
  const t = fr.activationPress;

  const rest = (
    <>
      <EvidenceSection
        scope={scope}
        evidences={board.data.evidences.filter((e) => e.targetId === target.id)}
        files={files}
        members={members}
        canWrite={canWrite}
        canVerify={canValidate}
        targetId={target.id}
        defaultKind="coverage"
        defaultSource="media"
        title={t.coverage.title}
      />
      <MetricsSection
        scope={scope}
        metrics={board.data.metrics.filter((m) => m.targetId === target.id)}
        canWrite={canWrite}
        canVerify={canValidate}
        today={today}
        targetId={target.id}
        defaultSource="media"
      />
      <JournalSection entries={journal} />
    </>
  );

  return (
    <div className="grid gap-8">
      <TargetHeader
        projectId={project.id}
        activationId={a.id}
        target={target}
        stage={null}
        press
        canWrite={canWrite}
        inCard={inCard}
      />
      <MessagesSection
        projectId={project.id}
        activationId={a.id}
        targetId={target.id}
        messages={mine}
        kinds={["pitch", "follow_up", "other"]}
        defaults={
          lastPitch
            ? {
                kind: "follow_up",
                subject: t.followUp.subject(lastPitch.subject ?? project.title),
                body: t.followUp.body,
              }
            : {
                kind: "pitch",
                subject: t.template.subject(project.title),
                body: t.template.body(project.title, project.artistName),
              }
        }
        pressKitId={kit.approved?.id ?? null}
        email={target.journalistEmail ?? target.contactEmail}
        members={members}
        canWrite={canWrite}
        today={today}
      />
      <OpportunitiesSection
        projectId={project.id}
        activationId={a.id}
        targetId={target.id}
        opportunities={opportunities.filter((o) => o.targetId === target.id)}
        briefOf={(o) =>
          composeInterviewBrief(
            framing?.fields ?? null,
            target.contactName,
            target.journalistName,
            o,
          )
        }
        members={members}
        canWrite={canWrite}
      />
      {inCard ? (
        <Fold summary={fr.activationJourney.mediaAll}>{rest}</Fold>
      ) : (
        rest
      )}
    </div>
  );
}
