import "server-only";

import { can, type Access } from "@/lib/auth/access";
import { contractStateOf, todayInParis } from "@/lib/contracts/types";
import { feeCentsOf } from "@/lib/legal/contracts/fields";
import {
  agreementRows,
  type AgreementRow,
} from "@/lib/legal/contracts/mapping";
import { listTemplates } from "@/lib/legal/contracts/templates";
import type { ValueContext } from "@/lib/legal/contracts/values";
import { FORM_ROLES, type FormRole } from "@/lib/legal/forms/definition";
import {
  featuredArtists,
  featuredKey,
  formPeople,
} from "@/lib/legal/forms/people";
import { readInventoryRows } from "@/lib/legal/inventory-rows";
import { personName } from "@/lib/projects/types";
import { createClient } from "@/lib/supabase/server";
import { normalizeSearch } from "@/lib/utils/search";

// The project's agreements (ticket Juridique 03), read with the viewer's
// session (RLS: manage_legal on a visible project).

export type Agreements = {
  rows: AgreementRow[];
  hasValidatedTemplate: boolean;
  approval: { by: string; at: string } | null;
};

type Project = {
  id: string;
  title: string;
  artistName: string | null;
  masters: Array<{ id: string; title: string; artists: string }>;
};

const asText = (value: unknown): Record<string, string> =>
  value && typeof value === "object"
    ? Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(([k, v]) => [
          k,
          String(v ?? ""),
        ]),
      )
    : {};

export async function loadAgreements(
  project: Project,
  access: Access,
): Promise<Agreements> {
  const supabase = await createClient();
  const [rows, templates, needs, forms, money, approval, organization] =
    await Promise.all([
      readInventoryRows(
        project.id,
        project.masters,
        can(access, "manage_catalog"),
      ),
      listTemplates(),
      supabase
        .from("legal_agreement_needs")
        .select("id, contact_id, roles, template_id, fee_cents, contract_id")
        .eq("project_id", project.id),
      supabase
        .from("legal_forms")
        .select("id, contact_id, status")
        .eq("project_id", project.id)
        .neq("status", "revoked"),
      supabase
        .from("financial_needs")
        .select("contract_id, amount_cents")
        .eq("project_id", project.id),
      supabase
        .from("contract_events")
        .select("actor_person_id, created_at")
        .eq("project_id", project.id)
        .is("contract_id", null)
        .eq("kind", "contract_mapping.approved")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      access.organizationId
        ? supabase
            .from("organizations")
            .select("name")
            .eq("id", access.organizationId)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);
  for (const [scope, result] of Object.entries({
    needs,
    forms,
    money,
    approval,
  }))
    if (result.error)
      console.error(`loadAgreements ${scope}:`, result.error.message);

  // Only complete fiches give values; the others still wait for the
  // person (JUR-16: « en attente d'un tiers »).
  const complete = (forms.data ?? []).filter((f) => f.status === "complete");
  const ficheWaitingOf = new Set(
    (forms.data ?? [])
      .filter(
        (f) =>
          f.status !== "complete" &&
          !complete.some((c) => c.contact_id === f.contact_id),
      )
      .map((f) => f.contact_id),
  );
  const ficheRoles = await submittedRoles(
    supabase,
    complete.map((f) => f.id),
    new Map(complete.map((f) => [f.id, f.contact_id])),
  );
  // The roles a person ticked on their fiche count for their contract too.
  const people = formPeople(rows).map((person) => {
    const ticked = person.contactId ? ficheRoles.get(person.contactId) : null;
    return ticked
      ? {
          ...person,
          formRoles: [...new Set([...person.formRoles, ...ticked])],
        }
      : person;
  });
  const contactIds = people.flatMap((p) => (p.contactId ? [p.contactId] : []));
  const formIds = complete.map((f) => f.id);
  const [contacts, details, submissions, approver] = await Promise.all([
    contactIds.length > 0
      ? supabase
          .from("network_contacts")
          .select("id, name, email, phone")
          .in("id", contactIds)
      : Promise.resolve({ data: [], error: null }),
    contactIds.length > 0
      ? supabase
          .from("contact_legal_details")
          .select("contact_id, details")
          .in("contact_id", contactIds)
      : Promise.resolve({ data: [], error: null }),
    formIds.length > 0
      ? supabase
          .from("legal_form_submissions")
          .select("form_id, contribution, created_at")
          .in("form_id", formIds)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    approval.data?.actor_person_id
      ? supabase
          .from("people")
          .select("first_name, last_name")
          .eq("id", approval.data.actor_person_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  // The titles each person is credited or featured on (same key as
  // formPeople).
  const titlesOf = new Map<string, string[]>();
  const addTitle = (key: string, title: string) => {
    const list = titlesOf.get(key) ?? [];
    if (!list.includes(title)) list.push(title);
    titlesOf.set(key, list);
  };
  for (const title of rows.titles)
    for (const credit of rows.creditsOf.get(title.id) ?? [])
      addTitle(normalizeSearch(credit.name), title.title);
  for (const artist of featuredArtists(rows)) {
    const key =
      people.find((p) => artist.contact && p.contactId === artist.contact.id)
        ?.key ?? featuredKey(artist);
    for (const title of artist.titles) addTitle(key, title);
  }

  const detailsOf = new Map(
    (details.data ?? []).map((d) => [d.contact_id, asText(d.details)]),
  );
  const contextOf = new Map<string, Omit<ValueContext, "feeCents">>();
  for (const contact of contacts.data ?? []) {
    const person = people.find((p) => p.contactId === contact.id);
    contextOf.set(contact.id, {
      contact: {
        name: contact.name,
        email: contact.email,
        phone: contact.phone,
      },
      details: detailsOf.get(contact.id) ?? {},
      creditRoles: person?.creditRoles ?? [],
      titles: person ? (titlesOf.get(person.key) ?? []) : [],
      project: { title: project.title, artistName: project.artistName },
      organizationName: organization.data?.name ?? null,
    });
  }

  // « Rémunération convenue » of the latest complete fiche, when it is a
  // plain amount.
  const contactOfForm = new Map(complete.map((f) => [f.id, f.contact_id]));
  const ficheFeeOf = new Map<string, number>();
  for (const s of submissions.data ?? []) {
    const contact = contactOfForm.get(s.form_id);
    const cents = feeCentsOf(asText(s.contribution).agreed_fee);
    if (contact && cents && !ficheFeeOf.has(contact))
      ficheFeeOf.set(contact, cents);
  }

  const today = todayInParis(new Date());
  return {
    rows: agreementRows({
      people,
      needs: (needs.data ?? []).map((n) => ({
        id: n.id,
        contactId: n.contact_id,
        roles: n.roles,
        templateId: n.template_id,
        feeCents: n.fee_cents,
        contractId: n.contract_id,
      })),
      templates,
      contracts: rows.contracts.map((c) => ({
        id: c.id,
        title: c.title,
        state: contractStateOf(c, today),
        partyIds: c.partyIds,
      })),
      contextOf,
      ficheFeeOf,
      financialNeedOf: new Map(
        (money.data ?? []).map((m) => [m.contract_id, m.amount_cents]),
      ),
      mappingApproved: approval.data !== null,
      ficheWaitingOf,
    }),
    hasValidatedTemplate: templates.some((t) => t.status === "validated"),
    approval: approval.data
      ? {
          by: approver.data
            ? personName(approver.data.first_name, approver.data.last_name)
            : "",
          at: approval.data.created_at,
        }
      : null,
  };
}

// The roles ticked on each person's complete fiche, by contact.
async function submittedRoles(
  supabase: Awaited<ReturnType<typeof createClient>>,
  formIds: string[],
  contactOfForm: Map<string, string>,
): Promise<Map<string, FormRole[]>> {
  if (formIds.length === 0) return new Map();
  const { data } = await supabase
    .from("legal_form_submissions")
    .select("form_id, roles")
    .in("form_id", formIds);
  const out = new Map<string, FormRole[]>();
  for (const row of data ?? []) {
    const contact = contactOfForm.get(row.form_id);
    if (!contact) continue;
    const roles = (row.roles ?? []).filter((r): r is FormRole =>
      (FORM_ROLES as readonly string[]).includes(r),
    );
    out.set(contact, [...new Set([...(out.get(contact) ?? []), ...roles])]);
  }
  return out;
}
