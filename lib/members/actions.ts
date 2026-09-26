"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth/dal";
import { databaseErrorMessage } from "@/lib/auth/errors";
import { routes } from "@/lib/auth/redirects";
import { signupUrl, siteUrl } from "@/lib/auth/site-url";
import type { OrganizationRole } from "@/lib/auth/redirects";
import type { InviteState, MemberActionState } from "@/lib/members/types";
import {
  inviteMemberSchema,
  membershipDecisionSchema,
  membershipIdSchema,
  membershipRoleSchema,
  parseForm,
  personNameSchema,
  retainedValues,
} from "@/lib/auth/schemas";
import { fr } from "@/lib/i18n/fr";
import { createAnonymousClient } from "@/lib/supabase/anonymous";
import { createClient } from "@/lib/supabase/server";

// Access decisions taken from the team screen. Every request runs with the
// admin session: the database applies its rules (RLS, granted columns,
// triggers). The code only translates refusals. This "use server" file only
// exports functions: types and initial state live in lib/members/types.ts.

type MembershipPatch = {
  status?: "approved" | "rejected" | "suspended";
  role?: OrganizationRole;
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
    // Approving always sets the position: a request arrives without one.
    case "approve": {
      const parsed = parseForm(membershipRoleSchema, formData);
      if (!parsed.ok) {
        return {
          status: "error",
          error: parsed.fieldErrors.role ?? fr.auth.errors.generic,
          fieldErrors: parsed.fieldErrors,
          values: parsed.values,
        };
      }
      return patchMembership(parsed.data.membershipId, {
        status: "approved",
        role: parsed.data.role,
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

    case "cancel_invite": {
      const parsed = parseForm(membershipIdSchema, formData);
      if (!parsed.ok) return { status: "error", error: fr.auth.errors.generic };
      return patchMembership(parsed.data.membershipId, {
        status: "rejected",
        decision_note: fr.auth.members.invitationCancelledNote,
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

// Account created by the director: a Person and an invitation with the
// chosen position (SQL function invite_member, director session), then the
// auth account with its password. Confirming the address opens the access
// (at once when confirmations are off).
export async function inviteMember(
  _previous: InviteState,
  formData: FormData,
): Promise<InviteState> {
  await requireAdmin();

  const parsed = parseForm(inviteMemberSchema, formData);
  if (!parsed.ok) {
    return {
      status: "error",
      fieldErrors: parsed.fieldErrors,
      values: parsed.values,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("invite_member", {
    p_email: parsed.data.email,
    p_first_name: parsed.data.firstName,
    p_last_name: parsed.data.lastName ?? "",
    p_role: parsed.data.role,
  });

  if (error) {
    return {
      status: "error",
      error: databaseErrorMessage(error),
      values: retainedValues(formData),
    };
  }

  // The auth account itself, with the password chosen here. Public sign-up
  // endpoint on a session-less client: no service role, and the director's
  // own session is untouched. Without email confirmation (local testing) the
  // account is usable at once; with it, the person confirms first.
  const { data: signUp, error: signUpError } =
    await createAnonymousClient().auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${siteUrl()}${routes.authConfirm}`,
        data: {
          first_name: parsed.data.firstName,
          last_name: parsed.data.lastName,
        },
      },
    });

  revalidatePath(routes.members);

  if (signUpError) {
    console.error("inviteMember signUp:", signUpError.code);
    return {
      status: "error",
      error: fr.auth.errors.accountNotCreated,
      values: retainedValues(formData),
    };
  }

  return {
    status: "success",
    firstName: parsed.data.firstName,
    email: parsed.data.email,
    ready: signUp.session !== null,
    link: signupUrl(parsed.data.email),
  };
}
