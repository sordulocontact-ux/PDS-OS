import { notFound } from "next/navigation";
import { z } from "zod";

import { DealCallButton } from "@/components/deals/deal-call-button";
import { DealCallProposals } from "@/components/deals/deal-call-proposals";
import { DealCalls } from "@/components/deals/deal-calls";
import { DealContacts } from "@/components/deals/deal-contacts";
import { DealHistory } from "@/components/deals/deal-history";
import { DealInfo } from "@/components/deals/deal-info";
import { DealMemoSections } from "@/components/deals/deal-memo-sections";
import { DealNextAction } from "@/components/deals/deal-next-action";
import { DealNow } from "@/components/deals/deal-now";
import { DealStageBadge } from "@/components/deals/deal-stage-badge";
import { DealStages } from "@/components/deals/deal-stages";
import { DealTerms } from "@/components/deals/deal-terms";
import { NewDealButton } from "@/components/deals/new-deal-button";
import { BackLink } from "@/components/shell/back-link";
import { PageContainer } from "@/components/shell/page-container";
import { PageHeader } from "@/components/shell/page-header";
import { PageSection } from "@/components/shell/page-section";
import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { formatSlot, nextRoundHourInput } from "@/lib/calls/format";
import { loadCallContacts } from "@/lib/calls/invite";
import { dealCallAgenda, dealCallTitle } from "@/lib/deals/call-prep";
import {
  loadDealCallProposals,
  loadDealCalls,
  nextDealCall,
} from "@/lib/deals/call-queries";
import { loadDealContacts } from "@/lib/deals/contact-queries";
import { loadNewDealOptions } from "@/lib/deals/new-deal-options";
import { dealName } from "@/lib/deals/names";
import { loadDeal, loadDealEvents } from "@/lib/deals/queries";
import { loadDealTerms } from "@/lib/deals/term-queries";
import type { DealTerm } from "@/lib/deals/terms";
import type { Deal } from "@/lib/deals/types";
import { dealCalls } from "@/lib/i18n/fr/deal-calls";
import { dealContacts } from "@/lib/i18n/fr/deal-contacts";
import { deals as t } from "@/lib/i18n/fr/deals";
import { googleMeetConfigured } from "@/lib/integrations/google-calendar";
import { createClient } from "@/lib/supabase/server";
import { personName } from "@/lib/projects/types";

/** The members who negotiate, for whoever may assign the deal. */
async function negotiatorsFor(canAssign: boolean) {
  if (!canAssign) return null;
  const supabase = await createClient();
  const { data } = await supabase.rpc("list_deal_negotiators");
  return Object.fromEntries(
    (data ?? []).map((n) => [
      n.person_id,
      personName(n.first_name, n.last_name),
    ]),
  );
}

/** What « Préparer un call » needs, for whoever writes the deal (BIZ 6). */
async function callFormFor(deal: Deal, terms: DealTerm[]) {
  if (!deal.canWrite) return null;
  return {
    dealId: deal.id,
    title: dealCallTitle(dealName(deal)),
    contacts: await loadCallContacts(),
    googleMeet: googleMeetConfigured(),
    defaultOccurredAt: nextRoundHourInput(new Date()),
    topics: dealCallAgenda(deal, terms).map((item) =>
      [item.topic, ...(item.questions ?? [])].join(" · "),
    ),
  };
}

/**
 * A deal's page (BIZ 4): its stage beside its name, « Maintenant » when the
 * reader has a gesture, then the next action, the terms negotiated
 * (BIZ 3), PO's proposals from its calls and the calls themselves (BIZ 6),
 * its deal memo and its contract compared with it (BIZ 7), its people (a
 * private contact's coordinates for whoever may read them, BIZ 8),
 * the stages, what it is about and who negotiates it, and its history at
 * the bottom. Not found for whoever may not read it.
 */
export default async function DealPage({
  params,
}: PageProps<"/app/deals/[dealId]">) {
  const { dealId } = await params;
  if (!z.uuid().safeParse(dealId).success) notFound();
  const access = await requireApproved();
  const deal = await loadDeal(access, dealId);
  if (!deal) notFound();
  const [events, terms, negotiators, calls, proposals, contacts] =
    await Promise.all([
      loadDealEvents(deal.id),
      loadDealTerms(deal.id, deal.kind),
      negotiatorsFor(deal.canAssign),
      loadDealCalls(deal.id),
      loadDealCallProposals(deal.id, deal.kind),
      loadDealContacts(deal.id),
    ]);
  const callForm = await callFormFor(deal, terms);
  // An abandoned deal: the direction opens a new one for its artist.
  const reopenOptions =
    deal.stage === "abandoned" && can(access, "validate")
      ? await loadNewDealOptions(access, new Set())
      : null;
  // The next call still to hold, its day and hour beside the next action.
  const nextCall = nextDealCall(calls);
  const s = t.page.sections;

  return (
    <PageContainer>
      <BackLink href={routes.deals}>{t.page.back}</BackLink>
      <PageHeader
        title={dealName(deal)}
        badge={<DealStageBadge deal={deal} size="md" />}
      />
      <DealNow
        deal={deal}
        terms={terms}
        reopen={
          reopenOptions && (
            <NewDealButton
              options={reopenOptions}
              artistId={deal.artistId}
              label={t.page.reopen}
            />
          )
        }
      />
      <PageSection id="prochaine-action" title={s.next}>
        <DealNextAction
          deal={deal}
          nextCall={
            nextCall
              ? { label: formatSlot(nextCall), href: routes.call(nextCall.id) }
              : null
          }
        />
      </PageSection>
      {/* Who negotiates it, near the top (UX test of 12/11/2026). */}
      <PageSection id="informations" title={s.info}>
        <DealInfo deal={deal} negotiators={negotiators} />
      </PageSection>
      {proposals.length > 0 && (
        <PageSection id="propositions" title={dealCalls.proposals.title}>
          <DealCallProposals deal={deal} proposals={proposals} />
        </PageSection>
      )}
      <PageSection id="termes" title={t.terms.title}>
        <DealTerms dealId={deal.id} terms={terms} canWrite={deal.canWrite} />
      </PageSection>
      <PageSection id="contacts" title={dealContacts.section}>
        <DealContacts
          dealId={deal.id}
          contacts={contacts}
          canWrite={deal.canWrite}
        />
      </PageSection>
      <PageSection
        id="calls"
        title={dealCalls.section}
        action={callForm && <DealCallButton data={callForm} />}
      >
        <DealCalls calls={calls} />
      </PageSection>
      <DealMemoSections access={access} deal={deal} terms={terms} />
      <PageSection id="etapes" title={s.stages}>
        <DealStages deal={deal} events={events} />
      </PageSection>
      <PageSection id="historique" title={s.history}>
        <DealHistory deal={deal} events={events} />
      </PageSection>
    </PageContainer>
  );
}
