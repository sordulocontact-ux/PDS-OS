import { Fragment } from "react";

import { EvidenceSection } from "@/components/activations/evidence/evidence-section";
import { JournalSection } from "@/components/activations/journal-section";
import { MessagesSection } from "@/components/activations/messages/messages-section";
import { readablePlatforms } from "@/lib/activations/stats-links";
import { MetricsSection } from "@/components/activations/metrics/metrics-section";
import { SheetPanel } from "@/components/activations/sheets/sheet-panel";
import { Fold } from "@/components/ui/fold";
import { TargetHeader } from "@/components/activations/targets/target-header";
import { ContactLinkOffer } from "@/components/portal/contact-links-section";
import type { ActivationFiche } from "@/lib/activations/fiche";
import { loadActivationFiles } from "@/lib/activations/files/queries";
import { composeBrief } from "@/lib/activations/influence/brief";
import { loadBriefDefaults } from "@/lib/activations/influence/brief-defaults";
import { collaborationRows } from "@/lib/activations/influence/collaborations";
import { loadInfluenceData } from "@/lib/activations/influence/queries";
import {
  collabFocus,
  type CollabPart,
} from "@/lib/activations/influence/stage";
import { loadActivationJournal } from "@/lib/activations/journal";
import { loadMessages } from "@/lib/activations/messages/queries";
import { loadSheets, versionsOf } from "@/lib/activations/sheet-queries";
import { sheetFieldKeys, type SheetFields } from "@/lib/activations/sheets";
import type { TargetRecord } from "@/lib/activations/targets";
import type { Access } from "@/lib/auth/access";
import { emailEnabled } from "@/lib/email/send";
import { activationInfluence } from "@/lib/i18n/fr/activation-influence";
import { activationJourney } from "@/lib/i18n/fr/activation-journey";
import { activationWork } from "@/lib/i18n/fr/activation-work";
import { todayInParis } from "@/lib/insights/dates";
import { canSeeProjectBudget } from "@/lib/projects/edit-access";
import { collaborationStageTone } from "@/lib/ui/state-tones";

import { BriefProposalForm } from "./brief-proposal-form";
import { ContentsSection } from "./contents-section";
import { NegotiationSection } from "./negotiation-section";
import { PaymentSection } from "./payment-section";
import { RightsSection } from "./rights-section";

const fr = { activationWork, activationInfluence, activationJourney };

/**
 * The single fiche of a collaboration (ticket Influence § 5) : its concept,
 * the negotiation and the express agreement, messages, rights, contents,
 * publication, results, the administrative payment and its journal.
 */
export async function InfluenceCollaboration({
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
  const [sheets, messages, influence, files, journal] = await Promise.all([
    loadSheets(a.id, a.kind),
    loadMessages(a.id),
    loadInfluenceData(a.id),
    loadActivationFiles(a.id),
    loadActivationJournal(a.id, members, target.id),
  ]);
  const [row] = collaborationRows(
    [target],
    sheets,
    messages,
    influence,
    board.data.evidences,
  );
  const scope = {
    organizationId: access.organizationId ?? "",
    projectId: project.id,
    activationId: a.id,
  };
  const today = todayInParis();
  const canSeeBudget = canSeeProjectBudget(access, project);
  const concept = versionsOf(sheets, "concept", target.id);
  const generic = versionsOf(sheets, "concept", null)[0];
  const prefill: SheetFields = Object.fromEntries(
    Object.entries(generic?.fields ?? {}).map(([k, v]) => [
      k,
      { value: v.value, source: "concept" },
    ]),
  );
  const mine = <T extends { target_id: string }>(list: T[]) =>
    list.filter((x) => x.target_id === target.id);
  const proposals = mine(influence.proposals);
  const brief = composeBrief(
    a.title,
    concept[0]?.status === "validated" ? concept[0] : generic,
    proposals.at(-1),
    mine(influence.rights),
  );
  const t = fr.activationWork.concepts;
  const focus = collabFocus(row.stage);
  // « Brief et proposition » once the concept is validated (proto cbrief).
  const briefForm =
    canWrite && focus.includes("brief") && concept[0]?.status === "validated"
      ? await loadBriefDefaults({ target, concept: concept[0], project })
      : null;
  const sections: Array<[CollabPart, React.ReactNode]> = [
    [
      "brief",
      briefForm && (
        <BriefProposalForm
          key="brief"
          projectId={project.id}
          targetId={target.id}
          defaults={briefForm}
          canEmail={emailEnabled() && Boolean(target.contactEmail)}
        />
      ),
    ],
    [
      "concept",
      <SheetPanel
        key="concept"
        id="concept"
        title={t.variationOf}
        description={t.variationDescription}
        projectId={project.id}
        activationId={a.id}
        kind="concept"
        targetId={target.id}
        keys={sheetFieldKeys("concept", a.kind)}
        versions={concept}
        prefill={prefill}
        members={members}
        canWrite={canWrite}
        canValidate={canValidate}
      />,
    ],
    [
      "negotiation",
      <NegotiationSection
        key="negotiation"
        projectId={project.id}
        activationId={a.id}
        targetId={target.id}
        campaign={a.title}
        creator={target.contactName}
        email={target.contactEmail}
        proposals={proposals}
        agreements={mine(influence.agreements)}
        members={members}
        canWrite={canWrite}
        canSeeBudget={canSeeBudget}
      />,
    ],
    [
      "messages",
      <MessagesSection
        key="messages"
        projectId={project.id}
        activationId={a.id}
        targetId={target.id}
        messages={messages.filter((m) => m.targetId === target.id)}
        kinds={["brief", "proposal", "other"]}
        defaults={{ kind: "brief", ...brief }}
        email={target.contactEmail}
        members={members}
        canWrite={canWrite}
        today={today}
      />,
    ],
    [
      "rights",
      <RightsSection
        key="rights"
        projectId={project.id}
        activationId={a.id}
        targetId={target.id}
        rights={mine(influence.rights)}
        today={today}
        canWrite={canWrite}
      />,
    ],
    [
      "contents",
      <ContentsSection
        key="contents"
        scope={scope}
        targetId={target.id}
        contents={mine(influence.contents)}
        feedback={influence.feedback}
        files={files}
        members={members}
        canWrite={canWrite}
        canValidate={canValidate}
      />,
    ],
    [
      "publication",
      <EvidenceSection
        key="publication"
        scope={scope}
        evidences={board.data.evidences.filter((e) => e.targetId === target.id)}
        files={files}
        members={members}
        canWrite={canWrite}
        canVerify={canValidate}
        targetId={target.id}
        defaultKind="publication"
        defaultSource="creator"
        title={fr.activationInfluence.list.publication}
      />,
    ],
    [
      "metrics",
      <MetricsSection
        key="metrics"
        scope={scope}
        metrics={board.data.metrics.filter((m) => m.targetId === target.id)}
        canWrite={canWrite}
        canVerify={canValidate}
        today={today}
        targetId={target.id}
        readable={readablePlatforms(
          board.data.evidences.filter((e) => e.targetId === target.id),
        )}
        defaultSource="creator"
      />,
    ],
    [
      "payment",
      <PaymentSection
        key="payment"
        scope={scope}
        targetId={target.id}
        payment={mine(influence.payments)[0] ?? null}
        files={files}
        canWrite={canWrite}
        canSeeBudget={canSeeBudget}
      />,
    ],
    ["journal", <JournalSection key="journal" entries={journal} />],
  ];

  return (
    <div className="grid gap-8">
      <TargetHeader
        projectId={project.id}
        activationId={a.id}
        target={target}
        stage={{
          label: fr.activationInfluence.stages[row.stage],
          tone: collaborationStageTone[row.stage],
        }}
        press={false}
        canWrite={canWrite}
        inCard={inCard}
      />
      {/* Once she has an agreement link, her page by project (lot 11). */}
      {mine(influence.agreements).length > 0 && (
        <ContactLinkOffer projectId={project.id} contactId={target.contactId} />
      )}
      {sections
        .filter(([key]) => !inCard || focus.includes(key))
        .map(([key, node]) => (
          <Fragment key={key}>{node}</Fragment>
        ))}
      {inCard && (
        <Fold summary={fr.activationJourney.collabAll}>
          {sections
            .filter(([key]) => !focus.includes(key))
            .map(([key, node]) => (
              <Fragment key={key}>{node}</Fragment>
            ))}
        </Fold>
      )}
    </div>
  );
}
