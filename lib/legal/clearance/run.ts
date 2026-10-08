import "server-only";

import { revalidatePath } from "next/cache";

import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { missingLabel } from "@/lib/legal/clearance/matrix";
import { createClient } from "@/lib/supabase/server";

// The common path of every clearance action: manage_legal, the SQL
// function, its refusal in words (what is missing, by name), the refresh.

export type ClearanceResult =
  { ok: true; id?: string } | { ok: false; error: string };

function errorOf(error: { message: string; code?: string; details?: string }) {
  const t = fr.legalClearance.errors;
  const m = error.message ?? "";
  if (m.includes("clearance_missing"))
    return t.missing(
      (error.details ?? "")
        .split(",")
        .filter(Boolean)
        .map(missingLabel)
        .join(", "),
    );
  if (m.includes("clearance_note_required")) return t.note;
  if (m.includes("clearance_reason_required")) return t.reason;
  if (m.includes("clearance_usage_required")) return t.usage;
  if (m.includes("clearance_terms_not_allowed")) return t.termsNotAllowed;
  if (m.includes("clearance_closed")) return t.closed;
  if (m.includes("clearance_contact_invalid")) return t.contactInvalid;
  return t.failed;
}

export async function run(
  projectId: string,
  call: (supabase: Awaited<ReturnType<typeof createClient>>) => PromiseLike<{
    data?: unknown;
    error: { message: string; code?: string; details?: string } | null;
  }>,
): Promise<ClearanceResult> {
  const access = await requireApproved();
  if (!can(access, "manage_legal"))
    return { ok: false, error: fr.auth.errors.forbidden };
  const supabase = await createClient();
  const { data, error } = await call(supabase);
  if (error) {
    if (!error.message.includes("clearance_"))
      console.error("clearance action:", error.message);
    return { ok: false, error: errorOf(error) };
  }
  revalidatePath(routes.projectLegal(projectId), "layout");
  return { ok: true, id: typeof data === "string" ? data : undefined };
}
