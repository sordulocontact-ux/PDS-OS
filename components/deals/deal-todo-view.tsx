import { Fragment, type ReactNode } from "react";

import {
  DealCallButton,
  type DealCallFormData,
} from "@/components/deals/deal-call-button";
import { DealCallProposals } from "@/components/deals/deal-call-proposals";
import {
  DealCallCard,
  DealCalls,
  dealCallMovable,
} from "@/components/deals/deal-calls";
import { ContractNow } from "@/components/contracts/now/contract-now";
import { DealContacts } from "@/components/deals/deal-contacts";
import {
  DealContractNow,
  type ContractStep,
} from "@/components/deals/deal-contract-now";
import { DealMemoNow, type MemoStep } from "@/components/deals/deal-memo-now";
import { DealMemoSections } from "@/components/deals/deal-memo-sections";
import { DealNextAction } from "@/components/deals/deal-next-action";
import { DealNow } from "@/components/deals/deal-now";
import { DealTerms } from "@/components/deals/deal-terms";
import { NegotiationCallButton } from "@/components/deals/negotiation-call-button";
import { NowFrame } from "@/components/shell/journey/now-card";
import { PageSection } from "@/components/shell/page-section";
import { StepFrieze } from "@/components/ui/step-frieze";
import type { Access } from "@/lib/auth/access";
import type { ContractPageData } from "@/lib/contracts/page-data";
import type { ContractDetail } from "@/lib/contracts/types";
import {
  dealCallHeld,
  nextDealCall,
  type DealCall,
  type DealCallProposal,
} from "@/lib/deals/call-queries";
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

// Where a deal memo is worked on: its loop beside the next action.
const MEMO_STAGES: DealStage[] = ["negotiation", "agreement", "contracting"];

export type DealWork =
  "next" | "terms" | "contacts" | "calls" | "memo" | "contract";
type Work = DealWork;

// What each stage works on under its « Maintenant », in order (Ibé
// 18/11/2026: one view to act, the rest in « Dossier »): around the call,
// the calls first; negotiating, the terms first (Sacha 21/11/2026). A deal
// memo can arrive by e-mail while negotiating (20261120150101).
// Signed or abandoned, nothing left to do: the page is the deal's file, to
// read (Sacha 23/11/2026, no more « Dossier » tab).
const CLOSED: Work[] = ["contract", "memo", "terms", "contacts", "calls"];
export const WORKS: Record<DealStage, Work[]> = {
  to_contact: ["contacts", "next", "calls", "terms"],
  call_planned: ["calls", "next", "contacts", "terms"],
  // The deal memo is the accord de principe (réunion avec Ibé du 18/11/2026,
  // 20261122110101): right under the terms while negotiating, first at the
  // accord. The loop and the contract come after the terms, which matter
  // more until the contract is drawn up (Sacha 22/11/2026); then the
  // contract comes up.
  negotiation: ["terms", "memo", "next", "calls", "contract"],
  agreement: ["memo", "next", "terms", "contract"],
  contracting: ["memo", "contract", "next"],
  signed: CLOSED,
  abandoned: CLOSED,
};

/** What the stage works on; once a memo came, the memo before the terms. */
function worksOf(stage: DealStage, hasMemo: boolean): Work[] {
  const works = WORKS[stage];
  if (!hasMemo || !works.includes("memo") || !works.includes("terms"))
    return works;
  const rest = works.filter((w) => w !== "terms");
  const at = rest.indexOf("memo") + 1;
  return [...rest.slice(0, at), "terms", ...rest.slice(at)];
}

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
 * « Fiche d'un deal » v2), its « Maintenant » (the stage's own gesture), then
 * only what its stage works on, its main work first (WORKS) — the calls
 * around the call, the terms (with PO's proposals in place of their terms)
 * while negotiating, the next action, the deal memo and the contract to
 * agree and sign; signed or abandoned, the whole deal to read. Its facts
 * and what the stage does not show are in « Informations » (DealInfoButton).
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
  sources = [],
  contacts,
  calls,
  nextCall,
  memoStep = null,
  contractStep = null,
  contractCircuit = null,
  hasMemo = false,
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
  // The terms PO wrote from the calls (their passages).
  sources?: DealCallProposal[];
  contacts: DealContact[];
  calls: DealCall[];
  nextCall: { label: string; href: string } | null;
  // The deal memo's step while negotiating (DealMemoNow).
  memoStep?: MemoStep | null;
  // The contract's step while contracting (DealContractNow).
  contractStep?: ContractStep | null;
  // Its document there: the contract's own « Maintenant » (ContractNow), the
  // same as on its page in Contrats.
  contractCircuit?: { contract: ContractDetail; data: ContractPageData } | null;
  // The deal has a memo: it comes first, the terms fold under it.
  hasMemo?: boolean;
}) {
  const s = t.page.sections;
  const upcomingCall = nextDealCall(calls);
  const movable = dealCallMovable(deal, access.personId);
  const termProposals = proposals.flatMap((p) =>
    p.kind === "term" ? [p] : [],
  );
  const nextProposals = proposals.filter((p) => p.kind === "next_action");
  // Calls right above: the next one is not repeated beside the action.
  const callsFirst = WORKS[deal.stage][0] === "calls";
  // Contracting, the next gesture is the contract's: an empty « Prochaine
  // action » says nothing (Sacha 23/11/2026).
  const nextShown =
    deal.stage !== "contracting" ||
    deal.nextAction !== null ||
    nextProposals.length > 0;
  const sections: Record<Work, ReactNode> = {
    // The next action, then the loop below it (Sacha 23/11/2026: never side
    // by side); the loop only where a deal memo is worked on.
    next: !isClosedStage(deal.stage) && (
      <div className="flex flex-col gap-6">
        {nextShown && (
          <PageSection id="prochaine-action" title={s.next}>
            <div className="flex flex-col gap-3">
              {nextProposals.length > 0 && (
                <DealCallProposals deal={deal} proposals={nextProposals} />
              )}
              <DealNextAction
                deal={deal}
                proposed={nextProposals.length > 0}
                call={
                  upcomingCall &&
                  !callsFirst && (
                    <DealCallCard
                      call={upcomingCall}
                      now={new Date()}
                      movable={movable(upcomingCall)}
                    />
                  )
                }
              />
            </div>
          </PageSection>
        )}
        {MEMO_STAGES.includes(deal.stage) && (
          <DealMemoSections
            access={access}
            deal={deal}
            terms={terms}
            part="loop"
          />
        )}
      </div>
    ),
    // Once a memo came, it says what was agreed: the terms fold under it,
    // kept to check it and to fill the contract (Sacha 23/11/2026).
    terms: (
      <PageSection
        id="termes"
        title={t.terms.title}
        collapsible={hasMemo}
        defaultOpen={!hasMemo}
      >
        <DealTerms
          dealId={deal.id}
          terms={terms}
          canWrite={deal.canWrite}
          writtenOnly={deal.agreementStatus === "validated"}
          proposals={termProposals}
          sources={sources.flatMap((p) => (p.kind === "term" ? [p] : []))}
        />
      </PageSection>
    ),
    contacts: (
      <PageSection id="contacts" title={dealContacts.section}>
        <DealContacts
          dealId={deal.id}
          contacts={contacts}
          canWrite={deal.canWrite}
        />
      </PageSection>
    ),
    calls: (
      <PageSection
        id="calls"
        title={dealCalls.section}
        // « À contacter »: « Caler le call » is already the main gesture.
        action={
          callForm &&
          deal.stage !== "to_contact" && (
            <DealCallButton
              data={callForm}
              another={upcomingCall !== null}
              inSection
            />
          )
        }
      >
        <DealCalls calls={calls} movable={movable} />
      </PageSection>
    ),
    memo: (
      <DealMemoSections access={access} deal={deal} terms={terms} part="memo" />
    ),
    contract: (
      <DealMemoSections
        access={access}
        deal={deal}
        terms={terms}
        part="contract"
      />
    ),
  };
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
        callHeld={dealCallHeld(calls)}
        memoNow={memoStep && <DealMemoNow dealId={deal.id} step={memoStep} />}
        contractNow={
          contractCircuit ? (
            <ContractNow
              contract={contractCircuit.contract}
              data={contractCircuit.data}
            />
          ) : (
            contractStep && (
              <NowFrame label={t.page.now}>
                <DealContractNow dealId={deal.id} step={contractStep} />
              </NowFrame>
            )
          )
        }
      />
      {worksOf(deal.stage, hasMemo).map((work) => (
        <Fragment key={work}>{sections[work]}</Fragment>
      ))}
    </>
  );
}
