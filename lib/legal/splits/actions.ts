"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { siteUrl } from "@/lib/auth/site-url";
import { listMasterSplits } from "@/lib/catalog/master/queries";
import { catalogIdSchema } from "@/lib/catalog/schemas";
import { fr } from "@/lib/i18n/fr";
import { schedulePendingPushes } from "@/lib/notifications/push";
import {
  SPLIT_ROLES,
  shareOf,
  titlePublishingLines,
  unitsOf,
} from "@/lib/legal/splits/shares";
import { createClient } from "@/lib/supabase/server";

// The project's side of the split sheets (ticket Juridique 04): « Alizé crée
// ou vérifie la proposition » then « déclenche les demandes ». Every write is
// a SQL function that checks manage_legal and the exact 100 % itself.

// `email`: the person's Réseau address when the line is linked to a contact.
export type SplitLink = {
  entryId: string;
  name: string;
  // Null: the person keeps the link already sent, which opens the new
  // version (JUR-27).
  url: string | null;
  email: string | null;
};
export type SplitResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? object : { data: T }))
  | { ok: false; error: string };

const draftSchema = z.object({
  projectId: catalogIdSchema,
  masterId: catalogIdSchema,
  note: z.string().trim().max(2000),
  lines: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(200),
        role: z.enum(SPLIT_ROLES),
        share: z.string().max(12),
        contactId: catalogIdSchema.nullable(),
        creditId: catalogIdSchema.nullable(),
      }),
    )
    .min(1)
    .max(30),
});

function errorOf(message: string) {
  const t = fr.legalSplits.errors;
  if (message.includes("split_total_not_100")) return t.total;
  if (message.includes("split_contact_invalid")) return t.contactInvalid;
  if (
    message.includes("split_version_closed") ||
    message.includes("split_version_not_draft")
  )
    return t.closed;
  return t.failed;
}

/** The draft of a title's split (a new version once the last one was sent). */
export async function saveSplitDraft(
  input: z.input<typeof draftSchema>,
): Promise<SplitResult> {
  const access = await requireApproved();
  const parsed = draftSchema.safeParse(input);
  if (!can(access, "manage_legal"))
    return { ok: false, error: fr.auth.errors.forbidden };
  if (!parsed.success)
    return { ok: false, error: fr.legalSplits.editor.invalid };
  const units = parsed.data.lines.map((line) => unitsOf(line.share));
  if (units.some((u) => u === null))
    return { ok: false, error: fr.legalSplits.editor.invalid };

  const supabase = await createClient();
  const { error } = await supabase.rpc("save_split_draft", {
    p_project_id: parsed.data.projectId,
    p_master_id: parsed.data.masterId,
    p_note: parsed.data.note || null,
    p_entries: parsed.data.lines.map((line, i) => ({
      name: line.name,
      role: line.role,
      share: shareOf(units[i]!),
      contact_id: line.contactId,
      credit_id: line.creditId,
    })),
  });
  if (error) {
    console.error("saveSplitDraft:", error.message);
    return { ok: false, error: errorOf(error.message) };
  }
  revalidatePath(routes.projectLegal(parsed.data.projectId), "layout");
  return { ok: true };
}

/** « Envoyer pour confirmation »: the links, shown once. */
export async function proposeSplit(
  projectId: string,
  versionId: string,
): Promise<SplitResult<SplitLink[]>> {
  const ids = z.object({
    projectId: catalogIdSchema,
    versionId: catalogIdSchema,
  });
  const parsed = ids.safeParse({ projectId, versionId });
  const access = await requireApproved();
  if (!parsed.success || !can(access, "manage_legal"))
    return { ok: false, error: fr.auth.errors.forbidden };
  return sendVersion(parsed.data.projectId, parsed.data.versionId);
}

/**
 * « Envoyer pour confirmation » straight from the split of the title's page
 * (Sacha, 05/10/2026: no draft to save when the parts are already there).
 * The parts are reread here with the user's session, never taken from the
 * browser; then the same draft and sending as by hand.
 */
export async function proposeTitleSplit(
  projectId: string,
  masterId: string,
): Promise<SplitResult<SplitLink[]>> {
  const ids = z.object({
    projectId: catalogIdSchema,
    masterId: catalogIdSchema,
  });
  const parsed = ids.safeParse({ projectId, masterId });
  const access = await requireApproved();
  if (
    !parsed.success ||
    !can(access, "manage_legal") ||
    !can(access, "manage_catalog")
  )
    return { ok: false, error: fr.auth.errors.forbidden };
  const { splits, error: readError } = await listMasterSplits(
    parsed.data.masterId,
  );
  const lines = readError ? null : titlePublishingLines(splits);
  if (!lines) return { ok: false, error: fr.legalSplits.errors.total };

  const supabase = await createClient();
  const { data: versionId, error } = await supabase.rpc("save_split_draft", {
    p_project_id: parsed.data.projectId,
    p_master_id: parsed.data.masterId,
    p_note: null,
    p_entries: lines.map((line) => ({
      name: line.name,
      role: line.role,
      share: shareOf(line.units),
      contact_id: line.contactId,
      credit_id: null,
    })),
  });
  if (error || !versionId) {
    if (error) console.error("proposeTitleSplit:", error.message);
    return { ok: false, error: errorOf(error?.message ?? "") };
  }
  return sendVersion(parsed.data.projectId, versionId);
}

async function sendVersion(
  projectId: string,
  versionId: string,
): Promise<SplitResult<SplitLink[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("propose_split_version", {
    p_version_id: versionId,
  });
  if (error || !data) {
    if (error) console.error("proposeSplit:", error.message);
    revalidatePath(routes.projectLegal(projectId), "layout");
    return { ok: false, error: errorOf(error?.message ?? "") };
  }
  const { data: entries } = await supabase
    .from("legal_split_entries")
    .select("id, name, contact_id")
    .eq("version_id", versionId);
  const nameOf = new Map((entries ?? []).map((e) => [e.id, e.name]));
  const emails = await contactEmails(
    supabase,
    (entries ?? []).flatMap((e) => (e.contact_id ? [e.contact_id] : [])),
  );
  const emailOf = new Map(
    (entries ?? []).map((e) => [
      e.id,
      e.contact_id ? (emails.get(e.contact_id) ?? null) : null,
    ]),
  );
  await schedulePendingPushes();
  revalidatePath(routes.projectLegal(projectId), "layout");
  return {
    ok: true,
    data: data.map((row) => ({
      entryId: row.entry_id,
      name: nameOf.get(row.entry_id) ?? "",
      url: row.token ? `${siteUrl()}${routes.legalSplit(row.token)}` : null,
      email: emailOf.get(row.entry_id) ?? null,
    })),
  };
}

/** « Nouveau lien » for one person: the previous one stops working. */
export async function newSplitLink(
  projectId: string,
  entryId: string,
): Promise<SplitResult<{ url: string; email: string | null }>> {
  const ids = z.object({
    projectId: catalogIdSchema,
    entryId: catalogIdSchema,
  });
  const parsed = ids.safeParse({ projectId, entryId });
  const access = await requireApproved();
  if (!parsed.success || !can(access, "manage_legal"))
    return { ok: false, error: fr.auth.errors.forbidden };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("new_split_confirmation", {
    p_entry_id: parsed.data.entryId,
  });
  if (error || !data) {
    if (error) console.error("newSplitLink:", error.message);
    return { ok: false, error: errorOf(error?.message ?? "") };
  }
  const { data: entry } = await supabase
    .from("legal_split_entries")
    .select("contact_id")
    .eq("id", parsed.data.entryId)
    .maybeSingle();
  const emails = await contactEmails(
    supabase,
    entry?.contact_id ? [entry.contact_id] : [],
  );
  revalidatePath(routes.projectLegal(parsed.data.projectId), "layout");
  return {
    ok: true,
    data: {
      url: `${siteUrl()}${routes.legalSplit(data)}`,
      email: entry?.contact_id ? (emails.get(entry.contact_id) ?? null) : null,
    },
  };
}

// The Réseau addresses of some contacts, for a ready e-mail.
async function contactEmails(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ids: string[],
): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  const { data } = await supabase
    .from("network_contacts")
    .select("id, email")
    .in("id", ids);
  return new Map(
    (data ?? []).flatMap((c) => (c.email ? [[c.id, c.email]] : [])),
  );
}
