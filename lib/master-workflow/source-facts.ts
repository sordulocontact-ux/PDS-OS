// Sources and materials of the État du master, per title: the mix's source
// (audio-source.ts), the studio session it comes from, the separated
// tracks. Pure, built by code from rows already read (rule 6: the
// model never decides a state).

import { routes } from "@/lib/auth/redirects";
import type { MasterSession } from "@/lib/catalog/master/rules";
import { sessionLabel } from "@/lib/catalog/master/session-label";
import type { AudioState } from "@/lib/catalog/title-rules";
import { groupOf, type FactTitle } from "@/lib/facts/types";
import { fr } from "@/lib/i18n/fr";
import {
  audioSourceFact,
  type FlowAudio,
  type FlowSource,
  type SourceRights,
} from "@/lib/master-workflow/audio-source";
import type { MasterFact } from "@/lib/master-workflow/types";
import { viewHref } from "@/lib/ui/view-href";

export type FlowTitle = FactTitle & {
  // The title's own state: the audio import offers it first.
  audioState: AudioState | null;
};

export type FlowSession = Pick<
  MasterSession,
  "id" | "kind" | "date" | "studio" | "engineer" | "notes"
> & { createdAt: string };

const t = fr.masterWorkflow.inventory;

// Mixing and mastering sessions say who mixes or masters (engineer-facts);
// the source comes from the others (recording, production…).
const isSourceSession = (session: FlowSession) =>
  session.kind !== "mixing" && session.kind !== "mastering";

/** The latest studio session the source comes from (sessions arrive newest
 * first). Its absence is missing information, not a block. */
function sessionFact(
  title: FlowTitle,
  sessions: FlowSession[],
  canEdit: boolean,
): MasterFact {
  const session = sessions.find(isSourceSession);
  return {
    key: `session-${title.id}`,
    label: t.facts.session,
    group: groupOf(title),
    source: t.sources.sessions,
    href: routes.masterSessions(title.id),
    ...(session
      ? {
          detail: sessionLabel(session),
          status: "known",
          statusLabel: t.states.sessionKnown,
        }
      : {
          detail: null,
          status: "missing",
          statusLabel: t.states.noSession,
          action: canEdit
            ? { kind: "add_session", masterId: title.id }
            : undefined,
        }),
  };
}

/** The mix's source, then the session it comes from. */
export function sourceFacts(
  title: FlowTitle,
  audio: FlowAudio[],
  source: FlowSource | null,
  sessions: FlowSession[],
  rights: SourceRights,
): MasterFact[] {
  return [
    audioSourceFact(title, audio, source, rights),
    sessionFact(title, sessions, rights.addAudio),
  ];
}

/**
 * The separated tracks (stems) the mixer works from: counted per file, the
 * latest version of each (`stems` = the series ids of the title's stems).
 */
export function materialFacts(
  title: FlowTitle,
  stems: number,
  canEdit: boolean,
): MasterFact[] {
  return [
    {
      key: `stems-${title.id}`,
      label: t.facts.stems,
      group: groupOf(title),
      source: t.sources.files,
      href: viewHref(routes.masterFiles(title.id), { category: "stems" }),
      ...(stems > 0
        ? {
            detail: t.fileCount(stems),
            status: "known",
            statusLabel: t.states.stemsKnown,
          }
        : {
            detail: null,
            status: "missing",
            statusLabel: t.states.noStems,
            action: canEdit
              ? { kind: "add_stems", masterId: title.id }
              : undefined,
          }),
    },
  ];
}
