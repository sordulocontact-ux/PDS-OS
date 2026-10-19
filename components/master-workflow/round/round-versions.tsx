import { AudioFile } from "@/components/ui/audio-file";
import { ToneCallout } from "@/components/ui/tone-callout";
import { VersionCard } from "@/components/ui/version-card";
import { fr } from "@/lib/i18n/fr";
import type { MixVersion } from "@/lib/master-workflow/mix-types";
import type { RoundStepView } from "@/lib/master-workflow/round-step";
import type { Tone } from "@/lib/ui/state-tones";
import { formatShortDay, formatShortInstant } from "@/lib/utils/day";

import { ReopenMix, VersionDecision } from "./version-decision";
import { VersionFeedback } from "./version-feedback";

const t = fr.masterRound;

type Props = { round: RoundStepView; engineer: string; viewerIsOwner: boolean };

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
 * « Mix · n versions » (proto): per title, the latest and the validated
 * versions open, the older ones folded; each one listened to, who deposited
 * it, when and on which source, its state and what was decided; under the
 * latest, the feedback, the decision or who is awaited, and once validated
 * « Rouvrir le mix » for the owner.
 */
export function RoundVersions({ round, engineer, viewerIsOwner }: Props) {
  const label = fr.masterJourney.versionLabel[round.stage];
  const titles = round.versions.titles.filter((x) => x.versions.length > 0);
  const several = round.versions.titles.length > 1;
  if (titles.length === 0)
    return (
      <p className="text-[length:var(--type-body-sm)] text-[color:var(--text-secondary)]">
        {t.versions.none(engineer)}
      </p>
    );
  return (
    <div className="flex flex-col gap-5">
      {titles.map((title) => {
        const [latest, ...older] = title.versions;
        const extra = round.extras[latest.id];
        const approved = title.versions.find((v) => v.decision === "approved");
        const card = (v: MixVersion, open: boolean) => {
          const x = round.extras[v.id];
          const by = v.createdBy ?? engineer;
          return (
            <VersionCard
              key={v.id}
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
        };
        return (
          <section key={title.masterId} className="flex flex-col gap-3">
            <h3 className="text-[length:var(--type-body-md)] leading-[var(--type-body-md-lh)] font-semibold">
              {several ? `« ${title.title} » · ` : ""}
              {t.versions.title(label, title.versions.length)}
            </h3>
            <p className="-mt-2 text-[length:var(--type-caption)] text-[color:var(--text-secondary)]">
              {t.versions.hint}
            </p>
            {card(latest, true)}
            {older.length > 0 && (
              <VersionCard title={t.versions.previous(older.length)}>
                {older.map((v) => card(v, v.id === approved?.id))}
              </VersionCard>
            )}
            {approved ? (
              <>
                <ToneCallout tone="success">
                  {t.decision.final(label, approved.number, approved.decidedBy)}
                </ToneCallout>
                {viewerIsOwner && approved.id === latest.id && (
                  <ReopenMix
                    projectId={round.view.projectId}
                    versionId={latest.id}
                    stage={round.stage}
                  />
                )}
              </>
            ) : latest.decision === null && !extra?.reopenedAt ? (
              <>
                {extra?.working && (
                  <ToneCallout tone="warning">
                    {t.decision.working(extra.source ?? "")}
                  </ToneCallout>
                )}
                <VersionFeedback
                  projectId={round.view.projectId}
                  label={label}
                  version={latest}
                  engineer={engineer}
                  validator={round.validator ?? "—"}
                  canTransmit={
                    viewerIsOwner &&
                    !round.versions.canDecide &&
                    !latest.feedbackSentAt
                  }
                />
                {round.versions.canDecide ? (
                  <VersionDecision
                    projectId={round.view.projectId}
                    versionId={latest.id}
                    label={label}
                    engineer={engineer}
                    working={extra?.working ?? false}
                  />
                ) : (
                  <ToneCallout tone="info">
                    {t.decision.waiting(
                      round.validator ?? "—",
                      label,
                      latest.number,
                    )}
                  </ToneCallout>
                )}
              </>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
