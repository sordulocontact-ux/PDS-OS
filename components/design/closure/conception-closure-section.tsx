import { ClosureActions } from "@/components/design/closure/closure-actions";
import { buttonVariants } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { ViewLink } from "@/components/ui/view-link";
import { routes } from "@/lib/auth/redirects";
import { formatDateTime } from "@/lib/calls/format";
import type { ConceptionClosure } from "@/lib/design/handoff-plan";
import { formatBriefDate } from "@/lib/framing/assess";
import { fr } from "@/lib/i18n/fr";

/**
 * The Conception's final state (MKT-C2-13): validated when, by whom,
 * against which Brief, with which reserves; then « Passer en Production »
 * in place of the finished design actions, and the reopenings kept.
 */
export function ConceptionClosureSection({
  projectId,
  closure: c,
  isOwner,
  canReopen,
}: {
  projectId: string;
  closure: ConceptionClosure;
  isOwner: boolean;
  canReopen: boolean;
}) {
  const t = fr.conceptionClosure;
  const handed = c.items.filter((i) => i.state === "handed").length;
  const reserves = c.items.reduce((n, i) => n + i.reserves.length, 0);
  const pending = c.items.some((i) => i.state === "ready");
  const canPass = isOwner && c.productionState !== "validated";
  return (
    <section
      id="conception-closure"
      aria-labelledby="conception-closure-title"
      className="flex scroll-mt-6 flex-col gap-4 rounded-2xl bg-[var(--tone-success-bg)] p-5 text-[color:var(--tone-success-fg)]"
    >
      <div className="flex flex-wrap items-center gap-2">
        <h2
          id="conception-closure-title"
          className="text-display-sm font-semibold"
        >
          {t.title}
        </h2>
        <StatusBadge tone="success" size="sm">
          {t.handedSummary(handed, c.items.length)}
        </StatusBadge>
      </div>
      <div className="flex flex-col gap-1 text-body-md">
        {c.closedAt && (
          <span>
            {t.validatedOn(
              formatBriefDate(c.closedAt.slice(0, 10)),
              c.validatorName,
            )}
          </span>
        )}
        {c.briefNumber !== null && (
          <span>
            {t.brief(c.briefNumber)} ·{" "}
            <ViewLink
              href={routes.projectDesignBrief(projectId, c.briefNumber)}
              className="underline underline-offset-2"
            >
              {t.openBrief}
            </ViewLink>
          </span>
        )}
        {c.comment && <span>{t.comment(c.comment)}</span>}
        {reserves > 0 && <span>{t.reserves(reserves)}</span>}
        {!isOwner && pending && <span>{t.ownerOnly}</span>}
      </div>
      <div className="flex flex-wrap gap-2">
        {(canPass || canReopen) && (
          <ClosureActions
            projectId={projectId}
            items={c.items}
            canPass={canPass && (pending || handed === 0)}
            canReopen={canReopen}
          />
        )}
        {(handed > 0 || c.productionState !== "not_started") && (
          <ViewLink
            href={routes.projectProduction(projectId)}
            className={buttonVariants({ variant: "outline", size: "lg" })}
          >
            {t.openProduction}
          </ViewLink>
        )}
      </div>
      {c.reopenings.length > 0 && (
        <div className="flex flex-col gap-1 text-caption">
          <span className="font-medium">{t.history}</span>
          {c.reopenings.map((r) => (
            <span key={r.at}>
              {t.historyLine(formatDateTime(r.at), r.by, r.reason)}
            </span>
          ))}
        </div>
      )}
    </section>
  );
}
