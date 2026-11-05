"use server";

import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { emailLink, siteUrl } from "@/lib/email/link-email";
import { projectTitleOf } from "@/lib/email/outcome";
import { emailEnabled } from "@/lib/email/send";
import { fr } from "@/lib/i18n/fr";
import { core } from "@/lib/i18n/fr/core";
import { formatDay } from "@/lib/utils/day";
import { schedulePendingPushes } from "@/lib/notifications/push";
import { effectiveLogistics } from "@/lib/production/logistics";
import { prepDone, type PrepResult } from "@/lib/production/prep-result";
import { loadProductionSheet } from "@/lib/production/sheet";
import { preprodFor } from "@/lib/production/tab-data";
import { createClient } from "@/lib/supabase/server";

import { callSheetContent } from "./call-sheet-snapshot";
import { loadContactDetails } from "./reads";
import { forbidden, invalid, preprodFailure } from "./result";

// « Diffuser la feuille » and « Lien de la feuille » (PROD-016): the
// content is composed here from the sheet — never sent by the client —
// then frozen as a version by the database.

const schema = z.object({ projectId: z.uuid(), deliverableId: z.uuid() });

/** The call sheet composed from the sheet (never from the browser), or null
 * when the user cannot organize this production. */
async function composeCallSheet(projectId: string, deliverableId: string) {
  const access = await requireApproved();
  const data = await loadProductionSheet(projectId, deliverableId, access);
  const preprod = await preprodFor(projectId, deliverableId, access);
  if (!data?.sheet || !preprod || !data.canOrganize) return null;
  const sheet = data.sheet;
  const details = await loadContactDetails([
    ...(sheet.director?.kind === "contact" ? [sheet.director.id] : []),
    ...data.needs.flatMap((n) =>
      n.assignments.flatMap((a) =>
        a.holder.kind === "contact" ? [a.holder.id] : [],
      ),
    ),
  ]);
  const content = callSheetContent({
    project: await projectTitleOf(projectId),
    deliverable: data.deliverable.title,
    manager: data.ownerName,
    shootDate: effectiveLogistics(sheet.logistics, data.heritage.fiche)
      .shootDate.value,
    logistics: sheet.logistics,
    director: sheet.director,
    needs: data.needs,
    equipment: preprod.equipment,
    callSheet: preprod.callSheet,
    details,
  });
  return { sheet, content };
}

export async function publishCallSheet(
  input: z.input<typeof schema>,
): Promise<PrepResult & { number?: number }> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return invalid;
  const { projectId, deliverableId } = parsed.data;
  const composed = await composeCallSheet(projectId, deliverableId);
  if (!composed) return forbidden;
  const supabase = await createClient();
  const { data: number, error } = await supabase.rpc(
    "publish_production_call_sheet",
    {
      p_sheet_id: composed.sheet.id,
      p_content: composed.content,
    },
  );
  if (error || number === null) return preprodFailure(error ?? {});
  await schedulePendingPushes();
  prepDone(projectId);
  return { ok: true, number };
}

const linkSchema = z.object({
  projectId: z.uuid(),
  sheetId: z.uuid(),
  // With it, PDS OS e-mails the crew's known addresses the link itself.
  deliverableId: z.uuid().optional(),
});

export type CallSheetLinkResult =
  | {
      ok: true;
      token: string;
      // The addresses e-mailed, and those that did not leave (SMTP error):
      // the latter keep the ready mailto. All empty: nothing was sent
      // (no SMTP, or no address in the Réseau).
      emailed: string[];
      unsent: string[];
    }
  | { ok: false; error: string };

export async function createCallSheetLink(
  input: z.input<typeof linkSchema>,
): Promise<CallSheetLinkResult> {
  await requireApproved();
  const parsed = linkSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(
    "create_production_call_sheet_link",
    {
      p_sheet_id: parsed.data.sheetId,
    },
  );
  if (error || !data) {
    const failure = preprodFailure(error ?? {});
    return { ok: false, error: failure.ok ? "" : failure.error };
  }
  prepDone(parsed.data.projectId);
  const outcome = parsed.data.deliverableId
    ? await emailCrew(parsed.data.projectId, parsed.data.deliverableId, data)
    : { emailed: [], unsent: [] };
  return { ok: true, token: data, ...outcome };
}

/** One e-mail per crew address with the sheet's link; never throws. */
async function emailCrew(
  projectId: string,
  deliverableId: string,
  token: string,
): Promise<{ emailed: string[]; unsent: string[] }> {
  const none = { emailed: [], unsent: [] };
  if (!emailEnabled()) return none;
  const composed = await composeCallSheet(projectId, deliverableId);
  if (!composed) return none;
  const t = fr.productionPreprod.callSheet.publish.mail;
  const { content } = composed;
  const seen = new Set<string>();
  const emailed: string[] = [];
  const unsent: string[] = [];
  for (const member of content.team) {
    const address = member.email?.trim();
    if (!address || seen.has(address.toLowerCase())) continue;
    seen.add(address.toLowerCase());
    const sent = await emailLink({
      to: { name: member.name, email: address },
      subject: t.subject(content.project, content.deliverable),
      message: `${core.linkEmail.greeting(member.name)}\n\n${t.body(
        content.deliverable,
        content.shootDate ? formatDay(content.shootDate) : null,
      )}`,
      open: t.open,
      url: siteUrl(`/fs/${token}`),
    });
    if (sent === "sent") emailed.push(address);
    else if (sent === "failed") unsent.push(address);
  }
  return { emailed, unsent };
}
