import { notFound } from "next/navigation";
import { z } from "zod";

import type { DealCallFormData } from "@/components/deals/deal-call-button";
import { DealFileView } from "@/components/deals/deal-file-view";
import { DealStageBadge } from "@/components/deals/deal-stage-badge";
import { DealTodoView } from "@/components/deals/deal-todo-view";
import { NewDealButton } from "@/components/deals/new-deal-button";
import { BackLink } from "@/components/shell/back-link";
import { SectionFrame } from "@/components/shell/section-frame";
import { TabBar } from "@/components/ui/tab-bar";
import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { formatSlot, nextRoundHourInput } from "@/lib/calls/format";
import { loadCallContacts } from "@/lib/calls/invite";
import { dealCallTitle, dealCallTopics } from "@/lib/deals/call-prep";
import {
  loadDealCallProposals,
  loadDealCalls,
  nextDealCall,
} from "@/lib/deals/call-queries";
import { loadDealContacts } from "@/lib/deals/contact-queries";
import {
  loadDealNegotiationCall,
  withSlots,
} from "@/lib/deals/negotiation-call";
import { loadNewDealOptions } from "@/lib/deals/new-deal-options";
import { dealName } from "@/lib/deals/names";
import { loadDeal, loadDealEvents } from "@/lib/deals/queries";
import { loadDealTerms } from "@/lib/deals/term-queries";
import type { DealTerm } from "@/lib/deals/terms";
import type { Deal } from "@/lib/deals/types";
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
async function callFormFor(
  deal: Deal,
  terms: DealTerm[],
  me: string | null,
): Promise<DealCallFormData | null> {
  if (!deal.canWrite) return null;
  return {
    dealId: deal.id,
    title: dealCallTitle(dealName(deal)),
    contacts: await loadCallContacts(),
    googleMeet: googleMeetConfigured(),
    defaultOccurredAt: nextRoundHourInput(new Date()),
    topics: dealCallTopics(deal, terms),
    negotiator: deal.assignee,
    // His free slots when someone else plans the call (the direction).
    slots:
      deal.assignee && deal.assignee.id !== me
        ? await withSlots([deal.assignee])
        : [],
  };
}

/** The tab's title: the deal's name (UX test of 12/11/2026: « PDS OS »
 * alone, the tab said nothing). */
export async function generateMetadata({
  params,
}: PageProps<"/app/deals/[dealId]">) {
  const { dealId } = await params;
  if (!z.uuid().safeParse(dealId).success) return { title: t.title };
  const deal = await loadDeal(await requireApproved(), dealId);
  return { title: deal ? `${dealName(deal)} · ${t.title}` : t.title };
}

/**
 * A deal's page (BIZ 4), its stage beside its name, in two views (Ibé
 * 18/11/2026: « il faut faire comme si la personne en face ne réfléchissait
 * pas »). « À faire » (DealTodoView): « Maintenant » when the reader has a
 * gesture, PO's proposals, the next action, then what the stage works on.
 * « Dossier » (`?vue=dossier`, DealFileView): everything about the deal,
 * to read. Not found for whoever may not read it.
 */
export default async function DealPage({
  params,
  searchParams,
}: PageProps<"/app/deals/[dealId]">) {
  const [{ dealId }, query] = await Promise.all([params, searchParams]);
  if (!z.uuid().safeParse(dealId).success) notFound();
  const access = await requireApproved();
  const deal = await loadDeal(access, dealId);
  if (!deal) notFound();
  const file = query.vue === "dossier";
  const [events, terms, negotiators, calls, proposals, contacts] =
    await Promise.all([
      loadDealEvents(deal.id),
      loadDealTerms(deal.id, deal.kind),
      negotiatorsFor(deal.canAssign && file),
      loadDealCalls(deal.id),
      file ? Promise.resolve([]) : loadDealCallProposals(deal.id, deal.kind),
      loadDealContacts(deal.id),
    ]);
  const href = routes.deal(deal.id);
  const tabs = t.page.tabs;

  return (
    <SectionFrame
      list={false}
      above={<BackLink href={routes.deals}>{t.page.back}</BackLink>}
      title={dealName(deal)}
      badge={<DealStageBadge deal={deal} size="md" />}
    >
      <TabBar
        label={tabs.label}
        items={[
          { href, label: tabs.todo, current: !file },
          { href: `${href}?vue=dossier`, label: tabs.file, current: file },
        ]}
      />
      {file ? (
        <DealFileView
          access={access}
          deal={deal}
          terms={terms}
          negotiators={negotiators}
          contacts={contacts}
          calls={calls}
          events={events}
        />
      ) : (
        <DealTodo
          access={access}
          deal={deal}
          terms={terms}
          events={events}
          calls={calls}
          proposals={proposals}
          contacts={contacts}
        />
      )}
    </SectionFrame>
  );
}

/** « À faire », with what only it needs: the call form (« Caler le call »
 * for the project's owner), the next call, a new deal after an abandoned
 * one. */
async function DealTodo({
  access,
  deal,
  terms,
  events,
  calls,
  proposals,
  contacts,
}: Omit<
  Parameters<typeof DealTodoView>[0],
  "proposer" | "reopen" | "callForm" | "negotiationCall" | "nextCall"
>) {
  const [callForm, negotiationCall] = await Promise.all([
    callFormFor(deal, terms, access.personId),
    loadDealNegotiationCall(deal, terms),
  ]);
  // An abandoned deal: the direction opens a new one for its artist.
  const reopenOptions =
    deal.stage === "abandoned" && can(access, "validate")
      ? await loadNewDealOptions(access, new Set())
      : null;
  // The next call still to hold, its day and hour beside the next action.
  const nextCall = nextDealCall(calls);
  return (
    <DealTodoView
      access={access}
      deal={deal}
      terms={terms}
      events={events}
      // The events come newest first: the last proposal of the accord.
      proposer={
        events.find((e) => e.kind === "stage" && e.toStage === "agreement")
          ?.actor ?? null
      }
      reopen={
        reopenOptions && (
          <NewDealButton
            options={reopenOptions}
            artistId={deal.artistId}
            label={t.page.reopen}
          />
        )
      }
      callForm={callForm}
      negotiationCall={negotiationCall}
      proposals={proposals}
      contacts={contacts}
      calls={calls}
      nextCall={
        nextCall
          ? { label: formatSlot(nextCall), href: routes.call(nextCall.id) }
          : null
      }
    />
  );
}
