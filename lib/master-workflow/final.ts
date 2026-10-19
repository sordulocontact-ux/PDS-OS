import "server-only";

import type { Access } from "@/lib/auth/access";
import { withDownloadName } from "@/lib/catalog/file-rules";
import { audioStateOf, type AudioState } from "@/lib/catalog/title-rules";
import { fr } from "@/lib/i18n/fr";
import {
  briefDeliverablesOf,
  type BriefDeliverable,
} from "@/lib/master-workflow/brief-types";
import { canEditProject } from "@/lib/projects/edit-access";
import { personName } from "@/lib/projects/types";
import { createClient } from "@/lib/supabase/server";

// The masters themselves are the workflow's own results, not checked off.
const WORKFLOW_RESULTS: BriefDeliverable[] = ["mix_final", "master_final"];

// The file itself, the same reference for the Master, the Catalogue and the
// Distribution (PROJ-BUG-10): listened and downloaded through signed links.
export type FinalFile = {
  fileId: string;
  fileName: string;
  listenUrl: string | null;
  downloadUrl: string | null;
};

export type FinalTitle = {
  id: string;
  title: string;
  artists: string;
  // The validated mastering version: the Master final.
  final:
    | (FinalFile & {
        number: number;
        decidedAt: string;
        decidedBy: string | null;
      })
    | null;
  // No validated version, but the title already had its master final in
  // the Catalogue: the workflow left it out (nothing to mix), its file shown.
  before: (FinalFile & { addedAt: string }) | null;
  // Where it comes from (PROJ-BUG-06): the source confirmed, the Mix final.
  lineage: {
    source: { fileName: string; confirmedAt: string } | null;
    mixFinal: { number: number; fileName: string } | null;
  };
  // The title's state in the Catalogue, its ISRC and duration (the
  // Juridique's SACEM bulletin reads it).
  audioState: AudioState | null;
  isrc: string | null;
  durationSeconds: number | null;
  // The brief's other deliverables, and whether each arrived.
  deliverables: Array<{ key: BriefDeliverable; received: boolean }>;
};

export type FinalView = {
  projectId: string;
  titles: FinalTitle[];
  engineer: string | null;
  canEdit: boolean;
  failed: boolean;
};

/**
 * The Master final step (ticket § 13): for each title of the project, its
 * validated Master final (version, file, who validated, when), its state in
 * the Catalogue, and the other deliverables the brief expects, checked off
 * by the owner as they arrive. In one round, with the viewer's session.
 */
export async function loadFinalView(
  project: {
    id: string;
    ownerPersonId: string | null;
    masters: Array<{ id: string; title: string; artists: string }>;
  },
  access: Access,
): Promise<FinalView> {
  const supabase = await createClient();
  const ids = project.masters.map((master) => master.id);
  const none = Promise.resolve({ data: [], error: null });
  const [finals, masters, catalogFinals, brief, received, mixFinals, sources] =
    await Promise.all([
      supabase
        .from("master_mix_versions")
        .select(
          "master_id, number, decided_at, file:master_files!master_mix_versions_file_id_fkey(id, file_name, path), decider:people!master_mix_versions_decided_by_fkey(first_name, last_name)",
        )
        .eq("project_id", project.id)
        .eq("stage", "mastering")
        .eq("decision", "approved"),
      ids.length
        ? supabase
            .from("masters")
            .select("id, audio_state, isrc, duration_seconds")
            .in("id", ids)
        : none,
      ids.length
        ? supabase
            .from("master_files")
            .select("id, master_id, file_name, path, created_at")
            .in("master_id", ids)
            .eq("audio_state", "final_master")
            .order("created_at", { ascending: false })
        : none,
      supabase
        .from("master_briefs")
        .select(
          "deliverables, mastering_same_engineer, mix:network_contacts!master_briefs_mix_contact_same_org(name), mastering:network_contacts!master_briefs_mastering_contact_same_org(name)",
        )
        .eq("project_id", project.id)
        .maybeSingle(),
      supabase
        .from("master_deliverables_received")
        .select("master_id, deliverable")
        .eq("project_id", project.id),
      supabase
        .from("master_mix_versions")
        .select(
          "master_id, number, file:master_files!master_mix_versions_file_id_fkey(file_name)",
        )
        .eq("project_id", project.id)
        .eq("stage", "mix")
        .eq("decision", "approved"),
      supabase
        .from("master_flow_sources")
        .select(
          "master_id, created_at, file:master_files!master_flow_sources_file_id_fkey(file_name)",
        )
        .eq("project_id", project.id)
        .order("created_at", { ascending: false }),
    ]);
  // One signing request for every final file (PROJ-BUG-10).
  const paths = [
    ...(finals.data ?? []).flatMap((row) => (row.file ? [row.file.path] : [])),
    ...(catalogFinals.data ?? []).map((row) => row.path),
  ];
  const signed = paths.length
    ? await supabase.storage.from("master-files").createSignedUrls(paths, 3600)
    : null;
  const urlOf = new Map(
    (signed?.data ?? []).flatMap((entry) =>
      entry.path && entry.signedUrl ? [[entry.path, entry.signedUrl]] : [],
    ),
  );
  const fileOf = (file: { id: string; file_name: string; path: string }) => {
    const url = urlOf.get(file.path) ?? null;
    return {
      fileId: file.id,
      fileName: file.file_name,
      listenUrl: url,
      downloadUrl: url && withDownloadName(url, file.file_name),
    };
  };
  const failed = Boolean(
    finals.error || masters.error || catalogFinals.error || received.error,
  );
  if (failed) console.error("loadFinalView:", finals.error?.message);

  const expected = briefDeliverablesOf(brief.data?.deliverables ?? []).filter(
    (key) => !WORKFLOW_RESULTS.includes(key),
  );
  const stateOf = new Map(
    (masters.data ?? []).map((row) => [row.id, audioStateOf(row.audio_state)]),
  );
  const masterOf = new Map((masters.data ?? []).map((row) => [row.id, row]));
  const engineer = brief.data?.mastering_same_engineer
    ? brief.data?.mix?.name
    : brief.data?.mastering?.name;

  return {
    projectId: project.id,
    engineer: engineer ?? null,
    canEdit: canEditProject(access, project),
    failed,
    titles: project.masters.map((master) => {
      const final = (finals.data ?? []).find(
        (row) => row.master_id === master.id,
      );
      const catalogFinal = (catalogFinals.data ?? []).find(
        (row) => row.master_id === master.id,
      );
      return {
        id: master.id,
        title: master.title,
        artists: master.artists,
        final:
          final && final.decided_at && final.file
            ? {
                ...fileOf(final.file),
                number: final.number,
                decidedAt: final.decided_at,
                decidedBy: final.decider
                  ? personName(
                      final.decider.first_name,
                      final.decider.last_name,
                    )
                  : null,
              }
            : null,
        before:
          !final?.decided_at && catalogFinal
            ? { ...fileOf(catalogFinal), addedAt: catalogFinal.created_at }
            : null,
        lineage: {
          source: (() => {
            const row = (sources.data ?? []).find(
              (r) => r.master_id === master.id,
            );
            return row?.file
              ? { fileName: row.file.file_name, confirmedAt: row.created_at }
              : null;
          })(),
          mixFinal: (() => {
            const row = (mixFinals.data ?? []).find(
              (r) => r.master_id === master.id,
            );
            return row?.file
              ? { number: row.number, fileName: row.file.file_name }
              : null;
          })(),
        },
        audioState: stateOf.get(master.id) ?? null,
        isrc: masterOf.get(master.id)?.isrc ?? null,
        durationSeconds: masterOf.get(master.id)?.duration_seconds ?? null,
        deliverables: expected.map((key) => ({
          key,
          received: (received.data ?? []).some(
            (row) => row.master_id === master.id && row.deliverable === key,
          ),
        })),
      };
    }),
  };
}

export const finalLabel = (state: AudioState | null) =>
  state ? fr.catalog.audioStates[state] : null;
