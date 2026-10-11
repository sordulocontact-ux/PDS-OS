import { notFound } from "next/navigation";

import { ReportPreparation } from "@/components/marketing/review/report-preparation";
import { BackLink } from "@/components/shell/back-link";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { loadMarketing } from "@/lib/marketing/queries";
import { listReports } from "@/lib/marketing/reports/queries";
import { loadReserves } from "@/lib/marketing/reserves/queries";
import { requireLaunchedProject } from "@/lib/projects/queries";
import { allInOrder } from "@/lib/utils/parallel";

const t = fr.marketingReview.reports;

export const metadata = { title: `${t.prepare} · ${fr.app.name}` };

/** Écran 2: preparing the next version of the report (contributors only). */
export default async function PrepareMarketingReportPage({
  params,
}: PageProps<"/app/projects/[projectId]/review/reports/new">) {
  const { projectId } = await params;
  const [access] = await allInOrder([
    requireApproved(),
    requireLaunchedProject(projectId),
  ]);
  const [marketing, reports, reserves] = await Promise.all([
    loadMarketing(projectId, access),
    listReports(projectId, access),
    loadReserves(projectId, access),
  ]);
  if (
    !marketing.canContribute ||
    !marketing.activations.some((a) => a.archivedAt === null)
  )
    notFound();
  const nextVersion = (reports[0]?.version ?? 0) + 1;

  return (
    <div className="grid gap-6">
      <header className="grid gap-2">
        <BackLink href={routes.projectReviewReports(projectId)}>
          {t.back}
        </BackLink>
        <h2 className="text-display-sm font-semibold">
          {t.preparation.title(nextVersion)}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t.preparation.description}
        </p>
      </header>
      <ReportPreparation
        projectId={projectId}
        nextVersion={nextVersion}
        activations={marketing.activations}
        evidence={marketing.evidence}
        openReserves={reserves.filter(
          (r) => r.status === "open" || r.status === "arbitrated",
        )}
      />
    </div>
  );
}
