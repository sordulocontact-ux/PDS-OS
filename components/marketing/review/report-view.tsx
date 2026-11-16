import { ActivationTable } from "@/components/marketing/review/activation-table";
import { DashboardFigures } from "@/components/marketing/review/dashboard-figures";
import { EvidenceTable } from "@/components/marketing/review/evidence-table";
import { MetricTotals } from "@/components/marketing/review/metric-totals";
import { EmptyNote } from "@/components/shell/empty-state";
import { StepSection } from "@/components/shell/journey/step-section";
import { FactRow, FactRows } from "@/components/ui/fact-row";
import { InfoRow, Rows } from "@/components/ui/rows";

import { formatBriefDate } from "@/lib/framing/assess";
import { marketingReview } from "@/lib/i18n/fr/marketing-review";
import type { Dashboard } from "@/lib/marketing/dashboard";
import type {
  ReportBudget,
  ReportSection,
  ReportSnapshot,
} from "@/lib/marketing/reports/model";

const fr = { marketingReview };

const t = fr.marketingReview.reports;
const v = t.view;
const number = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 });

/**
 * One version of the report, drawn from its snapshot only (never from the
 * live data): the sections the author chose, declared and verified apart,
 * the reserves as they were at the generation.
 */
export function ReportView({
  snapshot,
  figures,
  budget,
}: {
  snapshot: ReportSnapshot;
  figures: Dashboard;
  budget: ReportBudget | null;
}) {
  const has = (s: ReportSection) => snapshot.sections.includes(s);
  const titleOf = (id: string) =>
    snapshot.activations.find((a) => a.id === id)?.title ?? "";

  return (
    <div className="flex flex-col gap-3.5 modern:gap-4">
      {has("summary") && (
        <StepSection id="summary" title={t.sections.summary}>
          <p className="text-body-sm whitespace-pre-line">
            {snapshot.summary ?? (
              <span className="text-[color:var(--text-secondary)]">
                {v.noSummary}
              </span>
            )}
          </p>
          {snapshot.excluded.length > 0 && (
            <p className="text-body-sm text-[color:var(--text-secondary)]">
              {v.excluded(snapshot.excluded.length)}
            </p>
          )}
        </StepSection>
      )}
      {has("objectives") && (
        <StepSection id="objectives" title={t.sections.objectives}>
          <FactRows>
            <FactRow
              label={v.strategic}
              value={snapshot.objectives.strategic ?? v.noStrategic}
            />
            {snapshot.objectives.kpis.length === 0 ? (
              <FactRow label={v.kpis} value={v.noKpis} />
            ) : (
              snapshot.objectives.kpis.map((k, i) => (
                <FactRow
                  key={i}
                  label={i === 0 ? v.kpis : undefined}
                  value={k.label}
                  source={[
                    k.kind === "qualitative"
                      ? v.qualitative
                      : k.target === null
                        ? v.noTarget
                        : v.target(
                            [number.format(k.target), k.unit]
                              .filter(Boolean)
                              .join(" "),
                          ),
                    k.dueOn ? formatBriefDate(k.dueOn) : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                />
              ))
            )}
          </FactRows>
        </StepSection>
      )}
      {has("activations") && (
        <StepSection id="activations" title={t.sections.activations}>
          <DashboardFigures
            dashboard={figures}
            budgetRestricted
            groups={["activations"]}
            headings={false}
          />
          <ActivationTable activations={snapshot.activations} hrefOf={null} />
        </StepSection>
      )}
      {has("results") && (
        <StepSection
          id="results"
          title={t.sections.results}
          description={v.declaredApart}
        >
          <DashboardFigures
            dashboard={figures}
            budgetRestricted
            groups={["publications", "coverage"]}
          />
        </StepSection>
      )}
      {has("statistics") && (
        <StepSection id="statistics" title={t.sections.statistics}>
          <DashboardFigures
            dashboard={figures}
            budgetRestricted
            groups={["statistics"]}
            headings={false}
          />
          <MetricTotals metrics={figures.metrics} />
        </StepSection>
      )}
      {has("budget") && (
        <StepSection id="budget" title={t.sections.budget}>
          {budget ? (
            <DashboardFigures
              dashboard={figures}
              budgetRestricted={false}
              groups={["budget"]}
              headings={false}
            />
          ) : (
            <EmptyNote>{v.budgetMissing}</EmptyNote>
          )}
        </StepSection>
      )}
      {has("reserves") && (
        <StepSection id="reserves" title={t.sections.reserves}>
          {snapshot.reserves.length === 0 ? (
            <EmptyNote>{v.noReserves}</EmptyNote>
          ) : (
            <Rows>
              {snapshot.reserves.map((r) => (
                <InfoRow
                  key={r.id}
                  title={r.description}
                  detail={`${t.reserveCategories[r.category]}${r.activationId ? ` · ${titleOf(r.activationId)}` : ""}`}
                />
              ))}
            </Rows>
          )}
          <FactRows>
            <FactRow
              label={v.recommendations}
              value={snapshot.recommendations ?? v.noRecommendations}
            />
          </FactRows>
        </StepSection>
      )}
      {has("annexes") && (
        <StepSection id="annexes" title={t.sections.annexes}>
          {snapshot.evidence.length === 0 ? (
            <EmptyNote>{v.noEvidence}</EmptyNote>
          ) : (
            <EvidenceTable
              evidence={snapshot.evidence}
              titleOf={titleOf}
              activationHref={null}
            />
          )}
        </StepSection>
      )}
    </div>
  );
}
