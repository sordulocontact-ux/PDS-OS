import { AudioFile } from "@/components/ui/audio-file";
import { ToneCallout } from "@/components/ui/tone-callout";
import { VersionCard } from "@/components/ui/version-card";
import { fr } from "@/lib/i18n/fr";
import type { MixVersion } from "@/lib/master-workflow/mix-types";
import type { RoundStepView } from "@/lib/master-workflow/round-step";
import type { Tone } from "@/lib/ui/state-tones";
import { formatShortDay, formatShortInstant } from "@/lib/utils/day";

import { SentRequest, sentOf } from "./sent-request";
import { VersionComments } from "./version-comments";

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
 * One version of a round (proto), its feedback grouped with it (lot 7 of
 * Ibé's feedback): what it corrects (« Corrections reçues : répond à la
 * demande sur le Mix V1 »), the file listened to, who deposited it, when
 * and on which source, what the engineer received about it (SentRequest),
 * and the team's internal feedback with its timecodes (VersionComments) —
 * under the version still in listening, VersionFeedback shows them.
 */
export function RoundVersionCard({
  round,
  version: v,
  previous = null,
  engineer,
  open,
  pending = false,
}: {
  round: RoundStepView;
  version: MixVersion;
  // The version before it: its request is what this one corrects.
  previous?: MixVersion | null;
  engineer: string;
  open: boolean;
  // Undecided and listened to now: its feedback comes with its form below.
  pending?: boolean;
}) {
  const label = fr.masterJourney.versionLabel[round.stage];
  const x = round.extras[v.id];
  const by = v.createdBy ?? engineer;
  const asked = previous ? sentOf(previous) : null;
  return (
    <VersionCard
      title={`${t.versions.name(label, v.number)} · ${v.fileName}`}
      status={statusOf(v, Boolean(x?.reopenedAt), round.stage)}
      defaultOpen={open}
    >
      {asked && previous && (
        <ToneCallout tone="info">
          <span className="flex flex-col gap-1">
            <b className="font-semibold">
              {t.chain.answers(
                fr.masterJourney.versionLabel[round.stage],
                previous.number,
                formatShortDay(asked.at),
              )}
            </b>
            <span className="whitespace-pre-wrap">« {asked.text} »</span>
          </span>
        </ToneCallout>
      )}
      <AudioFile
        label={t.versions.name(label, v.number)}
        listenUrl={v.openUrl}
        downloadUrl={v.downloadUrl}
      />
      <p className="text-[length:var(--type-caption)] text-[color:var(--text-secondary)]">
        {t.versions.meta(
          t.versions.deposited(
            by,
            x?.viaLink ?? false,
            formatShortInstant(v.createdAt),
          ),
          "",
          x?.source ?? null,
        )}
      </p>
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
    </VersionCard>
  );
}
