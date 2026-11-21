import type { ReactNode } from "react";

import {
  DealCallButton,
  type DealCallFormData,
} from "@/components/deals/deal-call-button";
import { DealCallProposals } from "@/components/deals/deal-call-proposals";
import { DealCalls } from "@/components/deals/deal-calls";
import { DealContacts } from "@/components/deals/deal-contacts";
import { DealMemoSections } from "@/components/deals/deal-memo-sections";
import { DealNextAction } from "@/components/deals/deal-next-action";
import { DealNow } from "@/components/deals/deal-now";
import { DealTerms } from "@/components/deals/deal-terms";
import { NegotiationCallButton } from "@/components/deals/negotiation-call-button";
import { EmptyNote } from "@/components/shell/empty-state";
import { PageSection } from "@/components/shell/page-section";
import { StepFrieze } from "@/components/ui/step-frieze";
import type { Access } from "@/lib/auth/access";
import type { DealCall, DealCallProposal } from "@/lib/deals/call-queries";
import type { DealContact } from "@/lib/deals/contact-queries";
import type { NegotiationCallData } from "@/lib/deals/negotiation-call";
import type { DealTerm } from "@/lib/deals/terms";
import {
  isClosedStage,
  MOVABLE_DEAL_STAGES,
  type Deal,
  type DealEvent,
  type DealStage,
} from "@/lib/deals/types";
import { dealCalls } from "@/lib/i18n/fr/deal-calls";
import { dealContacts } from "@/lib/i18n/fr/deal-contacts";
import { deals as t } from "@/lib/i18n/fr/deals";
import { formatShortDay } from "@/lib/utils/day";

// What each stage works on, under its « Maintenant » (Ibé 18/11/2026: one
// view to act, the rest in « Dossier »).
const WORKS: Record<"terms" | "contacts" | "calls" | "memo", DealStage[]> = {
  terms: ["to_contact", "call_planned", "negotiation", "agreement"],
  contacts: ["to_contact", "call_planned"],
  calls: ["to_contact", "call_planned", "negotiation"],
  // A deal memo can arrive by e-mail while negotiating (20261120150101).
  memo: ["negotiation", "agreement", "contracting"],
};

/** The deal's stages as a frieze of points, each reached one with its day
 * (its journal, the latest first); signed, all done. Abandoned: none (the
 * word is beside the title, the way there in « Dossier »). */
function StageFrieze({ deal, events }: { deal: Deal; events: DealEvent[] }) {
  if (deal.stage === "abandoned") return null;
  const index =
    deal.stage === "signed"
      ? MOVABLE_DEAL_STAGES.length
      : MOVABLE_DEAL_STAGES.indexOf(
          deal.stage as (typeof MOVABLE_DEAL_STAGES)[number],
        );
  const reached = (stage: DealStage) => {
    const at = events.find((e) => e.toStage === stage)?.createdAt;
    return at ? formatShortDay(at, { bare: true }) : null;
  };
  return (
    <StepFrieze
      label={t.page.frieze}
      doneLabel={t.page.stageReached}
      steps={MOVABLE_DEAL_STAGES.map((stage, i) => ({
        key: stage,
        label: t.stages[stage],
        state:
          i < index || deal.stage === "signed"
            ? "done"
            : i === index
              ? "current"
              : "todo",
        date: i <= index ? reached(stage) : null,
      }))}
    />
  );
}

/**
 * « À faire » of a deal: its stages as a frieze (Sacha 20/11/2026, proto
 * « Fiche d'un deal » v2), its « Maintenant » (the stage's own gesture), PO's
 * proposals from its calls, the next action, then only what its stage
 * works on — the people and the call to contact, the terms to negotiate,
 * the deal memo and the contract to agree and sign. Everything else is in
 * « Dossier » (DealFileView).
 */
export function DealTodoView({
  access,
  deal,
  terms,
  events,
  proposer,
  reopen,
  callForm,
  negotiationCall,
  proposals,
  contacts,
  calls,
  nextCall,
}: {
  access: Access;
  deal: Deal;
  terms: DealTerm[];
  events: DealEvent[];
  proposer: string | null;
  reopen: ReactNode;
  callForm: DealCallFormData | null;
  // « Caler le call » of the project's owner (loadDealNegotiationCall).
  negotiationCall: NegotiationCallData | null;
  proposals: DealCallProposal[];
  contacts: DealContact[];
  calls: DealCall[];
  nextCall: { label: string; href: string } | null;
}) {
  const s = t.page.sections;
  const works = (what: keyof typeof WORKS) => WORKS[what].includes(deal.stage);
  return (
    <>
      <StageFrieze deal={deal} events={events} />
      <DealNow
        deal={deal}
        terms={terms}
        proposer={proposer}
        reopen={reopen}
        lead={callForm && <DealCallButton data={callForm} variant="default" />}
        planCall={
          negotiationCall && <NegotiationCallButton data={negotiationCall} />
        }
        nextCall={nextCall?.label ?? null}
      />
      {deal.stage === "signed" && <EmptyNote>{t.page.signedNote}</EmptyNote>}
      {proposals.length > 0 && (
        <PageSection id="propositions" title={dealCalls.proposals.title}>
          <DealCallProposals deal={deal} proposals={proposals} />
        </PageSection>
      )}
      {!isClosedStage(deal.stage) && (
        <PageSection id="prochaine-action" title={s.next}>
          <DealNextAction deal={deal} />
        </PageSection>
      )}
      {works("terms") && (
        <PageSection id="termes" title={t.terms.title}>
          <DealTerms dealId={deal.id} terms={terms} canWrite={deal.canWrite} />
        </PageSection>
      )}
      {works("contacts") && (
        <PageSection id="contacts" title={dealContacts.section}>
          <DealContacts
            dealId={deal.id}
            contacts={contacts}
            canWrite={deal.canWrite}
          />
        </PageSection>
      )}
      {works("calls") && (
        <PageSection
          id="calls"
          title={dealCalls.section}
          // « À contacter »: « Préparer un call » is already the main gesture.
          action={
            callForm &&
            deal.stage !== "to_contact" && <DealCallButton data={callForm} />
          }
        >
          <DealCalls calls={calls} />
        </PageSection>
      )}
      {works("memo") && (
        <DealMemoSections access={access} deal={deal} terms={terms} />
      )}
    </>
  );
}
