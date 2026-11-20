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
import { EmptyNote } from "@/components/shell/empty-state";
import { PageSection } from "@/components/shell/page-section";
import type { Access } from "@/lib/auth/access";
import type { DealCall, DealCallProposal } from "@/lib/deals/call-queries";
import type { DealContact } from "@/lib/deals/contact-queries";
import type { DealTerm } from "@/lib/deals/terms";
import { isClosedStage, type Deal, type DealStage } from "@/lib/deals/types";
import { dealCalls } from "@/lib/i18n/fr/deal-calls";
import { dealContacts } from "@/lib/i18n/fr/deal-contacts";
import { deals as t } from "@/lib/i18n/fr/deals";

// What each stage works on, under its « Maintenant » (Ibé 18/11/2026: one
// view to act, the rest in « Dossier »).
const WORKS: Record<"terms" | "contacts" | "calls" | "memo", DealStage[]> = {
  terms: ["to_contact", "call_planned", "negotiation", "agreement"],
  contacts: ["to_contact", "call_planned"],
  calls: ["to_contact", "call_planned", "negotiation"],
  memo: ["agreement", "contracting"],
};

/**
 * « À faire » of a deal: its « Maintenant » (the stage's own gesture), PO's
 * proposals from its calls, the next action, then only what its stage
 * works on — the people and the call to contact, the terms to negotiate,
 * the deal memo and the contract to agree and sign. Everything else is in
 * « Dossier » (DealFileView).
 */
export function DealTodoView({
  access,
  deal,
  terms,
  proposer,
  reopen,
  callForm,
  proposals,
  contacts,
  calls,
  nextCall,
}: {
  access: Access;
  deal: Deal;
  terms: DealTerm[];
  proposer: string | null;
  reopen: ReactNode;
  callForm: DealCallFormData | null;
  proposals: DealCallProposal[];
  contacts: DealContact[];
  calls: DealCall[];
  nextCall: { label: string; href: string } | null;
}) {
  const s = t.page.sections;
  const works = (what: keyof typeof WORKS) => WORKS[what].includes(deal.stage);
  return (
    <>
      <DealNow
        deal={deal}
        terms={terms}
        proposer={proposer}
        reopen={reopen}
        lead={callForm && <DealCallButton data={callForm} variant="default" />}
      />
      {deal.stage === "signed" && <EmptyNote>{t.page.signedNote}</EmptyNote>}
      {proposals.length > 0 && (
        <PageSection id="propositions" title={dealCalls.proposals.title}>
          <DealCallProposals deal={deal} proposals={proposals} />
        </PageSection>
      )}
      {!isClosedStage(deal.stage) && (
        <PageSection id="prochaine-action" title={s.next}>
          <DealNextAction deal={deal} nextCall={nextCall} />
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
