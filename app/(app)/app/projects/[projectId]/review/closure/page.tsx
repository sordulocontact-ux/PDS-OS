import Link from "next/link";

import { AddReserveButton } from "@/components/marketing/closure/add-reserve-button";
import { ClosureDecision } from "@/components/marketing/closure/closure-decision";
import { ClosureReadiness } from "@/components/marketing/closure/closure-readiness";
import { ReserveList } from "@/components/marketing/closure/reserve-list";
import { MarketingHistory } from "@/components/marketing/marketing-history";
import { ActivationTable } from "@/components/marketing/review/activation-table";
import { EmptyNote } from "@/components/shell/empty-state";
import { PageSection } from "@/components/shell/page-section";
import { StatTiles } from "@/components/ui/stat-tiles";
import { StatusDot } from "@/components/ui/status-dot";
import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { formatEuros } from "@/lib/budget/types";
import { fr } from "@/lib/i18n/fr";
import { loadClosures } from "@/lib/marketing/closure/queries";
import { closureReadiness } from "@/lib/marketing/closure/readiness";
import { computeDashboard } from "@/lib/marketing/dashboard";
import { loadDashboardInput } from "@/lib/marketing/dashboard-data";
import { loadMarketingEvents } from "@/lib/marketing/queries";
import { loadApprovals } from "@/lib/marketing/reports/approvals";
import { listReports } from "@/lib/marketing/reports/queries";
import {
  loadReserveTaskOptions,
  loadReserves,
  reserveFacts,
} from "@/lib/marketing/reserves/queries";
import { formatLongDay } from "@/lib/project-history/format";
import { canEditProject } from "@/lib/projects/edit-access";
import { requireLaunchedProject } from "@/lib/projects/queries";
import { workflowStatusTone } from "@/lib/ui/state-tones";
import { allInOrder } from "@/lib/utils/parallel";
import { loadWorkflowStates } from "@/lib/workflow-status/load";

const t = fr.marketingReview.closure;

export const metadata = {
  title: `${fr.marketingReview.tabs.closure} · ${fr.app.name}`,
};

/**
 * Marketing › Clôture (ticket « Suivi & bilan », écran 4): the reference
 * report, what blocks the closing, every reserve and its arbitration, the
 * activations not finished, the administrative payments, the rights, the
 * evidence. Everything here is computed by code from the data.
 */
export default async function MarketingClosurePage({
  params,
}: PageProps<"/app/projects/[projectId]/review/closure">) {
  const { projectId } = await params;
  const [access, project] = await allInOrder([
    requireApproved(),
    requireLaunchedProject(projectId),
  ]);
  const [reserves, reports, approvals, flows, tasks, closures, events] =
    await Promise.all([
      loadReserves(projectId, access),
      listReports(projectId, access),
      loadApprovals(projectId, access),
      loadWorkflowStates(projectId),
      loadReserveTaskOptions(projectId),
      loadClosures(projectId, access),
      loadMarketingEvents(projectId, access, { limit: 80 }),
    ]);
  const { input, data } = await loadDashboardInput(
    projectId,
    access,
    project,
    reserveFacts(
      reserves,
      closures.some(
        (c) => c.state === "closed_clean" || c.state === "closed_with_reserves",
      ),
    ),
  );
  const figures = computeDashboard(input).figures;
  // The reference: the newest version approved as a provisional review, or
  // finalized by a closing since reopened.
  const reference = reports.find(
    (r) => r.state === "approved_provisional" || r.state === "finalized",
  );
  const referenceApproval = reference
    ? approvals.find(
        (a) =>
          a.reportId === reference.id && a.decision === "approved_provisional",
      )
    : undefined;
  const readiness = closureReadiness({
    referenceReportId: reference?.id ?? null,
    reserves,
    activations: data.activations,
    budget: input.budget,
  });
  const owner = canEditProject(access, project);
  const live = data.activations.filter((a) => a.archivedAt === null);
  const open = live.filter(
    (a) => a.status === "planned" || a.status === "in_progress",
  );
  const legal = flows?.states.legal;
  const value = (key: keyof typeof figures) => figures[key].value ?? 0;

  return (
    <div className="grid gap-10">
      <p className="text-sm text-muted-foreground">{t.description}</p>

      <PageSection id="reference" title={t.reference}>
        {reference && referenceApproval ? (
          <p className="flex flex-wrap items-center gap-3 text-sm">
            <span>
              {t.referenceLine(
                reference.version,
                referenceApproval.validatorName,
                formatLongDay(referenceApproval.decidedAt),
              )}
            </span>
            <Link
              href={routes.projectReviewReport(projectId, reference.id)}
              className="underline underline-offset-4"
            >
              {t.openReference}
            </Link>
          </p>
        ) : (
          <EmptyNote>{t.noReference}</EmptyNote>
        )}
      </PageSection>

      <ClosureReadiness
        readiness={readiness}
        reserveText={(id) =>
          reserves.find((r) => r.id === id)?.description ?? ""
        }
        activationTitle={(id) =>
          data.activations.find((a) => a.id === id)?.title ?? ""
        }
      />

      <ClosureDecision
        projectId={projectId}
        closures={closures}
        reference={
          reference
            ? {
                id: reference.id,
                version: reference.version,
                activations: reference.activationIds.length,
              }
            : null
        }
        readiness={readiness}
        reserves={reserves}
        viewer={{
          personId: access.personId,
          owner,
          direction: can(access, "validate"),
        }}
      />

      <PageSection
        id="reserves"
        title={t.sections.reserves}
        description={t.sections.reservesHint}
        action={
          data.canContribute && !data.marketingClosed ? (
            <AddReserveButton
              projectId={projectId}
              activations={live.map((a) => ({ id: a.id, title: a.title }))}
            />
          ) : undefined
        }
      >
        <ReserveList
          projectId={projectId}
          reserves={reserves}
          activationTitle={(id) =>
            data.activations.find((a) => a.id === id)?.title ?? null
          }
          viewer={{
            personId: access.personId,
            owner,
            direction: can(access, "validate"),
            closed: data.marketingClosed,
          }}
          members={data.members}
          tasks={tasks}
        />
      </PageSection>

      <PageSection id="open-activations" title={t.sections.activations}>
        {open.length === 0 ? (
          <EmptyNote>{t.readiness.noWarning}</EmptyNote>
        ) : (
          <ActivationTable
            activations={open}
            hrefOf={(id) => routes.projectActivation(projectId, id)}
          />
        )}
      </PageSection>

      <PageSection id="evidence" title={t.sections.evidence}>
        <p className="text-sm text-muted-foreground">
          {t.evidenceLine(
            value("publications_declared") +
              value("coverage_declared") +
              value("statistics_declared"),
            value("publications_to_verify") + value("coverage_to_verify"),
            value("publications_verified") +
              value("coverage_verified") +
              value("statistics_verified"),
            value("statistics_unavailable"),
          )}
        </p>
      </PageSection>

      <PageSection id="payments" title={t.sections.payments}>
        {input.budget ? (
          <StatTiles
            columns={3}
            stats={[
              {
                label: t.payments.committed,
                value: formatEuros(input.budget.committedCents),
              },
              {
                label: t.payments.paid,
                value: formatEuros(input.budget.paidCents),
              },
              {
                label: t.payments.unpaid,
                value: formatEuros(
                  Math.max(
                    0,
                    input.budget.committedCents - input.budget.paidCents,
                  ),
                ),
              },
            ]}
          />
        ) : (
          <EmptyNote>{t.payments.restricted}</EmptyNote>
        )}
      </PageSection>

      <PageSection id="rights" title={t.sections.rights}>
        {legal && legal !== "restricted" ? (
          <p className="flex flex-wrap items-baseline gap-2 text-sm">
            <StatusDot
              tone={workflowStatusTone[legal.status]}
              label={fr.workflowStatus.statuses[legal.status]}
              showLabel
            />
            <span className="text-muted-foreground">{legal.reason}</span>
            <Link
              href={routes.projectLegal(projectId)}
              className="underline underline-offset-4"
            >
              {t.rights.open}
            </Link>
          </p>
        ) : (
          <EmptyNote>{t.rights.restricted}</EmptyNote>
        )}
      </PageSection>
      <PageSection id="history" title={fr.marketingReview.decision.history}>
        <MarketingHistory
          events={events}
          emptyLabel={fr.marketingReview.decision.historyEmpty}
        />
      </PageSection>
    </div>
  );
}
