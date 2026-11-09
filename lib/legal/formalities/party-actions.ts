"use server";

import { requireApproved } from "@/lib/auth/dal";
import { catalogIdSchema } from "@/lib/catalog/schemas";
import { fr } from "@/lib/i18n/fr";
import {
  QUALITY_OF_ROLE,
  creatorIdentity,
  type Creator,
  type Publisher,
} from "@/lib/legal/formalities/definition";
import type { NetworkRole } from "@/lib/network/types";
import { createClient } from "@/lib/supabase/server";

// Who a SACEM 725 bulletin may name (Sacha, 07/10/2026: always picked, and
// everything known about them filled): people and structures of the Réseau,
// the title's own first, each with what the bulletin takes of them. Read
// with the user's session (the fiches: manage_legal, in RLS).

export type CreatorOption = {
  id: string;
  label: string;
  detail?: string;
  fill: Pick<
    Creator,
    "last_name" | "first_name" | "pseudonym" | "ipi" | "roles"
  >;
};
export type PublisherOption = {
  id: string;
  label: string;
  detail?: string;
  fill: Pick<Publisher, "name" | "ipi">;
  // In the Réseau as a label, producer, studio or distributor, not as a
  // publisher (retour d'Ibé du 02/11/2026: never confused).
  notPublisher: boolean;
};

// The structures that hold rights on the recording, not on the work.
const RECORDING_SIDE = ["label", "production_company", "studio", "distributor"];
const notPublisher = (roles: string[]) =>
  !roles.includes("publisher") && roles.some((r) => RECORDING_SIDE.includes(r));

const asText = (value: unknown): Record<string, string> =>
  value && typeof value === "object"
    ? Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(([k, v]) => [
          k,
          String(v ?? ""),
        ]),
      )
    : {};

async function read(masterId: string, kind: "person" | "organization") {
  await requireApproved();
  const id = catalogIdSchema.safeParse(masterId);
  if (!id.success) return null;
  const supabase = await createClient();
  const [contacts, credits, splits, details] = await Promise.all([
    supabase
      .from("network_contacts")
      .select("id, name, roles")
      .eq("kind", kind)
      .is("archived_at", null)
      .order("name")
      .limit(1000),
    supabase
      .from("master_contributors")
      .select("role, contact_id")
      .eq("master_id", id.data)
      .not("contact_id", "is", null)
      .order("created_at"),
    supabase
      .from("master_splits")
      .select("contact_id")
      .eq("master_id", id.data)
      .eq("kind", "publishing")
      .eq("role", "publisher")
      .not("contact_id", "is", null),
    supabase.from("contact_legal_details").select("contact_id, details"),
  ]);
  return {
    contacts: contacts.data ?? [],
    credits: credits.data ?? [],
    publishers: new Set((splits.data ?? []).map((s) => s.contact_id)),
    detailsOf: new Map(
      (details.data ?? []).map((d) => [d.contact_id, asText(d.details)]),
    ),
  };
}

const rolesOf = (roles: string[]) =>
  (roles as NetworkRole[]).map((r) => fr.network.roles[r]).join(", ");

/** The Réseau's people, those credited on the title as author, composer or
 * arranger first, with their identity and their roles on the title. */
export async function listSacemCreators(
  masterId: string,
): Promise<CreatorOption[]> {
  const data = await read(masterId, "person");
  if (!data) return [];
  const roles = fr.masterPage.credits.roles as Record<string, string>;
  const credited = new Map<string, string[]>();
  for (const c of data.credits) {
    if (!c.contact_id || !QUALITY_OF_ROLE[c.role]) continue;
    credited.set(c.contact_id, [...(credited.get(c.contact_id) ?? []), c.role]);
  }
  const options = data.contacts.map((c): CreatorOption => {
    const onTitle = credited.get(c.id);
    return {
      id: c.id,
      label: c.name,
      detail: onTitle
        ? `${fr.masterPage.splits.party.credited} · ${onTitle.map((r) => roles[r] ?? r).join(", ")}`
        : rolesOf(c.roles),
      fill: {
        ...creatorIdentity(c.name, data.detailsOf.get(c.id) ?? {}),
        roles: [
          ...new Set(
            (onTitle ?? []).flatMap((r) => {
              const q = QUALITY_OF_ROLE[r];
              return q ? [q] : [];
            }),
          ),
        ],
      },
    };
  });
  return [
    ...options.filter((o) => credited.has(o.id)),
    ...options.filter((o) => !credited.has(o.id)),
  ];
}

/** The Réseau's structures, the publishers of the title's publishing split
 * first, with their name and IPI. */
export async function listSacemPublishers(
  masterId: string,
): Promise<PublisherOption[]> {
  const data = await read(masterId, "organization");
  if (!data) return [];
  const options = data.contacts.map((c): PublisherOption => ({
    id: c.id,
    label: c.name,
    detail: data.publishers.has(c.id)
      ? fr.legalFormalities.publisher.inSplit
      : rolesOf(c.roles),
    fill: {
      name: c.name,
      ipi: data.detailsOf.get(c.id)?.ipi_coad ?? "",
    },
    notPublisher: notPublisher(c.roles),
  }));
  return [
    ...options.filter((o) => data.publishers.has(o.id)),
    ...options.filter((o) => !data.publishers.has(o.id)),
  ];
}

export type PublishingContractOption = {
  id: string;
  title: string;
  status: string;
};

/**
 * The project's publishing contracts a publisher of the bulletin may rest
 * on (JUR-25), whatever their state: the bulletin says which one founds
 * each creator–publisher link. Read with the user's session (RLS).
 */
export async function listPublishingContracts(
  formalityId: string,
): Promise<PublishingContractOption[]> {
  await requireApproved();
  const id = catalogIdSchema.safeParse(formalityId);
  if (!id.success) return [];
  const supabase = await createClient();
  const { data: formality } = await supabase
    .from("legal_formalities")
    .select("project_id")
    .eq("id", id.data)
    .maybeSingle();
  if (!formality) return [];
  const { data, error } = await supabase
    .from("contracts")
    .select("id, title, status")
    .eq("project_id", formality.project_id)
    .eq("type", "publishing")
    .order("created_at");
  if (error) console.error("listPublishingContracts:", error.message);
  return (data ?? []).map((c) => ({
    id: c.id,
    title: c.title,
    status: c.status,
  }));
}
