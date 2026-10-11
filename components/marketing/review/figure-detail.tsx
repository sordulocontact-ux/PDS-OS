import Link from "next/link";

import { ActivationTable } from "@/components/marketing/review/activation-table";
import { EvidenceTable } from "@/components/marketing/review/evidence-table";
import { EmptyNote } from "@/components/shell/empty-state";
import { PageSection } from "@/components/shell/page-section";
import { Button } from "@/components/ui/button";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import type { Dashboard, FigureKey } from "@/lib/marketing/dashboard";
import type { Activation, Evidence } from "@/lib/marketing/model";

const t = fr.marketingReview.dashboard;

/**
 * What a figure counts (écran 1: « Chaque chiffre ouvre son détail et expose
 * sa règle de calcul »): its rule, then the activations or the evidence
 * behind it, each evidence with where it comes from.
 */
export function FigureDetail({
  projectId,
  figure,
  dashboard,
  activations,
  evidence,
  closeHref,
}: {
  projectId: string;
  figure: FigureKey;
  dashboard: Dashboard;
  activations: Activation[];
  evidence: Evidence[];
  closeHref: string;
}) {
  const f = dashboard.figures[figure];
  const counted = evidence.filter((e) => f.evidenceIds.includes(e.id));
  const listed = activations.filter((a) => f.activationIds.includes(a.id));
  const byEvidence =
    figure.startsWith("publications_") ||
    figure.startsWith("coverage_") ||
    figure.startsWith("statistics_");

  return (
    <PageSection
      id="detail"
      title={t.detail.title(t.figures[figure])}
      action={
        <Button
          variant="ghost"
          size="sm"
          render={<Link href={closeHref} scroll={false} />}
          nativeButton={false}
        >
          {t.detail.close}
        </Button>
      }
    >
      <p className="text-sm">
        <span className="font-medium">{t.detail.rule} : </span>
        <span className="text-muted-foreground">{t.rules[figure]}</span>
      </p>
      {figure.startsWith("budget_") ? (
        <p className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          {t.detail.budgetHint}
          <Link
            href={routes.projectBudget(projectId)}
            className="underline underline-offset-4"
          >
            {t.detail.budgetLink}
          </Link>
        </p>
      ) : figure.startsWith("reserves_") ? (
        <p className="text-sm text-muted-foreground">{t.detail.reservesHint}</p>
      ) : byEvidence && counted.length > 0 ? (
        <EvidenceTable
          evidence={counted}
          titleOf={(id) => activations.find((a) => a.id === id)?.title ?? ""}
          activationHref={(id) => routes.projectActivation(projectId, id)}
        />
      ) : !byEvidence && listed.length > 0 ? (
        <ActivationTable
          activations={listed}
          hrefOf={(id) => routes.projectActivation(projectId, id)}
        />
      ) : (
        <EmptyNote>{t.detail.none}</EmptyNote>
      )}
    </PageSection>
  );
}
