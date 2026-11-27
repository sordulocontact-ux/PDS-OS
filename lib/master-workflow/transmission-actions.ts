"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { transmissionExpiry } from "@/lib/master-workflow/link-expiry";
import { loadStepView } from "@/lib/master-workflow/transmission";
import {
  packageSubject,
  type MasterPackage,
} from "@/lib/master-workflow/transmission-types";
import { getProject } from "@/lib/projects/queries";
import { countedTitlesProject } from "@/lib/projects/counted-titles";
import { createClient } from "@/lib/supabase/server";

// Who it went to and for which project, for the e-mail (sendRound).
type Sent = {
  project: string;
  // `id`: the engineer's Réseau contact, whose page by project carries it.
  engineer: { id: string; name: string; email: string | null };
};

export type TransmitResult =
  // `continued`: added to the mix link of the same engineer, no new link.
  | ({ ok: true; token: string; continued: false } & Sent)
  | ({ ok: true; token: null; continued: true } & Sent)
  | { ok: false; error: string };

/**
 * "Transmettre au mixeur" / "… au mastering", or "Relancer" (a new sending
 * replaces the previous link). Everything is recomputed here from the database, never
 * taken from the client: the titles to mix, their confirmed sources, the
 * stems (latest version of each), the brief. The files are signed with the
 * owner's session for the link's lifetime; the database checks the owner and
 * sends it to the brief's engineer (create_master_transmission). The token
 * comes back once, for the owner to share.
 */
export async function transmitPackage(
  projectId: string,
  role: string,
  note: string,
  // Why the titles leave without stems, written (proto: a waiver kept in
  // the history); null: every title must have them.
  withoutStemsReason: string | null = null,
): Promise<TransmitResult> {
  const t = fr.masterWorkflow.mix.errors;
  const input = z
    .object({
      projectId: z.uuid(),
      role: z.enum(["mix", "mastering"]),
      note: z.string().max(2000),
    })
    .safeParse({ projectId, role, note });
  if (!input.success) return { ok: false, error: t.failed };

  const access = await requireApproved();
  const read = await getProject(input.data.projectId);
  if (!read) return { ok: false, error: t.failed };
  // The package leaves without a collective's abandoned titles (lot 9).
  const project = countedTitlesProject(read);
  const view = await loadStepView(project, access, input.data.role);
  if (!view.canEdit) return { ok: false, error: t.forbidden };
  if (view.blockers.length > 0 || !view.brief || !view.engineer)
    return { ok: false, error: view.blockers[0]?.text ?? t.failed };

  const supabase = await createClient();
  // The link lives until the stage's final date plus a margin (never under
  // 30 days); its files are signed for exactly as long.
  const now = new Date();
  const dates = view.brief.dates;
  const expiresAt = transmissionExpiry(
    now,
    input.data.role === "mix"
      ? dates.mixFinalDue
      : (dates.masterFinalDue ?? dates.masteringDue),
  );
  const linkSeconds = Math.floor((expiresAt.getTime() - now.getTime()) / 1000);
  const sourceIds = view.titles.flatMap((title) =>
    title.source ? [title.source.id] : [],
  );
  const { data: files, error } = await supabase
    .from("master_files")
    .select("id, master_id, series_id, category, path, file_name")
    .in(
      "master_id",
      view.titles.map((title) => title.id),
    )
    .or(`id.in.(${sourceIds.join(",")}),category.eq.stems`)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("transmitToMixer files:", error.message);
    return { ok: false, error: t.failed };
  }
  // Newest first: the first row of a series is its latest version.
  const seen = new Set<string>();
  const kept = (files ?? []).filter(
    (file) =>
      sourceIds.includes(file.id) ||
      (file.category === "stems" &&
        !seen.has(file.series_id) &&
        seen.add(file.series_id)),
  );
  const signed = await supabase.storage.from("master-files").createSignedUrls(
    kept.map((file) => file.path),
    linkSeconds,
  );
  if (signed.error) {
    console.error("transmitToMixer sign:", signed.error.message);
    return { ok: false, error: t.failed };
  }
  const urlOf = new Map(
    signed.data.flatMap((entry) =>
      entry.path && entry.signedUrl ? [[entry.path, entry.signedUrl]] : [],
    ),
  );
  const fileOf = (file: (typeof kept)[number]) => ({
    fileName: file.file_name,
    url: urlOf.get(file.path) ?? "",
  });

  const b = fr.masterWorkflow.brief;
  const titles = view.titles.flatMap((title) => {
    const source = kept.find((file) => file.id === title.source?.id);
    if (!source || !title.source) return [];
    return [
      {
        masterId: title.id,
        title: title.title,
        artists: title.artists,
        source: {
          ...fileOf(source),
          state: fr.catalog.audioStates[title.source.audioState],
        },
        stems: kept
          .filter(
            (file) => file.master_id === title.id && file.category === "stems",
          )
          .map(fileOf),
        sourceUpdatedAt: null,
      },
    ];
  });
  // A collective's package is its titles' (M9): the engineer's page and the
  // e-mail name them, not the collective.
  const subject = packageSubject(project, titles);
  const pack: MasterPackage = {
    role: input.data.role,
    project: project.title,
    subject: project.collective ? subject : null,
    engineer: view.engineer.name,
    titles,
    direction: view.brief.direction,
    references: view.brief.references,
    constraints: view.brief.constraints,
    deliverables: view.brief.deliverables.map((key) => b.deliverables[key]),
    revisions: view.brief.revisions,
    // Every date of the Brief goes, each with its meaning (PROJ-BUG-07).
    mixV1Due: view.brief.dates.mixV1Due,
    mixFinalDue: view.brief.dates.mixFinalDue,
    masteringDue: view.brief.dates.masteringDue,
    masterFinalDue: view.brief.dates.masterFinalDue,
    releaseDue: project.dueDate,
    formats: view.brief.formats,
  };

  // A mix package without stems for a title leaves only on purpose, the
  // titles named on the sending (the database checks it again).
  const noStems =
    input.data.role === "mix"
      ? pack.titles
          .filter((title) => title.stems.length === 0)
          .map((x) => x.title)
      : [];
  const reason = withoutStemsReason?.trim().slice(0, 1000) || null;
  if (noStems.length > 0 && !reason)
    return { ok: false, error: t.stemsMissing(noStems) };

  const { data: token, error: sendError } = await supabase.rpc(
    "create_master_transmission",
    {
      p_project_id: project.id,
      p_role: input.data.role,
      p_package: pack,
      p_note: input.data.note,
      p_expires_at: expiresAt.toISOString(),
      p_derogations: noStems.length
        ? { withoutStems: noStems, withoutStemsReason: reason }
        : {},
    },
  );
  if (sendError || !token) {
    console.error("transmitToMixer:", sendError?.code, sendError?.message);
    return {
      ok: false,
      error:
        sendError?.code === "42501"
          ? t.forbidden
          : sendError?.message.includes("stems_missing") ||
              sendError?.message.includes("stems_reason_required")
            ? t.stemsMissing(noStems)
            : sendError?.message.includes("vocals_awaited")
              ? fr.masterRound.blockers.vocals
              : t.failed,
    };
  }
  revalidatePath(routes.projectMasterStep(project.id, input.data.role));
  const sent: Sent = {
    project: subject,
    engineer: {
      id: view.engineer.id,
      name: view.engineer.name,
      email: view.engineer.email,
    },
  };
  return token === "continued"
    ? { ok: true, token: null, continued: true, ...sent }
    : { ok: true, token, continued: false, ...sent };
}

const transmissionId = z.object({ projectId: z.uuid(), id: z.uuid() });

/**
 * « J'ai envoyé le lien » (PROJ-UX-09): the owner says the link left by
 * e-mail or message; PDS OS sends nothing itself.
 */
export async function markTransmissionSent(
  projectId: string,
  id: string,
  role: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const t = fr.masterWorkflow.mix.errors;
  const input = transmissionId
    .extend({ role: z.enum(["mix", "mastering"]) })
    .safeParse({ projectId, id, role });
  if (!input.success) return { ok: false, error: t.failed };
  await requireApproved();
  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_master_transmission_sent", {
    p_transmission_id: input.data.id,
  });
  if (error) {
    console.error("markTransmissionSent:", error.code, error.message);
    return {
      ok: false,
      error: error.code === "42501" ? t.forbidden : t.failed,
    };
  }
  revalidatePath(
    routes.projectMasterStep(input.data.projectId, input.data.role),
  );
  return { ok: true };
}

/** « Révoquer le lien »: it stops working at once, with its reason. */
export async function revokeTransmission(
  projectId: string,
  id: string,
  role: string,
  reason: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const t = fr.masterWorkflow.mix.errors;
  const input = transmissionId
    .extend({
      role: z.enum(["mix", "mastering"]),
      reason: z.string().trim().min(1).max(500),
    })
    .safeParse({ projectId, id, role, reason });
  if (!input.success) return { ok: false, error: fr.dialogs.reasonRequired };
  await requireApproved();
  const supabase = await createClient();
  const { error } = await supabase.rpc("revoke_master_transmission", {
    p_transmission_id: input.data.id,
    p_reason: input.data.reason,
  });
  if (error) {
    console.error("revokeTransmission:", error.code, error.message);
    return {
      ok: false,
      error: error.code === "42501" ? t.forbidden : t.failed,
    };
  }
  revalidatePath(
    routes.projectMasterStep(input.data.projectId, input.data.role),
  );
  return { ok: true };
}
