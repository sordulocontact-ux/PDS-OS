"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { transmissionExpiry } from "@/lib/master-workflow/link-expiry";
import { loadStepView } from "@/lib/master-workflow/transmission";
import type { MasterPackage } from "@/lib/master-workflow/transmission-types";
import { getProject } from "@/lib/projects/queries";
import { createClient } from "@/lib/supabase/server";

export type TransmitResult =
  { ok: true; token: string } | { ok: false; error: string };

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
  const project = await getProject(input.data.projectId);
  if (!project) return { ok: false, error: t.failed };
  const view = await loadStepView(project, access, input.data.role);
  if (!view.canEdit) return { ok: false, error: t.forbidden };
  if (view.blockers.length > 0 || !view.brief || !view.engineer)
    return { ok: false, error: view.blockers[0] ?? t.failed };

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
  const pack: MasterPackage = {
    role: input.data.role,
    project: project.title,
    engineer: view.engineer.name,
    titles: view.titles.flatMap((title) => {
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
              (file) =>
                file.master_id === title.id && file.category === "stems",
            )
            .map(fileOf),
        },
      ];
    }),
    direction: view.brief.direction,
    references: view.brief.references,
    constraints: view.brief.constraints,
    deliverables: view.brief.deliverables.map((key) => b.deliverables[key]),
    revisions: view.brief.revisions,
    ...(input.data.role === "mix"
      ? {
          mixV1Due: view.brief.dates.mixV1Due,
          mixFinalDue: view.brief.dates.mixFinalDue,
          masteringDue: null,
          masterFinalDue: null,
        }
      : {
          mixV1Due: null,
          mixFinalDue: null,
          masteringDue: view.brief.dates.masteringDue,
          masterFinalDue: view.brief.dates.masterFinalDue,
        }),
  };

  const { data: token, error: sendError } = await supabase.rpc(
    "create_master_transmission",
    {
      p_project_id: project.id,
      p_role: input.data.role,
      p_package: pack,
      p_note: input.data.note,
      p_expires_at: expiresAt.toISOString(),
    },
  );
  if (sendError || !token) {
    console.error("transmitToMixer:", sendError?.code, sendError?.message);
    return {
      ok: false,
      error: sendError?.code === "42501" ? t.forbidden : t.failed,
    };
  }
  revalidatePath(routes.projectMasterStep(project.id, input.data.role));
  return { ok: true, token };
}
