"use server";

import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { getArtist } from "@/lib/catalog/artist-queries";
import { getContract } from "@/lib/contracts/queries";
import { catalog } from "@/lib/i18n/fr/catalog";
import { contracts } from "@/lib/i18n/fr/contracts";
import { network } from "@/lib/i18n/fr/network";
import { peek } from "@/lib/i18n/fr/peek";
import { getNetworkContact } from "@/lib/network/queries";
import type { PeekKind, RecordPeek } from "@/lib/peek/types";
import { formatDay } from "@/lib/utils/day";

const fr = { catalog, contracts, network, peek };

const t = fr.peek.facts;

// Only what is known: an empty value is not a line.
const facts = (rows: Array<[string, string | null | undefined]>) =>
  rows.flatMap(([label, value]) => (value ? [{ label, value }] : []));

/**
 * What a row shows of a record in a modal (RecordPeek): read with the
 * viewer's session (RLS decides what they may see), a few facts and the way
 * to its full page. null: gone or out of reach.
 */
export async function peekRecord(
  kind: PeekKind,
  id: string,
): Promise<RecordPeek | null> {
  const access = await requireApproved();
  if (!z.uuid().safeParse(id).success) return null;

  if (kind === "artist") {
    const a = await getArtist(id);
    if (!a) return null;
    return {
      kind,
      title: a.name,
      pictureUrl: a.pictureUrl,
      href: routes.artist(a.id),
      facts: facts([
        [t.relation, fr.catalog.relation.labels[a.relation]],
        [t.legalName, a.legalName],
        [t.country, a.countryCode],
        [t.titles, fr.peek.count(a.masters.length)],
        [t.projects, fr.peek.count(a.projectIds.length)],
      ]),
    };
  }

  if (kind === "contact") {
    const c = await getNetworkContact(id);
    if (!c || c.archived) return null;
    return {
      kind,
      title: c.name,
      pictureUrl: null,
      href: routes.networkContact(c.id),
      facts: facts([
        [t.kind, fr.network.kinds[c.kind]],
        [t.roles, c.roles.map((r) => fr.network.roles[r]).join(", ")],
        [t.organization, c.parentName],
        [t.email, c.email],
        [t.phone, c.phone],
        [t.city, c.city],
      ]),
    };
  }

  const c = await getContract(id, access);
  if (!c) return null;
  return {
    kind,
    title: c.title,
    pictureUrl: null,
    href: routes.contract(c.id),
    facts: facts([
      [t.type, fr.contracts.types[c.type]],
      [t.state, fr.contracts.states[c.state]],
      [t.parties, c.parties.join(", ")],
      [t.owner, c.ownerName],
      [t.due, c.dueOn ? formatDay(c.dueOn) : null],
      [t.project, c.projectTitle],
    ]),
  };
}
