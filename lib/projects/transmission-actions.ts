"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { databaseErrorMessage } from "@/lib/auth/errors";
import type { FormState } from "@/lib/auth/form-state";
import { routes } from "@/lib/auth/redirects";
import { parseForm, retainedValues } from "@/lib/auth/schemas";
import { fr } from "@/lib/i18n/fr";
import { schedulePendingPushes } from "@/lib/notifications/push";
import { createClient } from "@/lib/supabase/server";

// Both calls go through SQL functions (transmit_project,
// respond_to_assignment): they check who may act and change the states. The
// code only validates input and translates refusals.

const te = fr.transmission.errors;

// Refusals raised by the functions carry their name in the message.
const REFUSALS: Array<[needle: string, message: string]> = [
  ["invalid_assignee", te.invalidAssignee],
  ["assignment_pending", te.pending],
  ["project_already_launched", te.launched],
  ["assignment_closed", te.closed],
  ["response_required", te.responseRequired],
];

function refusalMessage(error: { code?: string; message: string }): string {
  for (const [needle, message] of REFUSALS) {
    if (error.message.includes(needle)) return message;
  }
  return databaseErrorMessage(error);
}

const optionalMessage = z
  .string()
  .trim()
  .max(5000, { error: fr.auth.errors.tooLong })
  .optional()
  .transform((value) => value || null);

const transmitSchema = z.object({
  projectId: z.uuid(),
  assigneePersonId: z.uuid({ error: te.assigneeRequired }),
  note: optionalMessage,
});

export async function transmitProject(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireApproved();
  const parsed = parseForm(transmitSchema, formData);
  if (!parsed.ok) {
    return {
      status: "error",
      fieldErrors: parsed.fieldErrors,
      formError: parsed.formError,
      values: parsed.values,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("transmit_project", {
    p_project_id: parsed.data.projectId,
    p_assignee_person_id: parsed.data.assigneePersonId,
    p_note: parsed.data.note ?? undefined,
  });
  if (error) {
    console.error("transmitProject:", error.message);
    return {
      status: "error",
      formError: refusalMessage(error),
      values: retainedValues(formData),
    };
  }

  // The other side is notified by a database trigger; the push leaves after.
  await schedulePendingPushes();
  revalidatePath(routes.app, "layout");
  return { status: "success" };
}

const respondSchema = z
  .object({
    assignmentId: z.uuid(),
    decision: z.enum(["accepted", "refused", "clarification_requested"]),
    response: optionalMessage,
  })
  .superRefine((data, ctx) => {
    if (data.decision !== "accepted" && !data.response) {
      ctx.addIssue({
        code: "custom",
        path: ["response"],
        message: te.responseRequired,
      });
    }
  });

export async function respondToAssignment(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireApproved();
  const parsed = parseForm(respondSchema, formData);
  if (!parsed.ok) {
    return {
      status: "error",
      fieldErrors: parsed.fieldErrors,
      formError: parsed.formError,
      values: parsed.values,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("respond_to_assignment", {
    p_assignment_id: parsed.data.assignmentId,
    p_decision: parsed.data.decision,
    p_response: parsed.data.response ?? undefined,
  });
  if (error) {
    console.error("respondToAssignment:", error.message);
    return {
      status: "error",
      formError: refusalMessage(error),
      values: retainedValues(formData),
    };
  }

  // The other side is notified by a database trigger; the push leaves after.
  await schedulePendingPushes();
  revalidatePath(routes.app, "layout");
  // Refused or questioned, the project is no longer the manager's to see
  // (RLS): staying on its page ended on a 404 (UX test of 09/10/2026). They
  // go to their Travail, which says where their answer went.
  if (parsed.data.decision !== "accepted")
    redirect(`${routes.work}?responded=${parsed.data.decision}`);
  return { status: "success" };
}
