"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { getContract, loadContractFormOptions } from "@/lib/contracts/queries";
import {
  CONTRACT_ACTIONS,
  CONTRACT_TYPES,
  type ContractAction,
  type ContractFormOptions,
  type ContractValues,
} from "@/lib/contracts/types";
import { fr } from "@/lib/i18n/fr";
import { schedulePendingPushes } from "@/lib/notifications/push";
import { createClient } from "@/lib/supabase/server";

// Writes of contracts, with the user's session: RLS (can_edit_contract),
// column grants and advance_contract (SQL) decide; the checks here only give
// a clean message.

export type ContractResult =
  | { ok: true; id: string }
  | { ok: false; error: string; field?: "title" | "endsOn" };

type Result = { ok: true } | { ok: false; error: string };

const optionalDate = z
  .union([z.iso.date(), z.literal("")])
  .transform((value) => value || null);
const noneOrId = z
  .union([z.uuid(), z.literal(""), z.literal("none")])
  .transform((value) => (value === "none" || value === "" ? null : value));

const contractSchema = z
  .object({
    id: z.uuid().optional(),
    title: z.string().trim().min(1).max(200),
    type: z.enum(CONTRACT_TYPES),
    ownerPersonId: z.union([z.uuid(), z.literal("")]),
    projectId: noneOrId,
    artistId: noneOrId,
    dueOn: optionalDate,
    startsOn: optionalDate,
    endsOn: optionalDate,
    notes: z
      .string()
      .trim()
      .max(4000)
      .transform((value) => value || null),
  })
  .refine(
    (input) =>
      !input.startsOn || !input.endsOn || input.endsOn >= input.startsOn,
    { path: ["endsOn"] },
  );

function refresh(id?: string) {
  revalidatePath(routes.contracts);
  if (id) revalidatePath(routes.contract(id));
}

/** Creates or updates a contract from the contract form. */
export async function saveContract(
  _previous: ContractResult | null,
  form: FormData,
): Promise<ContractResult> {
  const t = fr.contracts.errors;
  const access = await requireApproved();
  if (
    !access.organizationId ||
    !access.personId ||
    !can(access, "manage_contracts")
  )
    return { ok: false, error: t.forbidden };

  const parsed = contractSchema.safeParse({
    id: form.get("id") || undefined,
    title: form.get("title") ?? "",
    type: form.get("type"),
    ownerPersonId: form.get("ownerPersonId") ?? "",
    projectId: form.get("projectId") ?? "",
    artistId: form.get("artistId") ?? "",
    dueOn: form.get("dueOn") ?? "",
    startsOn: form.get("startsOn") ?? "",
    endsOn: form.get("endsOn") ?? "",
    notes: form.get("notes") ?? "",
  });
  if (!parsed.success) {
    const path = parsed.error.issues[0]?.path[0];
    if (path === "endsOn")
      return { ok: false, error: t.dates, field: "endsOn" };
    if (path === "title")
      return { ok: false, error: t.invalid, field: "title" };
    return { ok: false, error: t.invalid };
  }
  const { id, ...values } = parsed.data;
  const row = {
    title: values.title,
    type: values.type,
    // Anyone but the direction follows their own contracts.
    owner_person_id: values.ownerPersonId || access.personId,
    project_id: values.projectId,
    artist_id: values.artistId,
    due_on: values.dueOn,
    starts_on: values.startsOn,
    ends_on: values.endsOn,
    notes: values.notes,
  };

  const supabase = await createClient();
  const { data, error } = id
    ? await supabase
        .from("contracts")
        .update(row)
        .eq("id", id)
        .select("id")
        .maybeSingle()
    : await supabase
        .from("contracts")
        .insert({ ...row, organization_id: access.organizationId })
        .select("id")
        .single();
  if (error || !data) {
    if (error?.message.includes("contract_owner_not_allowed"))
      return { ok: false, error: t.owner };
    if (error) console.error("saveContract:", error.message);
    return { ok: false, error: id ? t.forbidden : t.failed };
  }
  refresh(data.id);
  // A new contract opens on its page (redirected here: see saveNetworkContact).
  if (!id) redirect(routes.contract(data.id));
  return { ok: true, id: data.id };
}

/** What the edit modal needs, read when it opens. Null: not editable. */
export async function loadContractEdit(id: string): Promise<{
  contract: ContractValues;
  options: ContractFormOptions;
} | null> {
  const access = await requireApproved();
  if (!z.uuid().safeParse(id).success) return null;
  const [contract, options] = await Promise.all([
    getContract(id, access),
    loadContractFormOptions(access),
  ]);
  if (!contract?.can.edit) return null;
  return {
    contract: {
      id: contract.id,
      title: contract.title,
      type: contract.type,
      ownerPersonId: contract.ownerPersonId,
      projectId: contract.projectId,
      artistId: contract.artistId,
      dueOn: contract.dueOn,
      startsOn: contract.startsOn,
      endsOn: contract.endsOn,
      notes: contract.notes,
    },
    options,
  };
}

/** The form's choices alone, for "Nouveau contrat". */
export async function loadContractOptions(): Promise<ContractFormOptions> {
  return loadContractFormOptions(await requireApproved());
}

const partySchema = z.object({
  contractId: z.uuid(),
  contactId: z.uuid(),
  role: z
    .string()
    .trim()
    .max(80)
    .transform((value) => value || null),
});

export async function addContractParty(
  input: z.input<typeof partySchema>,
): Promise<Result> {
  const t = fr.contracts.parties;
  const access = await requireApproved();
  const parsed = partySchema.safeParse(input);
  if (!parsed.success || !access.organizationId)
    return { ok: false, error: t.failed };
  const supabase = await createClient();
  const { error } = await supabase.from("contract_parties").insert({
    contract_id: parsed.data.contractId,
    organization_id: access.organizationId,
    contact_id: parsed.data.contactId,
    role: parsed.data.role,
  });
  if (error) {
    console.error("addContractParty:", error.message);
    return { ok: false, error: t.failed };
  }
  refresh(parsed.data.contractId);
  return { ok: true };
}

export async function removeContractParty(
  contractId: string,
  contactId: string,
): Promise<Result> {
  const t = fr.contracts.parties;
  await requireApproved();
  if (
    !z.uuid().safeParse(contractId).success ||
    !z.uuid().safeParse(contactId).success
  )
    return { ok: false, error: t.failed };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contract_parties")
    .delete()
    .eq("contract_id", contractId)
    .eq("contact_id", contactId)
    .select("contact_id");
  if (error || !data?.length) {
    if (error) console.error("removeContractParty:", error.message);
    return { ok: false, error: t.failed };
  }
  refresh(contractId);
  return { ok: true };
}

const advanceSchema = z.object({
  contractId: z.uuid(),
  action: z.enum(CONTRACT_ACTIONS),
  comment: z.string().trim().max(2000).optional(),
  signedOn: z.iso.date().optional(),
});

/** Moves a contract one step (SQL advance_contract decides). */
export async function advanceContract(input: {
  contractId: string;
  action: ContractAction;
  comment?: string;
  signedOn?: string;
}): Promise<Result> {
  const t = fr.contracts.errors;
  await requireApproved();
  const parsed = advanceSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: t.invalid };
  const { contractId, action, comment, signedOn } = parsed.data;
  if (action === "request_changes" && !comment)
    return { ok: false, error: t.comment };

  const supabase = await createClient();
  const { error } = await supabase.rpc("advance_contract", {
    p_contract_id: contractId,
    p_action: action,
    p_comment: comment || undefined,
    p_signed_on: signedOn,
  });
  if (error) {
    const message = error.message ?? "";
    if (message.includes("contract_comment_required"))
      return { ok: false, error: t.comment };
    if (message.includes("contract_signed_on_invalid"))
      return { ok: false, error: t.signedOn };
    if (message.includes("contract_wrong_status"))
      return { ok: false, error: t.status };
    if (error.code === "42501") return { ok: false, error: t.forbidden };
    console.error("advanceContract:", message);
    return { ok: false, error: t.failed };
  }
  // The director or the owner is notified (written by advance_contract).
  await schedulePendingPushes();
  refresh(contractId);
  return { ok: true };
}
