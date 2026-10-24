"use server";

import { z } from "zod";

import { fr } from "@/lib/i18n/fr";
import { LEGAL_FORM_VERSION } from "@/lib/legal/forms/definition";
import { checkSubmission, submissionSchema } from "@/lib/legal/forms/schema";
import { createClient } from "@/lib/supabase/server";
import { LINK_KEY, linkKeyArgs } from "@/lib/portal/link-key";

export type SubmitFormResult =
  | { ok: true; status: "complete" | "action_required" }
  | { ok: false; error: string; missing?: string[]; invalid?: string[] };

const TOKEN = z.string().regex(LINK_KEY);

/**
 * Sends a fiche from its public page, without an account (« Aucun compte PO
 * obligatoire pour répondre »). The answers are checked here against the
 * versioned definition, then kept by submit_legal_form, which checks the
 * token again (open, not expired, not revoked).
 */
export async function submitLegalForm(
  token: string,
  input: z.infer<typeof submissionSchema>,
): Promise<SubmitFormResult> {
  const t = fr.legalForms.public;
  const parsedToken = TOKEN.safeParse(token);
  const parsed = submissionSchema.safeParse(input);
  if (!parsedToken.success || !parsed.success)
    return { ok: false, error: t.invalid };
  const checked = checkSubmission(parsed.data);
  if (!checked.ok)
    return {
      ok: false,
      error: checked.missing.length > 0 ? t.missing : t.invalid,
      missing: checked.missing,
      invalid: checked.invalid,
    };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("submit_legal_form", {
    ...linkKeyArgs(parsedToken.data),
    p_roles: checked.roles,
    p_other_role: checked.otherRole,
    p_person: checked.person,
    p_contribution: checked.contribution,
    p_version: LEGAL_FORM_VERSION,
  });
  if (error) {
    console.error("submitLegalForm:", error.message);
    return {
      ok: false,
      error: error.message.includes("legal_form_closed") ? t.closed : t.failed,
    };
  }
  return {
    ok: true,
    status: data === "action_required" ? "action_required" : "complete",
  };
}

export type ComplementResult = { ok: true } | { ok: false; error: string };

/**
 * Sends what the team asked for (JUR-06), from the fiche's private link:
 * submit_legal_form_complement keeps only the fields asked, each filled,
 * then the fiche goes back to the team.
 */
export async function submitLegalFormComplement(
  token: string,
  values: Record<string, string>,
): Promise<ComplementResult> {
  const t = fr.legalForms.public;
  const parsedToken = TOKEN.safeParse(token);
  const parsed = z
    .record(z.string().max(40), z.string().max(2000))
    .safeParse(values);
  if (!parsedToken.success || !parsed.success)
    return { ok: false, error: t.invalid };
  if (Object.values(parsed.data).some((v) => v.trim() === ""))
    return { ok: false, error: t.complement.missing };
  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_legal_form_complement", {
    ...linkKeyArgs(parsedToken.data),
    p_values: parsed.data,
  });
  if (error) {
    console.error("submitLegalFormComplement:", error.message);
    return {
      ok: false,
      error: error.message.includes("legal_form_closed")
        ? t.closed
        : error.message.includes("legal_form_invalid")
          ? t.complement.missing
          : t.failed,
    };
  }
  return { ok: true };
}
