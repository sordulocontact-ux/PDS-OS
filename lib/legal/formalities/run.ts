import "server-only";

import { revalidatePath } from "next/cache";

import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { formalityMissingLabel } from "@/lib/legal/formalities/definition";
import { createClient } from "@/lib/supabase/server";

// The common path of every formality action: manage_legal, the SQL
// function, its refusal in words, the refresh.

export type FormalityResult = { ok: true } | { ok: false; error: string };

type DbError = { message: string; details?: string };

function errorOf(error: DbError) {
  const t = fr.legalFormalities.errors;
  const m = error.message ?? "";
  if (m.includes("formality_missing"))
    return t.missing(
      (error.details ?? "")
        .split(",")
        .filter(Boolean)
        .map(formalityMissingLabel)
        .join(", "),
    );
  if (m.includes("formality_proof_required")) return t.proof;
  if (
    m.includes("formality_reason_required") ||
    m.includes("formality_correction_invalid")
  )
    return t.reason;
  if (m.includes("formality_iswc_invalid")) return t.iswc;
  if (m.includes("formality_closed")) return t.closed;
  if (
    m.includes("formality_not_") ||
    m.includes("formality_signature_closed") ||
    m.includes("formality_submitted")
  )
    return t.notReady;
  return t.failed;
}

export async function run(
  projectId: string,
  call: (
    supabase: Awaited<ReturnType<typeof createClient>>,
  ) => PromiseLike<{ error: DbError | null }>,
): Promise<FormalityResult> {
  const access = await requireApproved();
  if (!can(access, "manage_legal"))
    return { ok: false, error: fr.auth.errors.forbidden };
  const supabase = await createClient();
  const { error } = await call(supabase);
  if (error) {
    if (!error.message.includes("formality_"))
      console.error("formality action:", error.message);
    return { ok: false, error: errorOf(error) };
  }
  revalidatePath(routes.projectLegal(projectId), "layout");
  return { ok: true };
}
