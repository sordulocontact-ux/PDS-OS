import { StatusBadge } from "@/components/ui/status-badge";
import { ToneCallout } from "@/components/ui/tone-callout";
import { masterRound } from "@/lib/i18n/fr/master-round";
import type { MixVersion } from "@/lib/master-workflow/mix-types";
import { formatShortDay } from "@/lib/utils/day";

const fr = { masterRound };

const t = fr.masterRound;

/** What the engineer received about a version, if anything: the request
 * decided by the validator, or the feedback passed on without a decision. */
export function sentOf(v: MixVersion) {
  if (v.decision === "changes_requested")
    return {
      kind: "request" as const,
      text: v.feedbackSummary ?? v.decisionNote ?? "",
      by: v.decidedBy,
      at: v.decidedAt ?? v.createdAt,
    };
  if (!v.decision && v.feedbackSentAt && v.feedbackSummary)
    return {
      kind: "transmitted" as const,
      text: v.feedbackSummary,
      by: null,
      at: v.feedbackSentAt,
    };
  return null;
}

/**
 * « Demande de modification envoyée à Karim » (lot 7 of Ibé's feedback):
 * the words the engineer received, signed and dated, marked « Envoyé à
 * Karim » — set apart from the team's internal feedback (VersionComments).
 */
export function SentRequest({
  version,
  engineer,
}: {
  version: MixVersion;
  engineer: string;
}) {
  const sent = sentOf(version);
  if (!sent) return null;
  return (
    <ToneCallout tone={sent.kind === "request" ? "warning" : "info"}>
      <span className="flex flex-col gap-1.5">
        <span className="flex flex-wrap items-center gap-2">
          <b className="font-semibold">
            {sent.kind === "request"
              ? t.chain.request(engineer)
              : t.chain.transmitted(engineer)}
          </b>
          <StatusBadge
            tone={sent.kind === "request" ? "warning" : "info"}
            size="sm"
          >
            {t.chain.sentBadge(engineer)}
          </StatusBadge>
        </span>
        <span className="text-[length:var(--type-caption)]">
          {t.chain.sentMeta(sent.by, formatShortDay(sent.at))}
        </span>
        <span className="whitespace-pre-wrap">« {sent.text} »</span>
      </span>
    </ToneCallout>
  );
}
