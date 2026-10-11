"use server";

import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { done, id } from "@/lib/framing/actions/shared";
import { loadFramingKnowledge } from "@/lib/framing/knowledge";
import {
  DOCUMENT_STATUSES,
  PARTY_RELATIONS,
  REASONED_STATUSES,
  legalPartyBoard,
} from "@/lib/framing/legal-parties";
import { fail, type ActionResult } from "@/lib/framing/result";
import { createClient } from "@/lib/supabase/server";

/**
 * A person qualifies one legal party of the Cadrage (PROJ-BUG-03). The
 * party, its name, contact and roles are read again on the server from the
 * project's records, never taken from the client; « Existant » only with a
 * signed contract of Contrats the contact is party to; « Non nécessaire » and
 * « Non applicable » only with a reason. Who decided is written by SQL.
 */
const input = z.object({
  key: z.string().trim().min(1).max(200),
  relation: z.enum(PARTY_RELATIONS).nullable(),
  status: z.enum(DOCUMENT_STATUSES),
  contractId: id.nullable(),
  ownerPersonId: id.nullable(),
  note: z
    .string()
    .trim()
    .max(500)
    .transform((v) => v || null),
});

export async function qualifyLegalParty(
  projectId: string,
  values: z.input<typeof input>,
): Promise<ActionResult> {
  const p = input.safeParse(values);
  if (!p.success || !id.safeParse(projectId).success)
    return fail("invalid_input");
  const v = p.data;
  const access = await requireApproved();
  const k = await loadFramingKnowledge(projectId, access);
  if (!k || !access.organizationId) return fail("not_found");
  const line = legalPartyBoard(k).lines.find((l) => l.key === v.key);
  if (!line) return fail("not_found");

  const contract = v.contractId
    ? line.contracts.find((c) => c.id === v.contractId)
    : null;
  if (v.contractId && !contract) return fail("invalid_input");
  if (v.status === "existing" && contract?.status !== "signed")
    return fail("invalid_input");
  if (REASONED_STATUSES.includes(v.status) && !v.note)
    return fail("reason_required");
  if (
    v.ownerPersonId &&
    !k.framing.members.some((m) => m.personId === v.ownerPersonId)
  )
    return fail("invalid_owner");

  const decision = {
    relation: v.relation,
    document_status: v.status,
    contract_id: contract?.id ?? null,
    owner_person_id: v.ownerPersonId,
    note: v.note,
    roles: line.roles,
  };
  const supabase = await createClient();
  const { error } = line.decision
    ? await supabase
        .from("framing_legal_parties")
        .update(decision)
        .eq("id", line.decision.id)
    : await supabase.from("framing_legal_parties").insert({
        ...decision,
        organization_id: access.organizationId,
        project_id: projectId,
        party_key: line.key,
        name: line.name,
        contact_id: line.contactId,
      });
  return done(projectId, error);
}

/** Back to « À qualifier »: the decision is removed, the party stays listed. */
export async function clearLegalParty(
  projectId: string,
  key: string,
): Promise<ActionResult> {
  if (!id.safeParse(projectId).success || !key.trim())
    return fail("invalid_input");
  await requireApproved();
  const supabase = await createClient();
  const { error } = await supabase
    .from("framing_legal_parties")
    .delete()
    .eq("project_id", projectId)
    .eq("party_key", key);
  return done(projectId, error);
}
