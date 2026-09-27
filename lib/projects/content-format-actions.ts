"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import type { FieldErrors, FormValues } from "@/lib/auth/form-state";
import { databaseErrorMessage } from "@/lib/auth/errors";
import { routes } from "@/lib/auth/redirects";
import { parseForm, retainedValues } from "@/lib/auth/schemas";
import { fr } from "@/lib/i18n/fr";
import type { ContentFormatOption } from "@/lib/projects/types";
import { createClient } from "@/lib/supabase/server";

const UNIQUE_VIOLATION = "23505";

export type CreateContentFormatState =
  | { status: "idle" }
  | {
      status: "error";
      formError?: string;
      fieldErrors?: FieldErrors;
      values?: FormValues;
    }
  | { status: "created"; format: ContentFormatOption };

const e = fr.auth.errors;

const contentFormatSchema = z.object({
  name: z
    .string({ error: e.required })
    .trim()
    .min(1, { error: e.required })
    .max(120, { error: e.tooLong }),
  description: z
    .string()
    .trim()
    .max(2000, { error: e.tooLong })
    .optional()
    .transform((value) => value || null),
});

// A reusable content format ("PDS Mic"), created from the project form with
// the user's session: RLS (create_projects) decides. Handed back to the form,
// which selects it.
export async function createContentFormat(
  _previous: CreateContentFormatState,
  formData: FormData,
): Promise<CreateContentFormatState> {
  const access = await requireApproved();
  if (!access.organizationId || !can(access, "create_projects")) {
    return { status: "error", formError: e.forbidden };
  }

  const values = retainedValues(formData);
  const parsed = parseForm(contentFormatSchema, formData);
  if (!parsed.ok) {
    return {
      status: "error",
      fieldErrors: parsed.fieldErrors,
      formError: parsed.formError,
      values,
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("content_formats")
    .insert({
      organization_id: access.organizationId,
      name: parsed.data.name,
      description: parsed.data.description,
    })
    .select("id, name, description")
    .single();

  if (error || !data) {
    if (error?.code === UNIQUE_VIOLATION) {
      return {
        status: "error",
        fieldErrors: { name: fr.shell.newProject.contentFormatForm.nameTaken },
        values,
      };
    }
    console.error("createContentFormat:", error?.message);
    return { status: "error", formError: databaseErrorMessage(error), values };
  }

  revalidatePath(routes.projectsNew);
  return { status: "created", format: data };
}
