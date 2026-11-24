import { notFound } from "next/navigation";
import { z } from "zod";

import type { DealCallFormData } from "@/components/deals/deal-call-button";
import { DealInfoButton } from "@/components/deals/deal-info-button";
import type { ContractStep } from "@/components/deals/deal-contract-now";
import type { MemoStep } from "@/components/deals/deal-memo-now";
import { DealStageMenu } from "@/components/deals/deal-stage-menu";
import { DealStageBadge } from "@/components/deals/deal-stage-badge";
import { DealTodoView } from "@/components/deals/deal-todo-view";
import { NewDealButton } from "@/components/deals/new-deal-button";
import { SectionFrame } from "@/components/shell/section-frame";
import { can } from "@/lib/auth/access";
import {
  dealMailSetup,
  loadDealLoop,
  memoReplyTo,
} from "@/lib/deals/memo-mail-queries";
import { dealMemos } from "@/lib/i18n/fr/deal-memos";
import { loadParticipationStep } from "@/lib/deals/participation-contract";
import { loadDealContract, loadDealMemos } from "@/lib/deals/memo-queries";
import { loadContractPage } from "@/lib/contracts/page-data";
import { findContract } from "@/lib/contracts/queries";
import { dealContractDefaults } from "@/lib/deals/contract-defaults";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { formatSlot, nextRoundHourInput } from "@/lib/calls/format";
import { loadCallContacts } from "@/lib/calls/invite";
import { loadCallGuests } from "@/lib/deals/call-guests";
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
import { shell as shellText } from "@/lib/i18n/fr/shell";

const shellNav = shellText.nav;

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
    guests: await loadCallGuests({
      dealId: deal.id,
      participationId: deal.participationId,
      artistId: deal.artistId,
      counterpartId: deal.counterpartId,
    }),
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

/** How many memos a deal has (RLS: whoever reads the deal). */
async function countDealMemos(dealId: string): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("deal_memos")
    .select("id", { count: "exact", head: true })
    .eq("deal_id", dealId);
  return count ?? 0;
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
 * A deal's page (BIZ 4), its stage beside its name (Ibé 18/11/2026: « il
 * faut faire comme si la personne en face ne réfléchissait pas »):
 * « Maintenant » when the reader has a gesture, PO's proposals, the next
 * action, then what the stage works on (DealTodoView); signed or abandoned,
 * the whole deal to read. « Informations » beside the title (DealInfoButton):
 * its facts, people and calls the stage does not show (Sacha
 * 23/11/2026, in place of the « Dossier » tab). Not found for whoever may
 * not read it.
 */
export default async function DealPage({
  params,
}: PageProps<"/app/deals/[dealId]">) {
  const { dealId } = await params;
  if (!z.uuid().safeParse(dealId).success) notFound();
  const access = await requireApproved();
  const deal = await loadDeal(access, dealId);
  if (!deal) notFound();
  const [events, terms, negotiators, calls, proposals, sources, contacts] =
    await Promise.all([
      loadDealEvents(deal.id),
      loadDealTerms(deal.id, deal.kind),
      negotiatorsFor(deal.canAssign),
      loadDealCalls(deal.id),
      loadDealCallProposals(deal.id, deal.kind),
      loadDealCallProposals(deal.id, deal.kind, "applied"),
      loadDealContacts(deal.id),
    ]);
  return (
    <SectionFrame
      list={false}
      parent={{ label: shellNav.deals, href: routes.deals }}
      switcher={{ kind: "deal", id: deal.id }}
      title={dealName(deal)}
      badge={<DealStageBadge deal={deal} size="md" />}
      action={
        <div className="flex items-center gap-2">
          <DealInfoButton
            deal={deal}
            negotiators={negotiators}
            contacts={contacts}
            calls={calls}
          />
          {deal.canWrite && deal.stage !== "abandoned" && (
            <DealStageMenu deal={deal} name={dealName(deal)} />
          )}
        </div>
      }
    >
      <DealTodo
        access={access}
        deal={deal}
        terms={terms}
        events={events}
        calls={calls}
        proposals={proposals}
        sources={sources}
        contacts={contacts}
      />
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
  sources,
  contacts,
}: Omit<
  Parameters<typeof DealTodoView>[0],
  | "proposer"
  | "reopen"
  | "callForm"
  | "negotiationCall"
  | "nextCall"
  | "memoStep"
  | "contractStep"
  | "contractCircuit"
>) {
  // Negotiating, or the accord validated, whoever writes the deal sees the
  // deal memo's step (DealMemoNow).
  const memoTime =
    (deal.canWrite &&
      (deal.stage === "negotiation" ||
        (deal.stage === "agreement" &&
          deal.agreementStatus === "validated"))) ||
    // The direction decides an accord on its memo, read first.
    deal.canDecide;
  // Contracting, whoever reads the deal and its contract sees the contract's
  // step: who it waits for, when not their own (Sacha 23/11/2026).
  const contractTime = deal.stage === "contracting";
  const [callForm, negotiationCall, memos, loop, contract, memoCount] =
    await Promise.all([
      callFormFor(deal, terms, access.personId),
      loadDealNegotiationCall(deal, terms),
      memoTime ? loadDealMemos(deal.id, deal.kind, true) : Promise.resolve([]),
      memoTime ? loadDealLoop(deal.id) : Promise.resolve([]),
      contractTime ? loadDealContract(deal.id) : Promise.resolve(null),
      // Whether a memo came (it comes before the terms), when not read above.
      memoTime ? Promise.resolve(null) : countDealMemos(deal.id),
    ]);
  const hasMemo = memoTime ? memos.length > 0 : (memoCount ?? 0) > 0;
  // Its circuit, the same as on its page in Contrats, once its document is
  // there (generated, or a PDF deposited).
  const detail =
    contract?.visible && contractTime ? await findContract(contract.id) : null;
  const circuit = detail
    ? { contract: detail, data: await loadContractPage(detail, access) }
    : null;
  // A participation's contract, as its project's Juridique knows it, for
  // whoever reads the deal: its owner prepares it from here, the others see
  // who it waits for (Sacha 24/11/2026).
  const participation =
    contractTime && !circuit && deal.participationId
      ? ((await loadParticipationStep(deal, access).catch(() => null)) ??
        "unread")
      : null;
  const contractStep: ContractStep | null =
    contractTime && !circuit && (participation || deal.canWrite)
      ? {
          participation,
          create:
            !deal.participationId && can(access, "manage_contracts")
              ? dealContractDefaults(deal, access.organizationId)
              : null,
        }
      : null;
  const latest = memos[0] ?? null;
  const mail = dealMailSetup(deal.id);
  // No memo to decide on: the direction keeps the accord's recap.
  const memoStep: MemoStep | null =
    memoTime && !(deal.canDecide && !latest)
      ? {
          stage: deal.stage === "agreement" ? "agreement" : "negotiation",
          memo: latest && {
            id: latest.id,
            open:
              latest.status === "draft" && !latest.submitted && !latest.changes,
            changes: latest.changes?.reason ?? null,
            correctionSent: latest.correction !== null,
            toSend:
              latest.status === "validated" &&
              !latest.sent &&
              deal.stage === "agreement",
            received: latest.source !== "pds",
            receivedSubject: latest.email?.subject ?? null,
            toValidate: latest.status === "draft" && !latest.changes,
            file: latest.files.find((f) => f.url) ?? null,
            pdf:
              latest.source === "pds"
                ? {
                    href: routes.dealMemoPdf(deal.id, latest.id),
                    fileName: dealMemos.pdf.file(dealName(deal), latest.number),
                  }
                : null,
            attachment:
              latest.files.length > 0
                ? latest.files.map((f) => f.name).join(", ")
                : dealMemos.pdf.file(dealName(deal), latest.number),
          },
          organizationId: access.organizationId,
          counterpart: deal.counterpartName,
          director: can(access, "validate"),
          negotiator:
            deal.assignee && deal.assignee.id !== access.personId
              ? deal.assignee.name
              : null,
          dealName: dealName(deal),
          replyTo: await memoReplyTo(
            memos.find((m) => m.email)?.email?.from ?? null,
            deal,
          ),
          copies: loop
            .filter((e) => e.kind === "contact" && e.email)
            .flatMap((e) => (e.email ? [e.email] : [])),
          canEmail: mail.canEmail,
        }
      : null;
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
      sources={sources}
      contacts={contacts}
      calls={calls}
      memoStep={memoStep}
      contractStep={contractStep}
      contractCircuit={circuit}
      hasMemo={hasMemo}
      nextCall={
        nextCall
          ? { label: formatSlot(nextCall), href: routes.call(nextCall.id) }
          : null
      }
    />
  );
}
