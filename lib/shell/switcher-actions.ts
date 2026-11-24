"use server";

import { getAccess, requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { listArtists, listMasters } from "@/lib/catalog/queries";
import { listSelections } from "@/lib/catalog/selections";
import { listContracts } from "@/lib/contracts/queries";
import { dealName } from "@/lib/deals/names";
import { loadDeals } from "@/lib/deals/queries";
import { loadBudgets } from "@/lib/finance/budget-queries";
import { ENVELOPE_SLUG } from "@/lib/finance/envelope-slugs";
import { financeBudgets } from "@/lib/i18n/fr/finance-budgets";
import { networkListRoutes } from "@/lib/network/lists-types";
import { listNetworkLists } from "@/lib/network/lists";
import { listNetworkContacts } from "@/lib/network/queries";
import type { SwitcherItem, SwitcherKind } from "@/lib/shell/switcher";

/**
 * The records of a kind the top band's switcher offers, read when it opens,
 * with the reader's session (RLS): the same ones, in the same order, as
 * their list.
 */
export async function loadRecordSwitcher(
  kind: SwitcherKind,
): Promise<SwitcherItem[]> {
  await requireApproved();
  const items = await read(kind);
  if (!items) throw new Error(`loadRecordSwitcher (${kind})`);
  return items;
}

async function read(kind: SwitcherKind): Promise<SwitcherItem[] | null> {
  switch (kind) {
    case "budget": {
      const data = await loadBudgets();
      if (data.error) return null;
      return data.envelopes
        .filter((e) => !e.archived)
        .map((e) => ({
          id: e.id,
          label: e.name,
          detail: financeBudgets.kindOne[e.kind],
          href: `${routes.financeBudgets}/${ENVELOPE_SLUG[e.kind]}/${e.id}`,
        }));
    }
    case "deal": {
      const { deals, error } = await loadDeals(await getAccess());
      if (error) return null;
      return deals.map((d) => ({
        id: d.id,
        label: dealName(d),
        detail: d.counterpartName ?? null,
        href: routes.deal(d.id),
      }));
    }
    case "contract": {
      const rows = await listContracts();
      return (
        rows?.map((c) => ({
          id: c.id,
          label: c.title,
          detail: c.artistName ?? c.projectTitle,
          href: routes.contract(c.id),
        })) ?? null
      );
    }
    case "contact": {
      const rows = await listNetworkContacts(false);
      return (
        rows?.map((c) => ({
          id: c.id,
          label: c.name,
          detail: null,
          href: routes.networkContact(c.id),
        })) ?? null
      );
    }
    case "list": {
      const { lists, error } = await listNetworkLists();
      if (error) return null;
      return lists.map((l) => ({
        id: l.id,
        label: l.name,
        detail: null,
        href: networkListRoutes.list(l.id),
      }));
    }
    case "artist": {
      const { artists, error } = await listArtists();
      if (error) return null;
      return artists.map((a) => ({
        id: a.id,
        label: a.name,
        detail: null,
        href: routes.artist(a.id),
      }));
    }
    case "master":
    case "demo": {
      const { masters, error } = await listMasters({ demos: kind === "demo" });
      if (error) return null;
      return masters.map((m) => ({
        id: m.id,
        label: m.title,
        detail: m.artists || null,
        href: routes.master(m.id),
      }));
    }
    case "selection": {
      const { selections, error } = await listSelections();
      if (error) return null;
      return selections.map((s) => ({
        id: s.id,
        label: s.name,
        detail: null,
        href: routes.artistSelection(s.id),
      }));
    }
  }
}
