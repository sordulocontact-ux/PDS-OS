import "server-only";

import type { Access } from "@/lib/auth/access";
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

export type FinalTitle = {
  id: string;
  title: string;
  artists: string;
  // The validated mastering version: the Master final.
  final: {
    number: number;
    fileName: string;
    decidedAt: string;
    decidedBy: string | null;
  } | null;
  // The title's state in the Catalogue.
  audioState: AudioState | null;
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
  const [finals, masters, brief, received] = await Promise.all([
    supabase
      .from("master_mix_versions")
      .select(
        "master_id, number, decided_at, file:master_files!master_mix_versions_file_id_fkey(file_name), decider:people!master_mix_versions_decided_by_fkey(first_name, last_name)",
      )
      .eq("project_id", project.id)
      .eq("stage", "mastering")
      .eq("decision", "approved"),
    ids.length
      ? supabase.from("masters").select("id, audio_state").in("id", ids)
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
  ]);
  const failed = Boolean(finals.error || masters.error || received.error);
  if (failed) console.error("loadFinalView:", finals.error?.message);

  const expected = briefDeliverablesOf(brief.data?.deliverables ?? []).filter(
    (key) => !WORKFLOW_RESULTS.includes(key),
  );
  const stateOf = new Map(
    (masters.data ?? []).map((row) => [row.id, audioStateOf(row.audio_state)]),
  );
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
      return {
        id: master.id,
        title: master.title,
        artists: master.artists,
        final:
          final && final.decided_at
            ? {
                number: final.number,
                fileName: final.file?.file_name ?? "",
                decidedAt: final.decided_at,
                decidedBy: final.decider
                  ? personName(
                      final.decider.first_name,
                      final.decider.last_name,
                    )
                  : null,
              }
            : null,
        audioState: stateOf.get(master.id) ?? null,
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
