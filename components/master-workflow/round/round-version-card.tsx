import { AudioFile } from "@/components/ui/audio-file";
import { VersionCard } from "@/components/ui/version-card";
import { fr } from "@/lib/i18n/fr";
import type { MixVersion } from "@/lib/master-workflow/mix-types";
import type { RoundStepView } from "@/lib/master-workflow/round-step";
import type { Tone } from "@/lib/ui/state-tones";
import { formatShortDay, formatShortInstant } from "@/lib/utils/day";

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
 * One version of a round (proto): listened to, who deposited it, when and
 * on which source, its state and what was decided.
 */
export function RoundVersionCard({
  round,
  version: v,
  engineer,
  open,
}: {
  round: RoundStepView;
  version: MixVersion;
  engineer: string;
  open: boolean;
}) {
  const label = fr.masterJourney.versionLabel[round.stage];
  const x = round.extras[v.id];
  const by = v.createdBy ?? engineer;
  return (
    <VersionCard
      title={`${t.versions.name(label, v.number)} · ${v.fileName}`}
      status={statusOf(v, Boolean(x?.reopenedAt), round.stage)}
      defaultOpen={open}
    >
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
      {v.decision === "changes_requested" && (
        <p className="text-[length:var(--type-body-sm)]">
          {t.versions.changesNote(
            v.decidedBy,
            formatShortDay(v.decidedAt ?? v.createdAt),
            v.feedbackSummary ?? v.decisionNote ?? "",
          )}
        </p>
      )}
      {!v.decision && v.feedbackSentAt && v.feedbackSummary && (
        <p className="text-[length:var(--type-body-sm)]">
          {t.versions.sentNote(
            formatShortDay(v.feedbackSentAt),
            v.feedbackSummary,
          )}
        </p>
      )}
      {x?.reopenedAt && (
        <p className="text-[length:var(--type-body-sm)]">
          {t.versions.reopenedNote(
            null,
            formatShortDay(x.reopenedAt),
            x.reopenReason ?? "",
          )}
        </p>
      )}
    </VersionCard>
  );
}
