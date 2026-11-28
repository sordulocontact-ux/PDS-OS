import "server-only";

import { can, type Access } from "@/lib/auth/access";
import { audioStateOf } from "@/lib/catalog/title-rules";
import { fr } from "@/lib/i18n/fr";
import {
  hasMasterFinal,
  type FlowAudio,
} from "@/lib/master-workflow/audio-source";
import { loadDistributionFormats } from "@/lib/distribution/requirements";
import { briefFromRow } from "@/lib/master-workflow/brief-row";
import type { MasterBrief } from "@/lib/master-workflow/brief-types";
import { readMasterRows } from "@/lib/master-workflow/inventory-rows";
import type { TransmissionRow } from "@/lib/master-workflow/transmission-types";
import { canEditProject } from "@/lib/projects/edit-access";
import type { Blocker } from "@/lib/ui/journey";
import { masterStepHref } from "@/lib/ui/master-steps";
import { personName } from "@/lib/projects/types";
import {
  masterBriefRow,
  masterTransmissionRows,
  masterVersionRows,
  whereRows,
} from "@/lib/master-workflow/shared-rows";
import { createClient } from "@/lib/supabase/server";
import { argsKey, memoPerRequest } from "@/lib/utils/request-memo";

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
  // Titles left out because they already have their master final.
  finished: number;
  // What prevents the sending, worded, with the step where it is lifted;
  // empty when it can go.
  blockers: Blocker[];
  history: TransmissionRow[];
  // A link to listen to each title's file before it leaves (PROJ-BUG-09).
  sourceUrls: Record<string, string>;
  // The project's planned release, for the dates' checks (PROJ-BUG-07).
  releaseDue: string | null;
  // Mastering only: the engineer did the mix and their link lives, so the
  // package is added to it (PROJ-BUG-09).
  reusesMixLink: boolean;
  // Where each title of the project stands for its mix (PROJ-BUG-06).
  diagnosis: MixDiagnosisRow[];
  canEdit: boolean;
  // Where a version's file is stored; null without manage_catalog.
  organizationId: string | null;
};

export type MixView = StepView;

export type MixDiagnosisRow = {
  id: string;
  title: string;
  state: "todo" | "running" | "done" | "master_final";
  // A « Mix » file of the Catalogue that may already be the Mix final.
  existingMix: { id: string; fileName: string } | null;
  // Who mixes, when the Brief and the title's credits differ.
  divergence: { brief: string; catalogue: string } | null;
};

// The titles a sending went without stems for (derogations, PROJ-UX-09).
const withoutStemsOf = (derogations: unknown): string[] => {
  const list = (derogations as { withoutStems?: unknown } | null)?.withoutStems;
  return Array.isArray(list) ? list.map(String) : [];
};

/**
 * The Mix or Mastering step: what the package for the engineer holds
 * (computed by code from the brief and the confirmed sources, or the
 * validated Mix finals), what still blocks it, and the follow-up of each
 * sending. Read with the viewer's session.
 */
async function readStepView(
  project: {
    id: string;
    title: string;
    ownerPersonId: string | null;
    dueDate?: string | null;
    masters: Array<{ id: string; title: string; artists: string }>;
  },
  access: Access,
  role: PackageRole,
): Promise<StepView> {
  const supabase = await createClient();
  const [rows, briefRow, history, finals, recorded, distributionFormats] =
    await Promise.all([
      readMasterRows(project.id, project.masters),
      // The brief, the sendings and the versions are read once per render
      // for every loader of the Master (lib/master-workflow/shared-rows.ts).
      masterBriefRow(project.id),
      whereRows(masterTransmissionRows(project.id), (t) => t.role === role),
      // The validated Mix final of each title: what the mastering works from.
      whereRows(masterVersionRows(project.id), (v) => v.stage === "mix"),
      // Recorded and unchanged since: what the engineer will receive.
      masterBriefRow(project.id),
      // What the Distribution asks of the audio, when the Brief says nothing.
      access.organizationId
        ? loadDistributionFormats(access.organizationId)
        : Promise.resolve(null),
    ]);
  // Every version of the mix round, for where each title stands (PROJ-BUG-06).
  const mixVersions = finals.data ?? [];
  const mixFinal = new Set(
    mixVersions
      .filter((row) => row.decision === "approved")
      .map((row) => row.master_id),
  );
  if (history.error) console.error("loadMixView:", history.error.message);
  const saved = briefRow.data ? briefFromRow(briefRow.data) : null;
  const brief = saved
    ? { ...saved, formats: saved.formats ?? distributionFormats }
    : null;
  const engineerId =
    role === "mix" || brief?.masteringSameEngineer
      ? brief?.mixContactId
      : brief?.masteringContactId;
  const contact = rows.contacts.find((c) => c.id === engineerId);
  const finalOf = new Map(
    mixVersions
      .filter((row) => row.decision === "approved")
      .flatMap((row) => {
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

  // Where each title stands (PROJ-BUG-06): a mix to do, a mix round
  // running, a Mix final already there (mixed here, or an existing mix
  // declared), or a master final already.
  const diagnosis: MixDiagnosisRow[] = rows.titles.map((title) => {
    const audio = rows.audioOf.get(title.id) ?? [];
    const state: MixDiagnosisRow["state"] = hasMasterFinal(audio)
      ? "master_final"
      : mixFinal.has(title.id)
        ? "done"
        : mixVersions.some((row) => row.master_id === title.id)
          ? "running"
          : "todo";
    const existing =
      state === "todo"
        ? (audio.find((file) => file.audioState === "mix") ?? null)
        : null;
    // The Brief and the Catalogue disagree on who mixes: said, never
    // overwritten (PROJ-BUG-06).
    const credited = (rows.creditsOf.get(title.id) ?? []).filter(
      (credit) => credit.role === "mix_engineer",
    );
    const briefMixer = brief?.mixContactId
      ? rows.contacts.find((c) => c.id === brief.mixContactId)
      : null;
    const divergence =
      briefMixer &&
      credited.length > 0 &&
      !credited.some((credit) => credit.contactId === briefMixer.id)
        ? {
            brief: briefMixer.name,
            catalogue: credited.map((credit) => credit.name).join(", "),
          }
        : null;
    return {
      id: title.id,
      title: title.title,
      state,
      existingMix: existing
        ? { id: existing.id, fileName: existing.fileName }
        : null,
      divergence,
    };
  });

  // A title already at its master final needs no mix: it is not sent; nor
  // is a title of the mix round that has its Mix final (never mixed twice).
  const titles: PlannedTitle[] = rows.titles.flatMap((title) => {
    const audio = rows.audioOf.get(title.id) ?? [];
    if (hasMasterFinal(audio)) return [];
    if (role === "mix" && mixFinal.has(title.id)) return [];
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

  // Signed with the viewer's session: the storage policies decide.
  const sourceIds = titles.flatMap((title) =>
    title.source ? [[title.id, title.source.id] as const] : [],
  );
  const sourceUrls: Record<string, string> = {};
  if (sourceIds.length > 0) {
    const { data: files } = await supabase
      .from("master_files")
      .select("id, path")
      .in(
        "id",
        sourceIds.map(([, id]) => id),
      );
    const signed = files?.length
      ? await supabase.storage.from("master-files").createSignedUrls(
          files.map((file) => file.path),
          3600,
        )
      : null;
    const urlOfPath = new Map(
      (signed?.data ?? []).flatMap((entry) =>
        entry.path && entry.signedUrl ? [[entry.path, entry.signedUrl]] : [],
      ),
    );
    for (const [titleId, fileId] of sourceIds) {
      const path = files?.find((file) => file.id === fileId)?.path;
      const url = path ? urlOfPath.get(path) : undefined;
      if (url) sourceUrls[titleId] = url;
    }
  }

  const reusesMixLink =
    role === "mastering" && contact
      ? (
          await supabase
            .from("master_transmissions")
            .select("id")
            .eq("project_id", project.id)
            .eq("role", "mix")
            .eq("contact_id", contact.id)
            .is("revoked_at", null)
            .gt("expires_at", new Date().toISOString())
            .limit(1)
        ).data?.length === 1
      : false;

  const t = fr.masterWorkflow.mix.blockers;
  const mixedAll =
    role === "mix" &&
    titles.length === 0 &&
    diagnosis.some((row) => row.state === "done");
  const r = fr.masterRound.blockers;
  const rec = recorded.data;
  // A title's step keeps it in the address (a collective, lot 8): a
  // blocker opens that title, not the first one.
  const at = (step: "source" | "brief" | "mix", masterId?: string) =>
    `${masterStepHref(project.id, step)}${masterId ? `?titre=${masterId}` : ""}`;
  const blockers: Blocker[] = [
    ...(!rec?.recorded_at
      ? [{ text: r.briefNotRecorded, href: at("brief") }]
      : rec.content_changed_at > rec.recorded_at
        ? [{ text: r.briefDirty(contact?.name ?? ""), href: at("brief") }]
        : []),
    ...(contact
      ? []
      : [
          {
            text: role === "mix" ? t.engineer : t.masteringEngineer,
            href: at("brief"),
          },
        ]),
    // Nothing to lift: every title is already past this stage.
    ...(titles.length === 0
      ? [{ text: mixedAll ? t.allMixed : t.noTitle, href: null }]
      : []),
    ...titles
      .filter((title) => !title.source)
      .map((title) =>
        role === "mix"
          ? { text: t.source(title.title), href: at("source", title.id) }
          : { text: t.mixFinal(title.title), href: at("mix", title.id) },
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
    finished: rows.titles.length - titles.length,
    blockers,
    history: (history.data ?? []).map((row) => ({
      id: row.id,
      sentAt: row.created_at,
      sentBy: row.sender
        ? personName(row.sender.first_name, row.sender.last_name)
        : null,
      engineer: row.contact?.name ?? "",
      note: row.note,
      linkSentAt: row.link_sent_at,
      openedAt: row.opened_at,
      acknowledgedAt: row.acknowledged_at,
      deliveredAt: row.delivered_at,
      revokedAt: row.revoked_at,
      revokeReason: row.revoke_reason,
      expiresAt: row.expires_at,
      withoutStems: withoutStemsOf(row.derogations),
      continued: row.continues_id !== null,
    })),
    sourceUrls,
    releaseDue: project.dueDate ?? null,
    reusesMixLink,
    diagnosis,
    canEdit: canEditProject(access, project),
    organizationId: can(access, "manage_catalog")
      ? access.organizationId
      : null,
  };
}

// Once per request for the same project, viewer and role (the workflow
// statuses and the Master's pages both read it, page loads audit).
export const loadStepView = memoPerRequest(argsKey, readStepView);
