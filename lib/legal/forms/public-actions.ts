"use server";

import { z } from "zod";

import { fr } from "@/lib/i18n/fr";
import { LEGAL_FORM_VERSION } from "@/lib/legal/forms/definition";
import { checkSubmission, submissionSchema } from "@/lib/legal/forms/schema";
import { createClient } from "@/lib/supabase/server";

export type SubmitFormResult =
  | { ok: true; status: "complete" | "action_required" }
  | { ok: false; error: string; missing?: string[]; invalid?: string[] };

const TOKEN = z.string().regex(/^[0-9a-f]{64}$/);

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
    p_token: parsedToken.data,
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
