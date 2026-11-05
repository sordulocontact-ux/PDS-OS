"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { emailContact } from "@/lib/email/contact-email";
import { projectTitleOf } from "@/lib/email/outcome";
import { emailEnabled } from "@/lib/email/send";
import { routes } from "@/lib/auth/redirects";
import { siteUrl } from "@/lib/auth/site-url";
import { listMasterSplits } from "@/lib/catalog/master/queries";
import { catalogIdSchema } from "@/lib/catalog/schemas";
import { fr } from "@/lib/i18n/fr";
import { legalOutcome } from "@/lib/legal/outcome";
import { schedulePendingPushes } from "@/lib/notifications/push";
import { sealSplitLinks } from "@/lib/legal/splits/link-seal";
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
  // Kept sealed: the link stays visible in the step (rule 19).
  sealed: boolean;
  // What PDS OS did itself: « sent » (e-mailed, marked sent), « failed »
  // (copy the link), « disabled » (no SMTP or no address: by hand).
  emailed: "sent" | "failed" | "disabled";
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
        // A publisher's line (JUR-01): whom it represents, the house.
        represents: z.array(z.number().int().min(1).max(30)).max(30).nullable(),
        house: z.boolean(),
      }),
    )
    .min(1)
    .max(30),
});

function errorOf(message: string) {
  const t = fr.legalSplits.errors;
  if (message.includes("split_total_not_100")) return t.total;
  if (message.includes("split_contact_invalid")) return t.contactInvalid;
  if (message.includes("split_publisher_contact_required"))
    return fr.legalSplits.editor.publisherMissing;
  if (message.includes("split_publisher_unlinked")) return t.publisherUnlinked;
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
      represents: line.represents,
      house: line.house,
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
  // A publisher there does not say whom it represents (JUR-01).
  if (lines.some((line) => line.role === "publisher"))
    return { ok: false, error: fr.legalSplits.errors.publisherUnlinked };

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

// « Envoyer pour confirmation » says what follows (JUR-04): the people
// awaited, the viewer's next step. The links stay in `data`.
function sendVersion(
  projectId: string,
  versionId: string,
): Promise<SplitResult<SplitLink[]>> {
  return legalOutcome(projectId, fr.legalJourney.done.split.proposed, () =>
    sendVersionNow(projectId, versionId),
  );
}

async function sendVersionNow(
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
  const sealed = await sealSplitLinks(
    supabase,
    data.flatMap((row) =>
      row.token ? [{ entryId: row.entry_id, token: row.token }] : [],
    ),
  );
  const emailed = await emailConfirmations(
    projectId,
    versionId,
    (entries ?? []).map((e) => ({ entryId: e.id, contactId: e.contact_id })),
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
      // A carried link (no token) was sealed with its first version.
      sealed: !row.token || sealed.has(row.entry_id),
      emailed: emailed.get(row.entry_id) ?? "disabled",
    })),
  };
}

/** « Nouveau lien » for one person: the previous one stops working. */
export async function newSplitLink(
  projectId: string,
  entryId: string,
): Promise<
  SplitResult<{
    url: string;
    email: string | null;
    sealed: boolean;
    emailed: "sent" | "failed" | "disabled";
  }>
> {
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
  const [emails, sealed] = await Promise.all([
    contactEmails(supabase, entry?.contact_id ? [entry.contact_id] : []),
    sealSplitLinks(supabase, [{ entryId: parsed.data.entryId, token: data }]),
  ]);
  const emailed = await emailConfirmations(
    parsed.data.projectId,
    null,
    [{ entryId: parsed.data.entryId, contactId: entry?.contact_id ?? null }],
    parsed.data.entryId,
  );
  revalidatePath(routes.projectLegal(parsed.data.projectId), "layout");
  return {
    ok: true,
    data: {
      emailed: emailed.get(parsed.data.entryId) ?? "disabled",
      url: `${siteUrl()}${routes.legalSplit(data)}`,
      email: entry?.contact_id ? (emails.get(entry.contact_id) ?? null) : null,
      sealed: sealed.has(parsed.data.entryId),
    },
  };
}

/**
 * E-mails each rights-holder their page, where the confirmation is asked
 * (one e-mail per person, even with two lines), and marks their
 * confirmation sent; never fails the gesture (Sacha, 05/11/2026). Nothing
 * for a line without a contact, an address or SMTP: by hand, as before.
 */
async function emailConfirmations(
  projectId: string,
  versionId: string | null,
  lines: Array<{ entryId: string; contactId: string | null }>,
  singleEntryId?: string,
): Promise<Map<string, "sent" | "failed" | "disabled">> {
  const outcome = new Map<string, "sent" | "failed" | "disabled">();
  if (!emailEnabled()) return outcome;
  const supabase = await createClient();
  const { data: entry } = await supabase
    .from("legal_split_entries")
    .select("version_id")
    .eq("id", singleEntryId ?? lines[0]?.entryId ?? "")
    .maybeSingle();
  const version = versionId ?? entry?.version_id ?? null;
  const { data: v } = version
    ? await supabase
        .from("legal_split_versions")
        .select("sheet_id")
        .eq("id", version)
        .maybeSingle()
    : { data: null };
  const { data: sheet } = v
    ? await supabase
        .from("legal_split_sheets")
        .select("master_id")
        .eq("id", v.sheet_id)
        .maybeSingle()
    : { data: null };
  const { data: master } = sheet
    ? await supabase
        .from("masters")
        .select("title")
        .eq("id", sheet.master_id)
        .maybeSingle()
    : { data: null };
  const title = master?.title ?? (await projectTitleOf(projectId));
  const t = fr.legalSplits.links.emailed;
  const byContact = new Map<string, "sent" | "failed" | "disabled">();
  for (const line of lines) {
    if (!line.contactId) continue;
    let sent = byContact.get(line.contactId);
    if (!sent) {
      sent = await emailContact({
        projectId,
        contactId: line.contactId,
        subject: t.subject(title),
        body: t.body(title),
        open: t.open,
      });
      byContact.set(line.contactId, sent);
    }
    outcome.set(line.entryId, sent);
    if (sent !== "sent") continue;
    const { data: confirmation } = await supabase
      .from("legal_split_confirmations")
      .select("id")
      .eq("entry_id", line.entryId)
      .is("revoked_at", null)
      .eq("status", "pending")
      .maybeSingle();
    if (!confirmation) continue;
    const { error } = await supabase.rpc("mark_split_confirmation_sent", {
      p_confirmation_id: confirmation.id,
    });
    if (error) console.error("emailConfirmations mark:", error.message);
  }
  return outcome;
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
