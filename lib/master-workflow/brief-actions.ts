"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import type { FieldErrors, FormState, FormValues } from "@/lib/auth/form-state";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import {
  BRIEF_DATES,
  briefDeliverablesOf,
  type BriefDate,
} from "@/lib/master-workflow/brief-types";
import { writeBrief } from "@/lib/master-workflow/brief-row";
import {
  calendarInOrder,
  calendarOrderErrors,
  isIsoDate,
} from "@/lib/master-workflow/calendar";
import { parseEurosToCents } from "@/lib/projects/schemas";
import { createClient } from "@/lib/supabase/server";

const MAX_TEXT = 2000;
// What a select submits for "Pas encore choisi".
const NONE = "none";

const idOrNone = z
  .string()
  .optional()
  .transform((value) => (!value || value === NONE ? null : value))
  .pipe(z.uuid().nullable());

const text = (value: FormDataEntryValue | null) => {
  const trimmed = String(value ?? "").trim();
  return trimmed === "" ? null : trimmed;
};

const TEXT_FIELDS = [
  "references",
  "direction",
  "constraints",
  "message",
] as const;

/**
 * Saves the Brief Mix/Master of a project (one per project, created on the
 * first save). Written with the user's session: the database lets only the
 * project's owner write, checks the contacts, the validator, the
 * deliverables and the calendar's order; the checks here give each field its
 * message first.
 */
export async function saveMasterBrief(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const t = fr.masterWorkflow.brief.errors;
  const values: FormValues = Object.fromEntries(
    [...formData.entries()].map(([key, value]) => [key, String(value)]),
  );
  const fail = (fieldErrors: FieldErrors, formError?: string): FormState => ({
    status: "error",
    fieldErrors,
    formError,
    values,
  });

  const access = await requireApproved();
  const ids = z
    .object({
      projectId: z.uuid(),
      mixContactId: idOrNone,
      masteringContactId: idOrNone,
      validatorPersonId: idOrNone,
    })
    .safeParse({
      projectId: formData.get("projectId"),
      mixContactId: formData.get("mixContactId") ?? undefined,
      masteringContactId: formData.get("masteringContactId") ?? undefined,
      validatorPersonId: formData.get("validatorPersonId") ?? undefined,
    });
  if (!ids.success || !access.organizationId) return fail({}, t.failed);

  const errors: FieldErrors = {};
  const rates = {
    mixRate: parseEurosToCents(String(formData.get("mixRate") ?? "")),
    masteringRate: parseEurosToCents(
      String(formData.get("masteringRate") ?? ""),
    ),
  };
  for (const [field, cents] of Object.entries(rates))
    if (cents === undefined) errors[field] = t.amount;

  const revisionsRaw = String(formData.get("revisions") ?? "").trim();
  const revisions = revisionsRaw === "" ? null : Number(revisionsRaw);
  if (
    revisions !== null &&
    !(Number.isInteger(revisions) && revisions >= 0 && revisions <= 20)
  )
    errors.revisions = t.revisions;

  for (const field of TEXT_FIELDS)
    if ((text(formData.get(field))?.length ?? 0) > MAX_TEXT)
      errors[field] = t.tooLong;
  if ((text(formData.get("formats"))?.length ?? 0) > 500)
    errors.formats = t.tooLong;

  const dates = Object.fromEntries(
    BRIEF_DATES.map((field) => [field, text(formData.get(field))]),
  ) as Record<BriefDate, string | null>;
  for (const field of BRIEF_DATES) {
    const date = dates[field];
    if (date && !isIsoDate(date)) errors[field] = t.date;
  }
  if (Object.keys(errors).length > 0) return fail(errors);
  // Said on the date that breaks the order (PROJ-BUG-07), as the form does.
  const order = calendarOrderErrors(dates);
  if (!calendarInOrder(dates))
    return fail(
      Object.fromEntries(
        Object.entries(order).map(([field, after]) => [
          field,
          fr.masterWorkflow.brief.orderError(
            fr.masterWorkflow.brief.fields[after],
          ),
        ]),
      ),
    );

  let deliverables: string[] = [];
  try {
    const parsed: unknown = JSON.parse(
      String(formData.get("deliverables") || "[]"),
    );
    if (Array.isArray(parsed)) deliverables = parsed.map(String);
  } catch {
    // An unreadable list keeps none; the form always sends JSON.
  }

  const same = formData.get("masteringSameEngineer") === "1";
  const { projectId } = ids.data;
  const supabase = await createClient();
  const fields = {
    mix_contact_id: ids.data.mixContactId,
    mastering_same_engineer: same,
    mastering_contact_id: same ? null : ids.data.masteringContactId,
    mix_rate_cents: rates.mixRate ?? null,
    mastering_rate_cents: rates.masteringRate ?? null,
    revisions,
    validator_person_id: ids.data.validatorPersonId,
    references_text: text(formData.get("references")),
    direction: text(formData.get("direction")),
    constraints_text: text(formData.get("constraints")),
    delivery_formats: text(formData.get("formats")),
    engineer_message: text(formData.get("message")),
    deliverables: briefDeliverablesOf(deliverables),
    mix_v1_due: dates.mixV1Due,
    mix_final_due: dates.mixFinalDue,
    mastering_due: dates.masteringDue,
    master_final_due: dates.masterFinalDue,
  };
  const error = await writeBrief(
    supabase,
    access.organizationId,
    projectId,
    fields,
  );
  if (error) {
    console.error("saveMasterBrief:", error.code, error.message);
    if (error.code === "42501") return fail({}, t.forbidden);
    if (error.message.includes("validator_not_in_project"))
      return fail({ validatorPersonId: t.validator });
    if (error.message.includes("master_briefs_calendar_order"))
      return fail({ calendar: t.calendar });
    return fail({}, t.failed);
  }
  revalidatePath(routes.projectMasterStep(projectId, "brief"));
  return { status: "success" };
}
