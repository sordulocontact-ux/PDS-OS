import { ShareBrief } from "@/components/strategy/validated/share-brief";
import { buttonVariants, ButtonRoll } from "@/components/ui/button";
import { InfoRow, Rows } from "@/components/ui/rows";
import { StatusBadge } from "@/components/ui/status-badge";
import { ViewLink } from "@/components/ui/view-link";
import { routes } from "@/lib/auth/redirects";
import { strategyBriefOut } from "@/lib/i18n/fr/strategy-brief-out";
import { latestOf, type DocumentKind } from "@/lib/strategy/documents/model";
import type { StrategyDocument } from "@/lib/strategy/documents/queries";
import { strategyDocumentTone } from "@/lib/ui/state-tones";

const fr = { strategyBriefOut };

const t = fr.strategyBriefOut.final;

/**
 * « Documents » of the validated Stratégie (proto st4, ticket § 10–13):
 * the Brief de sortie (interne, avec le budget) — Voir, Partager — then the
 * Plan de sortie and the Dossier de presse with their real state; « À
 * générer » opens their generator.
 */
export function StrategyDocumentRows({
  projectId,
  approved,
  documents,
}: {
  projectId: string;
  approved: StrategyDocument;
  documents: StrategyDocument[];
}) {
  const generated = (
    kind: Exclude<DocumentKind, "brief">,
    title: string,
    audience: string,
    href: string,
  ) => {
    const doc = latestOf(documents, kind);
    const state = doc?.state ?? "to_generate";
    return (
      <InfoRow
        key={kind}
        title={title}
        detail={audience}
        badge={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge
              tone={strategyDocumentTone[state] ?? "neutral"}
              size="sm"
            >
              {t.states[state as keyof typeof t.states] ?? state}
            </StatusBadge>
            <ViewLink
              href={href}
              className={buttonVariants({ variant: "ghost", size: "sm" })}
            >
              <ButtonRoll>{doc ? t.open : t.generate}</ButtonRoll>
            </ViewLink>
          </span>
        }
      />
    );
  };
  const briefPath = routes.projectStrategyBriefVersion(
    projectId,
    approved.version,
  );
  return (
    <section className="flex flex-col gap-2" aria-labelledby="strategy-docs">
      <h3 id="strategy-docs" className="text-body-md font-semibold">
        {t.documents}
      </h3>
      <Rows label={t.documents}>
        <InfoRow
          title={t.brief(approved.version)}
          detail={t.briefFor}
          badge={
            <span className="flex flex-wrap items-center gap-2">
              <StatusBadge tone="success" size="sm">
                {t.states.approved}
              </StatusBadge>
              <a
                href={routes.projectStrategyDocumentPdf(projectId, approved.id)}
                target="_blank"
                rel="noreferrer"
                className={buttonVariants({ variant: "ghost", size: "sm" })}
              >
                <ButtonRoll>{t.see}</ButtonRoll>
              </a>
              <ShareBrief path={briefPath} />
            </span>
          }
        />
        {generated(
          "release_plan",
          t.plan,
          t.planFor,
          routes.projectStrategyReleasePlan(projectId),
        )}
        {generated(
          "press_kit",
          t.press,
          t.pressFor,
          routes.projectStrategyPressKit(projectId),
        )}
      </Rows>
    </section>
  );
}
