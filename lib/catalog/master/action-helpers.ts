import "server-only";

import { revalidatePath } from "next/cache";
import type { z } from "zod";

import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { databaseErrorMessage } from "@/lib/auth/errors";
import { routes } from "@/lib/auth/redirects";
import { parseForm, retainedValues } from "@/lib/auth/schemas";
import type { MasterFormState } from "@/lib/catalog/master/rules";
import { fr } from "@/lib/i18n/fr";

// Shared by the master page actions: every write runs with the user's
// session (RLS: manage_catalog, live master); the permission check here only
// gives a clean message.

/** The organization of a viewer allowed to edit the catalog, else null. */
export async function catalogOrganization(): Promise<string | null> {
  const access = await requireApproved();
  return access.organizationId && can(access, "manage_catalog")
    ? access.organizationId
    : null;
}

/** Every tab of the master reads what changed (overview, activity…). */
export function refreshMaster(masterId: string) {
  revalidatePath(routes.master(masterId), "layout");
}

/** Parses a form for a catalog editor, or says why it cannot be saved. */
export async function parseMasterForm<T extends z.ZodType>(
  schema: T,
  formData: FormData,
): Promise<
  | { ok: true; organizationId: string; data: z.output<T> }
  | { ok: false; state: MasterFormState }
> {
  const organizationId = await catalogOrganization();
  if (!organizationId)
    return {
      ok: false,
      state: { status: "error", formError: fr.auth.errors.forbidden },
    };
  const parsed = parseForm(schema, formData);
  if (!parsed.ok)
    return {
      ok: false,
      state: {
        status: "error",
        fieldErrors: parsed.fieldErrors,
        formError: parsed.formError,
        values: parsed.values,
      },
    };
  return { ok: true, organizationId, data: parsed.data };
}

/** The state after a write: saved (and the pages refreshed), or the error. */
export function afterWrite(
  scope: string,
  masterId: string,
  formData: FormData,
  error: { code?: string; message: string } | null,
  message?: string,
): MasterFormState {
  if (error) {
    console.error(`${scope}:`, error.message);
    return {
      status: "error",
      formError: message ?? databaseErrorMessage(error),
      values: retainedValues(formData),
    };
  }
  refreshMaster(masterId);
  return { status: "saved" };
}
