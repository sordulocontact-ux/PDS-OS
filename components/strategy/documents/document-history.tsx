import { StepSection } from "@/components/shell/journey/step-section";
import { buttonVariants, ButtonRoll } from "@/components/ui/button";
import { VersionCard } from "@/components/ui/version-card";
import { ViewLink } from "@/components/ui/view-link";
import { formatDay } from "@/lib/assistant/facts";
import { strategyDocuments } from "@/lib/i18n/fr/strategy-documents";
import type { StrategyDocument } from "@/lib/strategy/documents/queries";
import { strategyDocumentTone } from "@/lib/ui/state-tones";

const fr = { strategyDocuments };

const line =
  "text-[length:var(--type-body-sm)] leading-[var(--type-body-sm-lh)] text-[color:var(--text-secondary)]";

/**
 * Every version of a document, newest first, one `VersionCard` each: its
 * state, when it was established, when it was sent, each decision with its
 * comment, and « Voir la Vn » for one that is not on screen. Nothing is
 * ever overwritten (ticket Stratégie § 9). Kind-agnostic.
 */
export function DocumentHistory({
  id,
  versions,
  hrefOf,
  currentId,
}: {
  // Its anchor (« #versions »).
  id?: string;
  versions: StrategyDocument[];
  // Where a version opens, if it can be opened.
  hrefOf?: (doc: StrategyDocument) => string;
  currentId?: string;
}) {
  const t = fr.strategyDocuments;
  if (versions.length === 0) return null;
  return (
    <StepSection id={id} title={t.history.title} className="scroll-mt-6">
      <div className="flex flex-col gap-2">
        {versions.map((v) => (
          <VersionCard
            key={v.id}
            title={t.version(v.version)}
            status={{
              tone: strategyDocumentTone[v.state] ?? "neutral",
              label: t.states[v.state],
            }}
            meta={t.history.entry(formatDay(v.createdAt), v.createdByName)}
            defaultOpen={v.id === currentId}
          >
            {v.sentAt && (
              <p className={line}>{t.history.sentOn(formatDay(v.sentAt))}</p>
            )}
            {v.reviews
              .filter((r) => r.decidedAt)
              .map((r) => (
                <p key={r.id} className={line}>
                  {t.history.decision(
                    r.name,
                    t.reviewStates[r.state],
                    formatDay(r.decidedAt!),
                  )}
                  {r.comment ? ` — ${r.comment}` : ""}
                </p>
              ))}
            {hrefOf && v.id !== currentId && (
              <ViewLink
                href={hrefOf(v)}
                className={buttonVariants({
                  variant: "outline",
                  size: "sm",
                  className: "self-start",
                })}
              >
                <ButtonRoll>{t.versionView.seeVersion(v.version)}</ButtonRoll>
              </ViewLink>
            )}
          </VersionCard>
        ))}
      </div>
    </StepSection>
  );
}
