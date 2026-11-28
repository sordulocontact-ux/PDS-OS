import "server-only";

import { can } from "@/lib/auth/access";
import { withDownloadName } from "@/lib/catalog/file-rules";
import { audioStateOf, type AudioState } from "@/lib/catalog/title-rules";
import { proposeMasterCalendar } from "@/lib/master-workflow/calendar";
import { loadFramingDefaults } from "@/lib/master-workflow/framing-defaults";
import { masterJourneyContext } from "@/lib/master-workflow/journey-context";
import { liveTransmission } from "@/lib/master-workflow/journey";
import {
  newerThan,
  replacedForVocals,
  sourceCandidates,
  vocalsAwaited,
} from "@/lib/master-workflow/source-rules";
import { canEditProject } from "@/lib/projects/edit-access";
import { personName } from "@/lib/projects/types";
import { createClient } from "@/lib/supabase/server";

const SIGNED_SECONDS = 3600;

export type SourceVersion = {
  id: string;
  fileName: string;
  audioState: AudioState;
  version: number;
  addedBy: string | null;
  createdAt: string;
  listenUrl: string | null;
  downloadUrl: string | null;
};

export type SourceTitle = {
  id: string;
  title: string;
  artists: string;
  // Maquettes and mises à plat, newest first: the first is detected.
  candidates: SourceVersion[];
  // A mix found in the Catalogue (not a version of this round).
  existingMix: SourceVersion | null;
  // The latest confirmation, if any, and the file it names.
  current: {
    version: SourceVersion | null;
    fileName: string;
    confirmedAt: string;
    confirmedBy: string | null;
    vocalsFinal: boolean | null;
    vocalsPending: string | null;
    plan: "wait" | "anticipate" | null;
  } | null;
  replaced: boolean;
  // A newer version received while the final vocals were awaited.
  newer: SourceVersion | null;
  awaited: boolean;
  // The existing mix declared Mix final.
  declared: {
    fileName: string;
    by: string | null;
    at: string;
    reason: string | null;
  } | null;
  stems: { count: number; latest: string | null };
};

export type SourceStepView = {
  projectId: string;
  titles: SourceTitle[];
  canConfirm: boolean;
  // manage_catalog: import a version here (its organization).
  organizationId: string | null;
  // The live mix link's engineer: « prévenir Karim ».
  engineer: string | null;
  // « Mix V1 attendu le … » of the « Attendre » consequence.
  mixV1Due: string | null;
};

/**
 * The Source step (proto `master-v2.html`, ticket § 1 and § 2): for each
 * title, the versions a source may be (listened to before choosing), the
 * stems count, the current source and whether newer vocals arrived. Read
 * with the viewer's session.
 */
export async function loadSourceStep(
  projectId: string,
): Promise<SourceStepView> {
  const { access, project, facts } = await masterJourneyContext(projectId);
  const supabase = await createClient();
  const ids = project.masters.map((m) => m.id);
  const none = Promise.resolve({ data: [], error: null });
  const [files, framing, reasons] = await Promise.all([
    ids.length
      ? supabase
          .from("master_files")
          .select(
            "id, master_id, series_id, category, file_name, audio_state, version, path, created_at, author:people!master_files_created_by_fkey(first_name, last_name)",
          )
          .in("master_id", ids)
          .in("category", ["audio", "stems"])
          .order("created_at", { ascending: false })
          .limit(500)
      : none,
    loadFramingDefaults(projectId),
    supabase
      .from("master_mix_versions")
      .select("master_id, decision_note")
      .eq("project_id", projectId)
      .eq("stage", "mix")
      .eq("decision", "approved"),
  ]);
  if (files.error) console.error("loadSourceStep:", files.error.message);
  const rows = files.data ?? [];
  const audio = rows.filter((f) => f.category === "audio");
  const signed = audio.length
    ? await supabase.storage.from("master-files").createSignedUrls(
        audio.map((f) => f.path),
        SIGNED_SECONDS,
      )
    : null;
  const urlOf = new Map(
    (signed?.data ?? []).flatMap((e) =>
      e.path && e.signedUrl ? [[e.path, e.signedUrl] as const] : [],
    ),
  );
  const versionOf = (f: (typeof rows)[number]): SourceVersion | null => {
    const state = audioStateOf(f.audio_state);
    if (!state) return null;
    const url = urlOf.get(f.path) ?? null;
    return {
      id: f.id,
      fileName: f.file_name,
      audioState: state,
      version: f.version,
      addedBy: f.author
        ? personName(f.author.first_name, f.author.last_name)
        : null,
      createdAt: f.created_at,
      listenUrl: url,
      downloadUrl: url && withDownloadName(url, f.file_name),
    };
  };
  const versionsOf = (masterId: string) =>
    audio
      .flatMap((f) => (f.master_id === masterId ? [versionOf(f)] : []))
      .filter((v): v is SourceVersion => v !== null);

  const roundFiles = new Set(
    facts.versions.map((v) => `${v.masterId}|${v.fileName}`),
  );
  const titles: SourceTitle[] = facts.titles.map((title) => {
    const all = versionsOf(title.id);
    const candidates = sourceCandidates(all);
    const source = title.sources[0] ?? null;
    const approved = facts.versions.find(
      (v) =>
        v.masterId === title.id &&
        v.stage === "mix" &&
        v.decision === "approved",
    );
    const stemSeries = new Map<string, string>();
    for (const f of rows)
      if (
        f.master_id === title.id &&
        f.category === "stems" &&
        !stemSeries.has(f.series_id)
      )
        stemSeries.set(f.series_id, f.file_name);
    const newer = newerThan(candidates, source);
    return {
      id: title.id,
      title: title.title,
      artists: title.artists,
      candidates,
      existingMix:
        all.find(
          (v) =>
            v.audioState === "mix" &&
            !roundFiles.has(`${title.id}|${v.fileName}`),
        ) ?? null,
      current: source
        ? {
            version: all.find((v) => v.id === source.fileId) ?? null,
            fileName: source.fileName,
            confirmedAt: source.confirmedAt,
            confirmedBy: source.confirmedBy,
            vocalsFinal: source.vocalsFinal,
            vocalsPending: source.vocalsPending,
            plan: source.plan,
          }
        : null,
      replaced: replacedForVocals(title.sources),
      newer: vocalsAwaited(source) ? newer : null,
      awaited: vocalsAwaited(source) && !approved,
      declared:
        approved?.declared === true
          ? {
              fileName: approved.fileName,
              by: approved.decidedBy,
              at: approved.createdAt,
              reason:
                (reasons.data ?? []).find((r) => r.master_id === title.id)
                  ?.decision_note ?? null,
            }
          : null,
      stems: {
        count: stemSeries.size,
        latest: [...stemSeries.values()][0] ?? null,
      },
    };
  });

  const link = liveTransmission(facts, "mix");
  const masterFinal =
    facts.brief?.masterFinalDue ?? framing.masterFinalDue ?? null;
  return {
    projectId,
    titles,
    canConfirm: canEditProject(access, project),
    organizationId: can(access, "manage_catalog")
      ? access.organizationId
      : null,
    engineer:
      link && !link.revokeReason && Date.parse(link.expiresAt) > Date.now()
        ? link.contactName
        : null,
    mixV1Due: proposeMasterCalendar(masterFinal)?.mixV1Due ?? null,
  };
}
