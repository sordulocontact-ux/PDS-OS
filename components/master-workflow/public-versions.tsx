import { StatusBadge } from "@/components/ui/status-badge";
import { sectionCardClass } from "@/components/ui/section-card";
import { fr } from "@/lib/i18n/fr";
import type { PublicPackage } from "@/lib/master-workflow/transmission-public";
import { formatShortDate } from "@/lib/release/format";
import type { Tone } from "@/lib/ui/state-tones";

type Version = Extract<
  PublicPackage,
  { state: "open" | "received" }
>["versions"][number];

const stateOf = (v: Version) =>
  v.decision ?? (v.sentAt ? "feedback_sent" : "received");

const TONE: Record<ReturnType<typeof stateOf>, Tone> = {
  approved: "success",
  changes_requested: "warning",
  reopened: "neutral",
  feedback_sent: "info",
  received: "neutral",
};

/**
 * « Vos versions », on the engineer's page (PROJ-BUG-08): each version they
 * delivered, newest first, its state, the feedback of the label written
 * once, the decision with its date and author and what comes next. A Mix
 * validation never reads as a Master one.
 */
export function PublicVersions({
  role,
  versions,
}: {
  role: "mix" | "mastering";
  versions: Version[];
}) {
  const t = fr.masterWorkflow.publicPackage.versions;
  if (versions.length === 0) return null;
  return (
    <section className={sectionCardClass} aria-labelledby="public-versions">
      <h2 id="public-versions" className="text-base font-medium">
        {t.title}
      </h2>
      <ul className="mt-4 flex flex-col gap-5">
        {versions.map((v) => {
          const state = stateOf(v);
          // Each version speaks of its own stage: a Mix validation never
          // reads as a Master one.
          const stage = v.stage ?? role;
          return (
            <li key={`${v.masterId}-${v.number}`} className="grid gap-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium">
                  {t.heading(v.title, v.number, formatShortDate(v.receivedAt))}
                </p>
                <StatusBadge tone={TONE[state]} size="sm">
                  {t.states[stage][state]}
                </StatusBadge>
              </div>
              {v.summary && v.sentAt && (
                <div className="grid gap-0.5">
                  <p className="text-caption text-[color:var(--text-secondary)]">
                    {t.feedbackSent(formatShortDate(v.sentAt))}
                  </p>
                  <p className="text-sm whitespace-pre-wrap">{v.summary}</p>
                </div>
              )}
              {v.decision === "reopened" && v.reopenedAt && (
                <p className="text-sm font-medium">
                  {t.reopened(
                    formatShortDate(v.reopenedAt),
                    v.reopenReason ?? "",
                  )}
                </p>
              )}
              {v.decision && v.decision !== "reopened" && v.decidedAt && (
                <p className="text-sm font-medium">
                  {t.decided[stage][v.decision](
                    formatShortDate(v.decidedAt),
                    v.decidedBy,
                  )}
                </p>
              )}
              {v.decisionNote && (
                <p className="text-sm whitespace-pre-wrap">
                  {t.note(v.decisionNote)}
                </p>
              )}
              {v.decision === "approved" && (
                <p className="text-caption text-[color:var(--text-secondary)]">
                  {t.next[stage]}
                </p>
              )}
              {state === "received" && (
                <p className="text-caption text-[color:var(--text-secondary)]">
                  {t.listening}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
