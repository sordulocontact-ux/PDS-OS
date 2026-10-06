import "server-only";

import { can, type Access } from "@/lib/auth/access";
import { audioStateOf, byAudioProgress } from "@/lib/catalog/title-rules";
import { fr } from "@/lib/i18n/fr";
import type { FlowAudio } from "@/lib/master-workflow/audio-source";
import { BRIEF_COLUMNS, briefFromRow } from "@/lib/master-workflow/brief-row";
import type { MasterBrief } from "@/lib/master-workflow/brief-types";
import { readMasterRows } from "@/lib/master-workflow/inventory-rows";
import type { TransmissionRow } from "@/lib/master-workflow/transmission-types";
import { canEditProject } from "@/lib/projects/edit-access";
import { personName } from "@/lib/projects/types";
import { createClient } from "@/lib/supabase/server";

/** A title the package carries: one whose master final is not there yet. */
export type PlannedTitle = {
  id: string;
  title: string;
  artists: string;
  // What the engineer works from: the confirmed source (mix), the validated
  // Mix final (mastering). Null blocks the sending.
  source: FlowAudio | null;
  // Separated tracks: for the mix only.
  stems: number;
};

/** Who the package goes to: the mix engineer, then the mastering one. */
export type PackageRole = "mix" | "mastering";

export type StepView = {
  role: PackageRole;
  projectId: string;
  projectTitle: string;
  brief: MasterBrief | null;
  engineer: { id: string; name: string; email: string | null } | null;
  titles: PlannedTitle[];
  // What prevents the sending, worded; empty when it can go.
  blockers: string[];
  history: TransmissionRow[];
  canEdit: boolean;
  // Where a version's file is stored; null without manage_catalog.
  organizationId: string | null;
};

const HISTORY_SELECT =
  "id, created_at, note, acknowledged_at, revoked_at, expires_at, sender:people!master_transmissions_created_by_fkey(first_name, last_name), contact:network_contacts!master_transmissions_contact_same_org(name)";

export type MixView = StepView;

/**
 * The Mix or Mastering step: what the package for the engineer holds
 * (computed by code from the brief and the confirmed sources, or the
 * validated Mix finals), what still blocks it, and the follow-up of each
 * sending. Read with the viewer's session.
 */
export async function loadStepView(
  project: {
    id: string;
    title: string;
    ownerPersonId: string | null;
    masters: Array<{ id: string; title: string; artists: string }>;
  },
  access: Access,
  role: PackageRole,
): Promise<StepView> {
  const supabase = await createClient();
  const [rows, briefRow, history, finals] = await Promise.all([
    readMasterRows(project.id, project.masters),
    supabase
      .from("master_briefs")
      .select(BRIEF_COLUMNS)
      .eq("project_id", project.id)
      .maybeSingle(),
    supabase
      .from("master_transmissions")
      .select(HISTORY_SELECT)
      .eq("project_id", project.id)
      .eq("role", role)
      .order("created_at", { ascending: false }),
    // The validated Mix final of each title: what the mastering works from.
    supabase
      .from("master_mix_versions")
      .select(
        "master_id, file:master_files!master_mix_versions_file_id_fkey(id, file_name, audio_state, version, created_at)",
      )
      .eq("project_id", project.id)
      .eq("decision", "approved"),
  ]);
  if (history.error) console.error("loadMixView:", history.error.message);
  const brief = briefRow.data ? briefFromRow(briefRow.data) : null;
  const engineerId =
    role === "mix" || brief?.masteringSameEngineer
      ? brief?.mixContactId
      : brief?.masteringContactId;
  const contact = rows.contacts.find((c) => c.id === engineerId);
  const finalOf = new Map(
    (finals.data ?? []).flatMap((row) => {
      const state = audioStateOf(row.file?.audio_state ?? null);
      return row.file && state
        ? [
            [
              row.master_id,
              {
                id: row.file.id,
                fileName: row.file.file_name,
                audioState: state,
                version: row.file.version,
                createdAt: row.file.created_at,
              },
            ] as const,
          ]
        : [];
    }),
  );

  // A title already at its master final needs no mix: it is not sent.
  const titles: PlannedTitle[] = rows.titles.flatMap((title) => {
    const audio = rows.audioOf.get(title.id) ?? [];
    const [latest] = byAudioProgress(audio);
    if (latest?.audioState === "final_master") return [];
    const sourceId = rows.sourceOf.get(title.id)?.fileId;
    return [
      {
        id: title.id,
        title: title.title,
        artists: title.artists,
        source:
          role === "mix"
            ? (audio.find((file) => file.id === sourceId) ?? null)
            : (finalOf.get(title.id) ?? null),
        stems: role === "mix" ? (rows.stemsOf.get(title.id) ?? 0) : 0,
      },
    ];
  });

  const t = fr.masterWorkflow.mix.blockers;
  const blockers = [
    ...(contact ? [] : [role === "mix" ? t.engineer : t.masteringEngineer]),
    ...(titles.length === 0 ? [t.noTitle] : []),
    ...titles
      .filter((title) => !title.source)
      .map((title) =>
        role === "mix" ? t.source(title.title) : t.mixFinal(title.title),
      ),
  ];

  return {
    role,
    projectId: project.id,
    projectTitle: project.title,
    brief,
    engineer: contact
      ? { id: contact.id, name: contact.name, email: contact.email }
      : null,
    titles,
    blockers,
    history: (history.data ?? []).map((row) => ({
      id: row.id,
      sentAt: row.created_at,
      sentBy: row.sender
        ? personName(row.sender.first_name, row.sender.last_name)
        : null,
      engineer: row.contact?.name ?? "",
      note: row.note,
      acknowledgedAt: row.acknowledged_at,
      revokedAt: row.revoked_at,
      expiresAt: row.expires_at,
    })),
    canEdit: canEditProject(access, project),
    organizationId: can(access, "manage_catalog")
      ? access.organizationId
      : null,
  };
}
