"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { parseForm, retainedValues } from "@/lib/auth/schemas";
import { DEMO_STATUSES } from "@/lib/catalog/demo-rules";
import type { MasterFormState } from "@/lib/catalog/master/rules";
import { auth } from "@/lib/i18n/fr/auth";
import { demos } from "@/lib/i18n/fr/demos";
import { createClient } from "@/lib/supabase/server";

const fr = { auth, demos };
const e = fr.auth.errors;

// A maquette's status and the release decision (retours d'Ibé du 01 et du
// 05/11/2026). The database decides who may (set_demo_status, promote_demo);
// these only give a clean message.

const statusSchema = z.object({
  masterId: z.uuid(),
  status: z.enum(DEMO_STATUSES, { error: e.required }),
});

const promoteSchema = z.object({
  masterId: z.uuid(),
  title: z
    .string({ error: e.required })
    .trim()
    .min(1, { error: e.required })
    .max(200, { error: e.tooLong }),
});

function refresh(masterId: string) {
  revalidatePath(routes.master(masterId), "layout");
  revalidatePath(routes.masters);
  revalidatePath(routes.demos);
  revalidatePath(routes.sessions, "layout");
}

function refused(
  scope: string,
  formData: FormData,
  error: { message: string },
): MasterFormState {
  console.error(`${scope}:`, error.message);
  const m = error.message;
  return {
    status: "error",
    formError: m.includes("promote_forbidden")
      ? fr.demos.errors.promoteForbidden
      : m.includes("demo_not_validated")
        ? fr.demos.errors.notValidated
        : m.includes("demo_status_forbidden")
          ? fr.demos.errors.forbidden
          : fr.demos.errors.failed,
    values: retainedValues(formData),
  };
}

async function parsed<T extends z.ZodType>(
  schema: T,
  formData: FormData,
): Promise<
  { ok: true; data: z.output<T> } | { ok: false; state: MasterFormState }
> {
  const access = await requireApproved();
  if (!access.organizationId)
    return { ok: false, state: { status: "error", formError: e.forbidden } };
  const result = parseForm(schema, formData);
  if (!result.ok)
    return {
      ok: false,
      state: {
        status: "error",
        fieldErrors: result.fieldErrors,
        formError: result.formError,
        values: result.values,
      },
    };
  return { ok: true, data: result.data };
}

/** « Changer le statut » of a maquette. */
export async function setDemoStatus(
  _previous: MasterFormState,
  formData: FormData,
): Promise<MasterFormState> {
  const input = await parsed(statusSchema, formData);
  if (!input.ok) return input.state;
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_demo_status", {
    p_master_id: input.data.masterId,
    p_status: input.data.status,
  });
  if (error) return refused("setDemoStatus", formData, error);
  refresh(input.data.masterId);
  return { status: "saved" };
}

/** « Passer au catalogue des masters »: the release is decided. */
export async function promoteDemo(
  _previous: MasterFormState,
  formData: FormData,
): Promise<MasterFormState> {
  const access = await requireApproved();
  if (!can(access, "validate"))
    return { status: "error", formError: fr.demos.errors.promoteForbidden };
  const input = await parsed(promoteSchema, formData);
  if (!input.ok) return input.state;
  const supabase = await createClient();
  const { error } = await supabase.rpc("promote_demo", {
    p_master_id: input.data.masterId,
    p_title: input.data.title,
  });
  if (error) return refused("promoteDemo", formData, error);
  refresh(input.data.masterId);
  return { status: "saved" };
}
