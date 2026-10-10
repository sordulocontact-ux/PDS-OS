"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { catalogIdSchema } from "@/lib/catalog/schemas";
import { todayInParis } from "@/lib/contracts/types";
import { fr } from "@/lib/i18n/fr";
import { schedulePendingPushes } from "@/lib/notifications/push";
import {
  CLEARANCE_PATH,
  HOLDER_ROLES,
  RIGHT_KINDS,
  SCOPES,
  rightsOf,
  type Scope,
} from "@/lib/legal/clearance/matrix";
import { run, type ClearanceResult } from "@/lib/legal/clearance/run";
import { createClient } from "@/lib/supabase/server";

// The borrowing in three moments (Demander · Négocier · Signer, Sacha's
// prototype of 07/10/2026): each button of the panel is one of these
// actions, which chains the ticket's states through the same SQL
// functions as before (each checks what its state needs). Nothing here
// decides for the person: every chain starts from a click.

type Supabase = Awaited<ReturnType<typeof createClient>>;
const ids = { projectId: catalogIdSchema, clearanceId: catalogIdSchema };
const failed = (): ClearanceResult => ({
  ok: false,
  error: fr.legalClearance.errors.failed,
});

// Only forward: a state already passed is never moved back to.
async function moveForward(
  supabase: Supabase,
  projectId: string,
  clearanceId: string,
  targets: Array<(typeof CLEARANCE_PATH)[number]>,
): Promise<ClearanceResult> {
  const { data } = await supabase
    .from("legal_clearances")
    .select("status")
    .eq("id", clearanceId)
    .maybeSingle();
  const at = CLEARANCE_PATH.indexOf(
    (data?.status ?? "") as (typeof CLEARANCE_PATH)[number],
  );
  for (const status of targets) {
    if (at >= 0 && CLEARANCE_PATH.indexOf(status) <= at) continue;
    const moved = await run(projectId, (s) =>
      s.rpc("advance_clearance", {
        p_clearance_id: clearanceId,
        p_status: status,
        p_note: null,
      }),
    );
    if (!moved.ok) return moved;
  }
  return { ok: true };
}

const holderSchema = z.object({
  right: z.enum(RIGHT_KINDS),
  name: z.string().trim().min(1).max(200),
  role: z.enum(HOLDER_ROLES),
  contactId: catalogIdSchema.nullable(),
});

const requestSchema = z.object({
  ...ids,
  scope: z.enum(SCOPES),
  // The usage the code wrote from what the dossier knows (element, work,
  // title), unless one was written before.
  usage: z.string().trim().min(1).max(2000),
  holders: z.array(holderSchema).max(4),
});

/** « J'ai envoyé la demande »: what is taken, who holds each right, the
 * request logged as sent; the borrowing waits for their answer. */
export async function requestClearance(input: z.input<typeof requestSchema>) {
  const p = requestSchema.safeParse(input);
  if (!p.success || p.data.scope === "none") return failed();
  const { projectId, clearanceId, scope, usage, holders } = p.data;
  const supabase = await createClient();
  const qualified = await run(projectId, (s) =>
    s.rpc("qualify_clearance", {
      p_clearance_id: clearanceId,
      p_usage: usage,
      p_scope: scope,
      p_reason: null,
      p_responsible: null,
    }),
  );
  if (!qualified.ok) return qualified;
  for (const h of holders.filter((x) => rightsOf(scope).includes(x.right))) {
    const added = await run(projectId, (s) =>
      s.rpc("add_clearance_rightsholder", {
        p_clearance_id: clearanceId,
        p_right: h.right,
        p_name: h.name,
        p_role: h.role,
        p_contact_id: h.contactId,
      }),
    );
    if (!added.ok) return added;
  }
  // Named first: the request is logged only once every right has its
  // holder (the refusal says which one lacks).
  const identified = await moveForward(supabase, projectId, clearanceId, [
    "rightsholders_identified",
  ]);
  if (!identified.ok) return identified;
  const names = holders.map((h) => h.name).join(", ");
  const logged = await run(projectId, (s) =>
    s.rpc("log_clearance_communication", {
      p_clearance_id: clearanceId,
      p_kind: "message",
      p_direction: "out",
      p_body: fr.legalClearance.flow.requestLog(names),
      p_occurred_at: null,
    }),
  );
  if (!logged.ok) return logged;
  return moveForward(supabase, projectId, clearanceId, ["contacted"]);
}

const nothingSchema = z.object({
  ...ids,
  usage: z.string().trim().min(1).max(2000),
  reason: z.string().trim().min(1).max(2000),
});

/** « Rien à sécuriser », with its reason: the borrowing is closed. */
export async function declareNothingToSecure(
  input: z.input<typeof nothingSchema>,
) {
  const p = nothingSchema.safeParse(input);
  if (!p.success)
    return { ok: false as const, error: fr.legalClearance.errors.reason };
  const qualified = await run(p.data.projectId, (s) =>
    s.rpc("qualify_clearance", {
      p_clearance_id: p.data.clearanceId,
      p_usage: p.data.usage,
      p_scope: "none" satisfies Scope,
      p_reason: p.data.reason,
      p_responsible: null,
    }),
  );
  if (!qualified.ok) return qualified;
  return run(p.data.projectId, (s) =>
    s.rpc("advance_clearance", {
      p_clearance_id: p.data.clearanceId,
      p_status: "cleared",
      p_note: null,
    }),
  );
}

const replySchema = z.object({
  ...ids,
  body: z.string().trim().min(1).max(8000),
  // One line per right (the work, the recording), or one without right.
  terms: z
    .array(
      z.object({
        right: z.enum(["work", "master"]).nullable(),
        amountCents: z.number().int().min(0).max(100_000_000).nullable(),
        share: z.string().trim().max(200),
        credits: z.string().trim().max(500),
        territory: z.string().trim().max(200),
        duration: z.string().trim().max(200),
      }),
    )
    .min(1)
    .max(4),
});

/** « Envoyer à la direction »: their answer kept in the journal, the
 * conditions read in it (and corrected by the person) proposed to the
 * direction — proposed only, nothing binds PDS before its validation. */
export async function submitClearanceReply(input: z.input<typeof replySchema>) {
  const p = replySchema.safeParse(input);
  if (!p.success) return failed();
  const { projectId, clearanceId, body, terms } = p.data;
  const supabase = await createClient();
  const access = await requireApproved();
  if (!can(access, "manage_legal"))
    return { ok: false as const, error: fr.auth.errors.forbidden };
  const { data: communicationId, error } = await supabase.rpc(
    "log_clearance_communication",
    {
      p_clearance_id: clearanceId,
      p_kind: "message",
      p_direction: "in",
      p_body: body,
      p_occurred_at: null,
    },
  );
  if (error || !communicationId) {
    if (error) console.error("submitClearanceReply:", error.message);
    return failed();
  }
  for (const line of terms) {
    const proposed = await run(projectId, (s) =>
      s.rpc("propose_clearance_terms", {
        p_clearance_id: clearanceId,
        p_communication_id: communicationId,
        p_terms: {
          right: line.right ?? "",
          amount_cents: line.amountCents,
          share: line.share,
          credits: line.credits,
          territory: line.territory,
          duration: line.duration,
          other: "",
        },
      }),
    );
    if (!proposed.ok) return proposed;
  }
  // The direction is notified (written by the terms' trigger).
  await schedulePendingPushes();
  return moveForward(supabase, projectId, clearanceId, ["negotiating"]);
}

const refusalSchema = z.object({
  ...ids,
  body: z.string().trim().min(1).max(8000),
});

/** « Enregistrer le refus »: their answer kept, the borrowing refused
 * (it blocks the title as it stands). */
export async function recordClearanceRefusal(
  input: z.input<typeof refusalSchema>,
) {
  const p = refusalSchema.safeParse(input);
  if (!p.success) return failed();
  const logged = await run(p.data.projectId, (s) =>
    s.rpc("log_clearance_communication", {
      p_clearance_id: p.data.clearanceId,
      p_kind: "message",
      p_direction: "in",
      p_body: p.data.body,
      p_occurred_at: null,
    }),
  );
  if (!logged.ok) return logged;
  return run(p.data.projectId, (s) =>
    s.rpc("advance_clearance", {
      p_clearance_id: p.data.clearanceId,
      p_status: "refused",
      p_note: p.data.body.slice(0, 2000),
    }),
  );
}

// Every line of conditions waiting for the direction, decided at once.
const termsSchema = z.object({
  ...ids,
  termsIds: z.array(catalogIdSchema).min(1).max(4),
});

/**
 * « Valider les conditions » (the direction). Validating the conditions is
 * validating the agreement: the same click prepares its contract — one
 * contract for the borrowing, followed by its responsible, with the rights
 * holders as parties, attached to each concerned right, submitted and
 * approved — so the responsible only has to send it. Decision of
 * 07/10/2026 (docs/ARCHITECTURE.md § 8 sexies): the direction gives one
 * approval instead of two.
 */
export async function validateClearanceTerms(
  input: z.input<typeof termsSchema>,
) {
  const p = termsSchema.safeParse(input);
  if (!p.success) return failed();
  const { projectId, clearanceId, termsIds } = p.data;
  const access = await requireApproved();
  if (!access.organizationId || !can(access, "validate"))
    return {
      ok: false as const,
      error: fr.legalClearance.errors.termsNotAllowed,
    };
  const supabase = await createClient();
  for (const termsId of termsIds) {
    const decided = await run(projectId, (s) =>
      s.rpc("decide_clearance_terms", { p_terms_id: termsId, p_accept: true }),
    );
    if (!decided.ok) return decided;
  }
  // The responsible is notified (written by the terms' trigger).
  await schedulePendingPushes();
  const agreed = await moveForward(supabase, projectId, clearanceId, [
    "agreement_reached",
  ]);
  if (!agreed.ok) return agreed;

  const [{ data: clearance }, { data: project }, { data: linked }] =
    await Promise.all([
      supabase
        .from("legal_clearances")
        .select("work, rights_scope, responsible_person_id")
        .eq("id", clearanceId)
        .maybeSingle(),
      supabase
        .from("projects")
        .select("owner_person_id")
        .eq("id", projectId)
        .maybeSingle(),
      supabase
        .from("legal_clearance_contracts")
        .select("right")
        .eq("clearance_id", clearanceId),
    ]);
  if (!clearance) return failed();
  const rights = rightsOf(clearance.rights_scope as Scope);
  const missing = rights.filter(
    (right) => !(linked ?? []).some((row) => row.right === right),
  );
  if (missing.length > 0) {
    // Followed by the borrowing's responsible, else the project's owner
    // (the contract's owner must hold manage_contracts: the trigger says).
    const owners = [
      clearance.responsible_person_id,
      project?.owner_person_id,
      access.personId,
    ].filter((id, i, all): id is string => !!id && all.indexOf(id) === i);
    let contractId: string | null = null;
    for (const owner of owners) {
      const { data } = await supabase
        .from("contracts")
        .insert({
          organization_id: access.organizationId,
          title: fr.legalClearance.flow.contractTitle(clearance.work),
          type: "license",
          owner_person_id: owner,
          project_id: projectId,
          notes: fr.legalClearance.flow.contractNotes,
        })
        .select("id")
        .maybeSingle();
      if (data) {
        contractId = data.id;
        break;
      }
    }
    if (!contractId) return failed();
    const { data: holders } = await supabase
      .from("legal_clearance_rightsholders")
      .select("contact_id")
      .eq("clearance_id", clearanceId)
      .not("contact_id", "is", null);
    const contacts = [...new Set((holders ?? []).map((h) => h.contact_id))];
    for (const contactId of contacts) {
      if (!contactId) continue;
      await supabase.from("contract_parties").insert({
        contract_id: contractId,
        organization_id: access.organizationId,
        contact_id: contactId,
        role: null,
      });
    }
    for (const right of missing) {
      const link = await run(projectId, (s) =>
        s.rpc("link_clearance_contract", {
          p_clearance_id: clearanceId,
          p_right: right,
          p_contract_id: contractId,
        }),
      );
      if (!link.ok) return link;
    }
    for (const action of ["submit", "approve"] as const) {
      const { error } = await supabase.rpc("advance_contract", {
        p_contract_id: contractId,
        p_action: action,
      });
      if (error) {
        console.error("validateClearanceTerms contract:", error.message);
        return failed();
      }
    }
  }
  const pending = await moveForward(supabase, projectId, clearanceId, [
    "document_pending",
  ]);
  revalidatePath(routes.contracts);
  return pending;
}

/** « Demander une contre-proposition » (the direction): the conditions
 * refused; the borrowing waits for their next answer. */
export async function counterClearanceTerms(
  input: z.input<typeof termsSchema>,
) {
  const p = termsSchema.safeParse(input);
  if (!p.success) return failed();
  for (const termsId of p.data.termsIds) {
    const decided = await run(p.data.projectId, (s) =>
      s.rpc("decide_clearance_terms", {
        p_terms_id: termsId,
        p_accept: false,
      }),
    );
    if (!decided.ok) return decided;
  }
  await schedulePendingPushes();
  return { ok: true as const };
}

// The contracts of a borrowing, once each.
async function contractsOf(supabase: Supabase, clearanceId: string) {
  const { data: links } = await supabase
    .from("legal_clearance_contracts")
    .select("contract_id")
    .eq("clearance_id", clearanceId);
  const ids = [...new Set((links ?? []).map((row) => row.contract_id))];
  if (ids.length === 0) return new Map<string, string>();
  const { data } = await supabase
    .from("contracts")
    .select("id, status")
    .in("id", ids);
  return new Map((data ?? []).map((row) => [row.id, row.status]));
}

const sendSchema = z.object({
  ...ids,
  how: z.string().trim().min(1).max(200),
});

/** « Envoyé par e-mail » (or another way): the way it went is its proof of
 * sending; the borrowing then waits for the signed copy. */
export async function sendClearanceContract(input: z.input<typeof sendSchema>) {
  const p = sendSchema.safeParse(input);
  if (!p.success) return failed();
  await requireApproved();
  const supabase = await createClient();
  for (const [contractId, status] of await contractsOf(
    supabase,
    p.data.clearanceId,
  )) {
    if (status !== "approved") continue;
    const { error } = await supabase.rpc("advance_contract", {
      p_contract_id: contractId,
      p_action: "send",
      p_comment: p.data.how,
    });
    if (error) {
      console.error("sendClearanceContract:", error.message);
      return failed();
    }
  }
  revalidatePath(routes.projectLegal(p.data.projectId), "layout");
  return { ok: true as const };
}

/** « Marquer comme sécurisé »: the contract signed today (its signed copy
 * and proof are in its files), then the borrowing signed and secured —
 * the ticket's « Document signé + preuve suffisante : SIGNED puis
 * CLEARED ». */
export async function secureClearanceFlow(
  projectId: string,
  clearanceId: string,
) {
  const p = z.object(ids).safeParse({ projectId, clearanceId });
  if (!p.success) return failed();
  await requireApproved();
  const supabase = await createClient();
  for (const [contractId, status] of await contractsOf(
    supabase,
    p.data.clearanceId,
  )) {
    if (status !== "approved" && status !== "sent") continue;
    const { error } = await supabase.rpc("advance_contract", {
      p_contract_id: contractId,
      p_action: "sign",
      p_signed_on: todayInParis(new Date()),
    });
    if (error) {
      console.error("secureClearanceFlow:", error.message);
      return failed();
    }
  }
  return moveForward(supabase, p.data.projectId, p.data.clearanceId, [
    "document_pending",
    "signed",
    "cleared",
  ]);
}
