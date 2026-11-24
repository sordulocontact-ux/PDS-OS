"use server";

import { z } from "zod";

import { routes } from "@/lib/auth/redirects";
import { requireApproved } from "@/lib/auth/dal";
import { dealName } from "@/lib/deals/names";
import { emailEnabled } from "@/lib/email/send";
import { loadDeals } from "@/lib/deals/queries";
import { todayInParis } from "@/lib/insights/dates";
import { loadSheetInvoices } from "@/lib/invoices/sheet";
import { loadContactHistory } from "@/lib/network/contact-history";
import { loadContactProjects } from "@/lib/network/contact-projects";
import { loadNetworkFiche } from "@/lib/network/fiche";
import { getNetworkContact } from "@/lib/network/queries";
import type { ContactSheetData } from "@/lib/network/sheet-types";
import { masterPage } from "@/lib/i18n/fr/master-page";
import { personName } from "@/lib/projects/types";
import { formatShortDate } from "@/lib/release/format";
import { createClient } from "@/lib/supabase/server";

// The Réseau's side sheet (ContactSheet), read when it opens: what the
// contact's page knows, condensed. The viewer's session reads it all, so RLS
// leaves out what they may not see (a private contact's calls, a contract,
// an invoice).

/** null: the contact is gone or out of reach. */
export async function loadContactSheet(
  contactId: string,
): Promise<ContactSheetData | null> {
  const access = await requireApproved();
  if (!z.uuid().safeParse(contactId).success) return null;
  const supabase = await createClient();
  const today = todayInParis();

  const [contact, projects, history, deals, created, invoices, fiche] =
    await Promise.all([
      getNetworkContact(contactId),
      loadContactProjects(contactId),
      loadContactHistory(contactId),
      loadDeals(access),
      supabase
        .from("network_contacts")
        .select("created_at")
        .eq("id", contactId)
        .maybeSingle(),
      loadSheetInvoices({ contactId }),
      loadNetworkFiche(contactId),
    ]);
  if (!contact) return null;

  // A private contact's exchanges stay with whoever may read it.
  const calls = contact.privacy.hidden ? [] : history.calls;
  const past = calls.filter((call) => call.occurredAt.slice(0, 10) <= today);
  const next = calls
    .filter((call) => call.occurredAt.slice(0, 10) > today)
    .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt))[0];

  // The team's members of those calls, most calls first.
  const attendees = calls.length
    ? await supabase
        .from("call_attendees")
        .select(
          "call_id, person_id, person:people!call_attendees_person_id_fkey(first_name, last_name)",
        )
        .in(
          "call_id",
          calls.map((call) => call.id),
        )
    : null;
  if (attendees?.error)
    console.error("loadContactSheet attendees:", attendees.error.message);
  const team = new Map<string, { name: string; calls: number }>();
  for (const row of attendees?.data ?? []) {
    if (!row.person) continue;
    const known = team.get(row.person_id);
    team.set(row.person_id, {
      name: personName(row.person.first_name, row.person.last_name),
      calls: (known?.calls ?? 0) + 1,
    });
  }

  const items = projects.flatMap((project) => project.items);
  const open = items.filter((item) => item.state !== "done");

  return {
    since: (created.data?.created_at ?? "").slice(0, 10),
    ownerName: contact.privacy.ownerName,
    hidden: contact.privacy.hidden,
    website: contact.website,
    instagram: contact.instagram,
    fiche: contact.archived ? null : fiche,
    canEmailFiche: emailEnabled() && Boolean(contact.email),
    calls: {
      lastOn: past[0]?.occurredAt ?? null,
      next: next
        ? { id: next.id, title: next.title, at: next.occurredAt }
        : null,
    },
    awaited: {
      open: open.length,
      late: open.filter((item) => item.due !== null && item.due < today).length,
    },
    pastCalls: past.map((call) => ({
      id: call.id,
      label: call.title,
      href: routes.call(call.id),
      detail: formatShortDate(call.occurredAt),
    })),
    credits: history.credits.map((credit) => ({
      id: `${credit.masterId}-${credit.role}`,
      label: credit.title,
      href: routes.master(credit.masterId),
      detail: masterPage.credits.roles[credit.role],
    })),
    team: [...team.entries()]
      .map(([personId, member]) => ({ personId, ...member }))
      .filter((member) => member.personId !== access.personId)
      .sort((a, b) => b.calls - a.calls || a.name.localeCompare(b.name, "fr")),
    organization: contact.parentId
      ? {
          id: contact.parentId,
          label: contact.parentName ?? "",
          href: routes.networkContact(contact.parentId),
        }
      : null,
    artist: contact.artistId
      ? {
          id: contact.artistId,
          label: contact.artistName ?? "",
          href: routes.artist(contact.artistId),
        }
      : null,
    managedArtists: contact.managedArtists.map((a) => ({
      id: a.id,
      label: a.name,
      href: routes.artist(a.id),
    })),
    members: contact.members.map((m) => ({
      id: m.id,
      label: m.name,
      href: routes.networkContact(m.id),
    })),
    projects: projects.map((p) => ({
      id: p.projectId,
      label: p.title,
      href: routes.project(p.projectId),
    })),
    contracts: contact.contracts.map((c) => ({
      id: c.id,
      label: c.title,
      href: routes.contract(c.id),
      role: c.role,
      status: c.status,
    })),
    deals: deals.deals
      .filter((deal) => deal.counterpartId === contactId)
      .map((deal) => ({
        id: deal.id,
        label: dealName(deal),
        href: routes.deal(deal.id),
        stage: deal.stage,
      })),
    invoices,
  };
}
