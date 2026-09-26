"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth/dal";
import { databaseErrorMessage } from "@/lib/auth/errors";
import { routes } from "@/lib/auth/redirects";
import type { MemberActionState } from "@/lib/members/types";
import {
  membershipDecisionSchema,
  membershipIdSchema,
  membershipRoleSchema,
  parseForm,
  personNameSchema,
} from "@/lib/auth/schemas";
import { fr } from "@/lib/i18n/fr";
import { createClient } from "@/lib/supabase/server";

// Access decisions taken from the team screen. Every request runs with the
// admin session: the database applies its rules (RLS, granted columns,
// triggers). The code only translates refusals. This "use server" file only
// exports functions: types and initial state live in lib/members/types.ts.

type MembershipPatch = {
  status?: "approved" | "rejected" | "suspended";
  role?: "admin" | "member";
  decision_note?: string | null;
};

async function patchMembership(
  membershipId: string,
  patch: MembershipPatch,
): Promise<MemberActionState> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("memberships")
    .update(patch)
    .eq("id", membershipId)
    .select("id");

  if (error) {
    return { status: "error", error: databaseErrorMessage(error) };
  }
  // Zero rows: RLS hid the row.
  if (!data || data.length === 0) {
    return { status: "error", error: fr.auth.errors.notFound };
  }

  revalidatePath(routes.members);
  return { status: "success" };
}

export async function memberAction(
  _previous: MemberActionState,
  formData: FormData,
): Promise<MemberActionState> {
  await requireAdmin();

  const intent = formData.get("intent");

  switch (intent) {
    case "approve": {
      const parsed = parseForm(membershipIdSchema, formData);
      if (!parsed.ok) return { status: "error", error: fr.auth.errors.generic };
      return patchMembership(parsed.data.membershipId, {
        status: "approved",
        decision_note: null,
      });
    }

    case "reactivate": {
      const parsed = parseForm(membershipIdSchema, formData);
      if (!parsed.ok) return { status: "error", error: fr.auth.errors.generic };
      return patchMembership(parsed.data.membershipId, {
        status: "approved",
        decision_note: null,
      });
    }

    case "reject":
    case "suspend": {
      const parsed = parseForm(membershipDecisionSchema, formData);
      if (!parsed.ok) {
        return {
          status: "error",
          error: parsed.fieldErrors.note ?? fr.auth.errors.required,
          fieldErrors: parsed.fieldErrors,
          values: parsed.values,
        };
      }
      return patchMembership(parsed.data.membershipId, {
        status: intent === "reject" ? "rejected" : "suspended",
        decision_note: parsed.data.note,
      });
    }

    case "set_role": {
      const parsed = parseForm(membershipRoleSchema, formData);
      if (!parsed.ok) return { status: "error", error: fr.auth.errors.generic };
      return patchMembership(parsed.data.membershipId, {
        role: parsed.data.role,
      });
    }

    case "rename": {
      const parsed = parseForm(personNameSchema, formData);
      if (!parsed.ok) {
        return {
          status: "error",
          error:
            parsed.fieldErrors.firstName ??
            parsed.fieldErrors.lastName ??
            fr.auth.errors.required,
          fieldErrors: parsed.fieldErrors,
          values: parsed.values,
        };
      }
      const supabase = await createClient();
      const { data, error } = await supabase
        .from("people")
        .update({
          first_name: parsed.data.firstName,
          last_name: parsed.data.lastName,
        })
        .eq("id", parsed.data.personId)
        .select("id");

      if (error) return { status: "error", error: databaseErrorMessage(error) };
      if (!data || data.length === 0)
        return { status: "error", error: fr.auth.errors.notFound };

      revalidatePath(routes.members);
      return { status: "success" };
    }

    default:
      return { status: "error", error: fr.auth.errors.generic };
  }
}
