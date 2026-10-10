// The mix's source of a title (ticket "Workflow Master", § 1): the code
// detects the latest audio version, a person confirms it or chooses another
// (master_flow_sources), and a newer version received after the
// confirmation asks again — never a silent replacement. Pure, built by code
// from rows already read (rule 6: the model never decides a state).

import { routes } from "@/lib/auth/redirects";
import { byAudioProgress, type AudioState } from "@/lib/catalog/title-rules";
import { groupOf, type FactTitle } from "@/lib/facts/types";
import { fr } from "@/lib/i18n/fr";
import type {
  MasterFact,
  MasterFactAction,
  SourceOption,
} from "@/lib/master-workflow/types";
import { formatShortDate } from "@/lib/release/format";

export type FlowAudio = {
  id: string;
  fileName: string;
  // Always set on an audio version (checked in SQL).
  audioState: AudioState;
  version: number;
  createdAt: string;
};

/** The source confirmed last for a title. */
export type FlowSource = {
  fileId: string;
  confirmedAt: string;
  confirmedBy: string | null;
};

export type SourceRights = {
  projectId: string;
  // manage_catalog: add the first audio version.
  addAudio: boolean;
  // The project's owner: confirm or change the source.
  confirm: boolean;
};

const t = fr.masterWorkflow.inventory;

/** The title already has its master final: nothing left to mix. */
export const hasMasterFinal = (audio: FlowAudio[]) =>
  byAudioProgress(audio)[0]?.audioState === "final_master";

/** "Mise à plat · sauvee_v3.wav · v2". */
const versionText = (file: FlowAudio) =>
  [
    fr.catalog.audioStates[file.audioState],
    file.fileName,
    file.version > 1 ? t.version(file.version) : null,
  ]
    .filter(Boolean)
    .join(" · ");

/**
 * The versions a source may be: every audio version of the title but its
 * master final (the workflow's result; refused in SQL too), the most
 * advanced then newest first, as on the Audio tab.
 */
function sourceCandidates(audio: FlowAudio[]): FlowAudio[] {
  return byAudioProgress(
    audio.filter((file) => file.audioState !== "final_master"),
  );
}

function confirmAction(
  title: FactTitle & { audioState: AudioState | null },
  candidates: FlowAudio[],
  detected: FlowAudio,
  current: FlowAudio | null,
  rights: SourceRights,
): MasterFactAction {
  const options = candidates.map((file): SourceOption => ({
    fileId: file.id,
    label: versionText(file),
    hint: [
      t.source.addedOn(formatShortDate(file.createdAt)),
      file.id === current?.id ? t.source.current : null,
      file.id === detected.id ? t.source.detected : null,
    ]
      .filter(Boolean)
      .join(" · "),
  }));
  return {
    kind: "confirm_source",
    projectId: rights.projectId,
    masterId: title.id,
    title: title.title,
    currentFileId: current?.id ?? null,
    detectedFileId: detected.id,
    options,
    importState: rights.addAudio ? (title.audioState ?? "demo") : null,
  };
}

export function audioSourceFact(
  title: FactTitle & { audioState: AudioState | null },
  audio: FlowAudio[],
  source: FlowSource | null,
  rights: SourceRights,
): MasterFact {
  const base = {
    key: `source-${title.id}`,
    label: t.facts.source,
    group: groupOf(title),
    source: t.sources.audio,
    href: routes.masterAudio(title.id),
  };
  const [latest] = byAudioProgress(audio);
  if (!latest)
    return {
      ...base,
      detail: null,
      status: "missing",
      statusLabel: t.states.noAudio,
      action: rights.addAudio
        ? {
            kind: "add_audio",
            masterId: title.id,
            defaultState: title.audioState ?? "demo",
          }
        : undefined,
    };
  // The master final is the workflow's result: no source to confirm.
  if (latest.audioState === "final_master")
    return {
      ...base,
      detail: `${versionText(latest)} · ${formatShortDate(latest.createdAt)}`,
      status: "known",
      statusLabel: t.states.finalMaster,
    };

  const candidates = sourceCandidates(audio);
  const detected = candidates[0] ?? latest;
  const current = source
    ? (audio.find((file) => file.id === source.fileId) ?? null)
    : null;
  const action = rights.confirm
    ? confirmAction(title, candidates, detected, current, rights)
    : undefined;

  if (!source || !current)
    return {
      ...base,
      detail: `${versionText(detected)} · ${formatShortDate(detected.createdAt)}`,
      status: "to_confirm",
      statusLabel: t.states.sourceToConfirm,
      action,
    };

  // A version received after the confirmation, other than the source: a
  // person decides whether it replaces it.
  const newer =
    detected.id !== current.id &&
    Date.parse(detected.createdAt) > Date.parse(source.confirmedAt)
      ? detected
      : null;
  return {
    ...base,
    detail: [
      versionText(current),
      t.source.confirmed(
        formatShortDate(source.confirmedAt),
        source.confirmedBy,
      ),
      newer ? t.source.newer(newer.fileName) : null,
    ]
      .filter(Boolean)
      .join(" · "),
    status: newer ? "to_confirm" : "known",
    statusLabel: newer ? t.states.newerVersion : t.states.sourceConfirmed,
    action,
  };
}
