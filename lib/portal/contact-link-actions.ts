"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { createClient } from "@/lib/supabase/server";
import type { WriteResult } from "@/lib/utils/write-result";

// The person's page by project (lot 11), from « Liens privés »: create (or
// replace) the link, say it was sent, revoke it with a reason. Written by
// the database functions, which check that the user owns the project.

const t = fr.contactLinks;
const ids = z.object({ projectId: z.uuid(), id: z.uuid() });

function failed(where: string, error: { code?: string; message: string }) {
  console.error(`${where}:`, error.code, error.message);
  return {
    ok: false as const,
    error:
      error.code === "42501"
        ? t.errors.forbidden
        : error.message.includes("reason_required")
          ? t.errors.reason
          : t.errors.failed,
  };
}

/** « Créer le lien » / « Nouveau lien »: the former stops working. */
export async function issueContactLink(
  projectId: string,
  contactId: string,
): Promise<WriteResult> {
  const input = z
    .object({ projectId: z.uuid(), contactId: z.uuid() })
    .safeParse({ projectId, contactId });
  if (!input.success) return { ok: false, error: t.errors.failed };
  await requireApproved();
  const supabase = await createClient();
  const { error } = await supabase.rpc("issue_contact_link", {
    p_project_id: input.data.projectId,
    p_contact_id: input.data.contactId,
  });
  if (error) return failed("issueContactLink", error);
  revalidatePath(routes.project(input.data.projectId), "layout");
  return { ok: true };
}

/** « Marquer comme envoyé »: PDS OS sends no e-mail itself. */
export async function markContactLinkSent(
  projectId: string,
  id: string,
): Promise<WriteResult> {
  const input = ids.safeParse({ projectId, id });
  if (!input.success) return { ok: false, error: t.errors.failed };
  await requireApproved();
  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_contact_link_sent", {
    p_link_id: input.data.id,
  });
  if (error) return failed("markContactLinkSent", error);
  revalidatePath(routes.project(input.data.projectId), "layout");
  return { ok: true };
}

/** « Révoquer le lien », with why (rule 6): it stops working at once. */
export async function revokeContactLink(
  projectId: string,
  id: string,
  reason: string,
): Promise<WriteResult> {
  const input = ids
    .extend({ reason: z.string().trim().min(1).max(1000) })
    .safeParse({ projectId, id, reason });
  if (!input.success) return { ok: false, error: t.errors.reason };
  await requireApproved();
  const supabase = await createClient();
  const { error } = await supabase.rpc("revoke_contact_link", {
    p_link_id: input.data.id,
    p_reason: input.data.reason,
  });
  if (error) return failed("revokeContactLink", error);
  revalidatePath(routes.project(input.data.projectId), "layout");
  return { ok: true };
}
