"use server";

import { z } from "zod";

import { catalogIdSchema } from "@/lib/catalog/schemas";
import { fr } from "@/lib/i18n/fr";
import {
  CLEARANCE_EXCEPTIONS,
  CLEARANCE_PATH,
  DIRECTIONS,
  EXCHANGE_KINDS,
  HOLDER_ROLES,
  RIGHT_KINDS,
  SCOPES,
} from "@/lib/legal/clearance/matrix";
import { run } from "@/lib/legal/clearance/run";

const ids = { projectId: catalogIdSchema, clearanceId: catalogIdSchema };

// The project's side of a clearance (ticket Juridique 05). Every write is a
// SQL function that checks manage_legal and what each state needs.

const qualifySchema = z.object({
  ...ids,
  usage: z.string().trim().min(1).max(2000),
  scope: z.enum(SCOPES),
  reason: z.string().trim().max(2000),
  responsibleId: catalogIdSchema.nullable(),
});
export async function qualifyClearance(input: z.input<typeof qualifySchema>) {
  const p = qualifySchema.safeParse(input);
  if (!p.success)
    return { ok: false as const, error: fr.legalClearance.errors.usage };
  return run(p.data.projectId, (s) =>
    s.rpc("qualify_clearance", {
      p_clearance_id: p.data.clearanceId,
      p_usage: p.data.usage,
      p_scope: p.data.scope,
      p_reason: p.data.reason || null,
      p_responsible: p.data.responsibleId,
    }),
  );
}

const holderSchema = z.object({
  ...ids,
  right: z.enum(RIGHT_KINDS),
  name: z.string().trim().min(1).max(200),
  role: z.enum(HOLDER_ROLES),
});
export async function addRightsholder(input: z.input<typeof holderSchema>) {
  const p = holderSchema.safeParse(input);
  if (!p.success)
    return { ok: false as const, error: fr.legalClearance.errors.failed };
  return run(p.data.projectId, (s) =>
    s.rpc("add_clearance_rightsholder", {
      p_clearance_id: p.data.clearanceId,
      p_right: p.data.right,
      p_name: p.data.name,
      p_role: p.data.role,
      p_contact_id: null,
    }),
  );
}

export async function removeRightsholder(projectId: string, holderId: string) {
  const p = z
    .object({ projectId: catalogIdSchema, holderId: catalogIdSchema })
    .safeParse({ projectId, holderId });
  if (!p.success)
    return { ok: false as const, error: fr.auth.errors.forbidden };
  return run(p.data.projectId, (s) =>
    s.rpc("remove_clearance_rightsholder", {
      p_rightsholder_id: p.data.holderId,
    }),
  );
}

const exchangeSchema = z.object({
  ...ids,
  kind: z.enum(EXCHANGE_KINDS),
  direction: z.enum(DIRECTIONS),
  body: z.string().trim().min(1).max(8000),
});
export async function logExchange(input: z.input<typeof exchangeSchema>) {
  const p = exchangeSchema.safeParse(input);
  if (!p.success)
    return { ok: false as const, error: fr.legalClearance.errors.failed };
  return run(p.data.projectId, (s) =>
    s.rpc("log_clearance_communication", {
      p_clearance_id: p.data.clearanceId,
      p_kind: p.data.kind,
      p_direction: p.data.direction,
      p_body: p.data.body,
      p_occurred_at: null,
    }),
  );
}

const advanceSchema = z.object({
  ...ids,
  status: z.enum([...CLEARANCE_PATH, ...CLEARANCE_EXCEPTIONS]),
  note: z.string().trim().max(2000),
});
export async function advanceClearance(input: z.input<typeof advanceSchema>) {
  const p = advanceSchema.safeParse(input);
  if (!p.success)
    return { ok: false as const, error: fr.legalClearance.errors.failed };
  return run(p.data.projectId, (s) =>
    s.rpc("advance_clearance", {
      p_clearance_id: p.data.clearanceId,
      p_status: p.data.status,
      p_note: p.data.note || null,
    }),
  );
}
