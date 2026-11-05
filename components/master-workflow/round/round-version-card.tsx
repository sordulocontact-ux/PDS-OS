import type { ReactNode } from "react";

import { IconDisc } from "@/components/icons";
import { AudioFile } from "@/components/ui/audio-file";
import { DocumentCard } from "@/components/ui/document-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { masterJourney } from "@/lib/i18n/fr/master-journey";
import { masterRound } from "@/lib/i18n/fr/master-round";
import type { MixVersion } from "@/lib/master-workflow/mix-types";
import type { RoundStepView } from "@/lib/master-workflow/round-step";
import type { Tone } from "@/lib/ui/state-tones";
import { formatShortDay, formatShortInstant } from "@/lib/utils/day";

import { SentRequest, sentOf } from "./sent-request";
import { VersionComments } from "./version-comments";

const fr = { masterJourney, masterRound };

const t = fr.masterRound;

function statusOf(
  v: MixVersion,
  reopened: boolean,
  stage: "mix" | "mastering",
): { tone: Tone; label: string } {
  if (reopened) return { tone: "neutral", label: t.versions.states.reopened };
  if (v.decision === "approved")
    return { tone: "success", label: t.versions.states.approved[stage] };
  if (v.decision === "changes_requested")
    return { tone: "warning", label: t.versions.states.changes };
  if (v.feedbackSentAt) return { tone: "info", label: t.versions.states.sent };
  return { tone: "info", label: t.versions.states.listen };
}

/**
 * One version of a round, in the document card design (Sacha, 04/11): the
 * head « Mix V1 », who deposited it, when and on which source, its state;
 * what it corrects on the info strip (« Corrections reçues : répond à la
 * demande sur le Mix V1 »); then the file (its name in the player's
 * border), what the engineer received about it (SentRequest) and the
 * team's feedback. `children`: under the version in listening, its
 * feedback form (VersionFeedback), inside the same card.
 */
export function RoundVersionCard({
  round,
  version: v,
  previous = null,
  engineer,
  pending = false,
  menu = null,
  children,
}: {
  round: RoundStepView;
  version: MixVersion;
  // The version before it: its request is what this one corrects.
  previous?: MixVersion | null;
  engineer: string;
  // Undecided and listened to now: its feedback comes in `children`.
  pending?: boolean;
  // The validated version's « ⋯ » (« Rouvrir le mix »).
  menu?: ReactNode;
  children?: ReactNode;
}) {
  const label = fr.masterJourney.versionLabel[round.stage];
  const x = round.extras[v.id];
  const by = v.createdBy ?? engineer;
  const asked = previous ? sentOf(previous) : null;
  const status = statusOf(v, Boolean(x?.reopenedAt), round.stage);
  return (
    <DocumentCard
      name={t.versions.name(label, v.number)}
      line={t.versions.meta(
        t.versions.deposited(
          by,
          x?.viaLink ?? false,
          formatShortInstant(v.createdAt),
        ),
        "",
        x?.source ?? null,
      )}
      icon={IconDisc}
      action={
        <span className="flex items-center gap-1.5">
          <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
          {menu}
        </span>
      }
      change={
        asked && previous ? (
          <span className="flex flex-col gap-1">
            <b className="font-semibold">
              {t.chain.answers(
                label,
                previous.number,
                formatShortDay(asked.at),
              )}
            </b>
            <span className="whitespace-pre-wrap">« {asked.text} »</span>
          </span>
        ) : null
      }
    >
      <div className="flex flex-col gap-3 p-3.5">
        <AudioFile
          label={t.versions.name(label, v.number)}
          name={v.fileName}
          listenUrl={v.openUrl}
          downloadUrl={v.downloadUrl}
          className="max-w-none"
        />
        {v.decision === "approved" && !x?.reopenedAt && (
          <p className="text-[length:var(--type-body-sm)] text-[color:var(--text-secondary)]">
            {t.versions.approvedNote(
              label,
              v.decidedBy,
              v.decidedAt ? formatShortDay(v.decidedAt) : "",
            )}
          </p>
        )}
        <SentRequest version={v} engineer={engineer} />
        {x?.reopenedAt && (
          <p className="text-[length:var(--type-body-sm)]">
            {t.versions.reopenedNote(
              null,
              formatShortDay(x.reopenedAt),
              x.reopenReason ?? "",
            )}
          </p>
        )}
        {!pending && v.comments.length > 0 && (
          <VersionComments comments={v.comments} engineer={engineer} />
        )}
      </div>
      {children}
    </DocumentCard>
  );
}
