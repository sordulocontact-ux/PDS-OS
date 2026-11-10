import { StepSection } from "@/components/shell/journey/step-section";
import { ShareBrief } from "@/components/strategy/validated/share-brief";
import { buttonVariants, ButtonRoll } from "@/components/ui/button";
import { DocumentCard } from "@/components/ui/document-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { ViewLink } from "@/components/ui/view-link";
import { routes } from "@/lib/auth/redirects";
import { strategyBriefOut } from "@/lib/i18n/fr/strategy-brief-out";
import { latestOf, type DocumentKind } from "@/lib/strategy/documents/model";
import type { StrategyDocument } from "@/lib/strategy/documents/queries";
import { myValidationTone, strategyDocumentTone } from "@/lib/ui/state-tones";

const fr = { strategyBriefOut };

const t = fr.strategyBriefOut.final;

const outline = buttonVariants({ variant: "outline", size: "sm" });
const primary = buttonVariants({ size: "sm" });

/**
 * « Documents » of the validated Stratégie (proto st4, ticket § 10–13), one
 * `DocumentCard` each, as the documents of the Master and the Juridique:
 * the Brief de sortie (interne, avec le budget) — Voir, Partager — then the
 * Plan de sortie and the Dossier de presse with their real state;
 * « Générer » or « Ouvrir » opens their generator. Both are optional (ticket
 * § 9); a document the viewer was asked about (a validation, a change asked
 * back) says « À vous » and its button leads to the gesture (`mine`).
 */
export function StrategyDocumentRows({
  projectId,
  approved,
  documents,
  mine,
}: {
  projectId: string;
  approved: StrategyDocument;
  documents: StrategyDocument[];
  mine: Partial<Record<Exclude<DocumentKind, "brief">, string>>;
}) {
  const generated = (
    kind: Exclude<DocumentKind, "brief">,
    title: string,
    audience: string,
    href: string,
  ) => {
    const doc = latestOf(documents, kind);
    const state = doc?.state ?? "to_generate";
    const gesture = mine[kind];
    return (
      <DocumentCard
        key={kind}
        name={title}
        line={audience}
        action={
          <span className="flex flex-wrap items-center gap-2">
            {gesture && (
              <StatusBadge tone={myValidationTone} size="sm">
                {t.mine}
              </StatusBadge>
            )}
            <StatusBadge
              tone={strategyDocumentTone[state] ?? "neutral"}
              size="sm"
            >
              {t.states[state as keyof typeof t.states] ?? state}
            </StatusBadge>
            <ViewLink
              href={gesture ?? href}
              className={gesture ? primary : outline}
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
    <StepSection title={t.documents}>
      <div className="flex flex-col gap-2.5">
        <DocumentCard
          name={t.brief(approved.version)}
          line={t.briefFor}
          action={
            <span className="flex flex-wrap items-center gap-2">
              <StatusBadge tone="success" size="sm">
                {t.states.approved}
              </StatusBadge>
              <a
                href={routes.projectStrategyDocumentPdf(projectId, approved.id)}
                target="_blank"
                rel="noreferrer"
                className={outline}
              >
                <ButtonRoll>{t.see}</ButtonRoll>
              </a>
              {/* A third gesture beside an outlined one: text only. */}
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
      </div>
    </StepSection>
  );
}
