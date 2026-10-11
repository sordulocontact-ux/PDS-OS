import { ActivationTable } from "@/components/marketing/review/activation-table";
import { DashboardFigures } from "@/components/marketing/review/dashboard-figures";
import { EvidenceTable } from "@/components/marketing/review/evidence-table";
import { MetricTotals } from "@/components/marketing/review/metric-totals";
import { EmptyNote } from "@/components/shell/empty-state";
import { PageSection } from "@/components/shell/page-section";
import { formatBriefDate } from "@/lib/framing/assess";
import { fr } from "@/lib/i18n/fr";
import type { Dashboard } from "@/lib/marketing/dashboard";
import type {
  ReportBudget,
  ReportSection,
  ReportSnapshot,
} from "@/lib/marketing/reports/model";

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
    <div className="grid gap-10">
      {has("summary") && (
        <PageSection id="summary" title={t.sections.summary}>
          <p className="text-sm whitespace-pre-line">
            {snapshot.summary ?? (
              <span className="text-muted-foreground">{v.noSummary}</span>
            )}
          </p>
          {snapshot.excluded.length > 0 && (
            <p className="text-sm text-muted-foreground">
              {v.excluded(snapshot.excluded.length)}
            </p>
          )}
        </PageSection>
      )}
      {has("objectives") && (
        <PageSection id="objectives" title={t.sections.objectives}>
          <div className="grid gap-1">
            <h3 className="text-sm font-medium">{v.strategic}</h3>
            <p className="text-sm whitespace-pre-line text-muted-foreground">
              {snapshot.objectives.strategic ?? v.noStrategic}
            </p>
          </div>
          <div className="grid gap-1">
            <h3 className="text-sm font-medium">{v.kpis}</h3>
            {snapshot.objectives.kpis.length === 0 ? (
              <p className="text-sm text-muted-foreground">{v.noKpis}</p>
            ) : (
              <ul className="grid gap-1 text-sm">
                {snapshot.objectives.kpis.map((k, i) => (
                  <li key={i}>
                    <span className="font-medium">{k.label}</span>
                    <span className="text-muted-foreground">
                      {" · "}
                      {k.kind === "qualitative"
                        ? v.qualitative
                        : k.target === null
                          ? v.noTarget
                          : v.target(
                              [number.format(k.target), k.unit]
                                .filter(Boolean)
                                .join(" "),
                            )}
                      {k.dueOn && ` · ${formatBriefDate(k.dueOn)}`}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </PageSection>
      )}
      {has("activations") && (
        <PageSection id="activations" title={t.sections.activations}>
          <DashboardFigures
            dashboard={figures}
            budgetRestricted
            groups={["activations"]}
            headings={false}
          />
          <ActivationTable activations={snapshot.activations} hrefOf={null} />
        </PageSection>
      )}
      {has("results") && (
        <PageSection
          id="results"
          title={t.sections.results}
          description={v.declaredApart}
        >
          <DashboardFigures
            dashboard={figures}
            budgetRestricted
            groups={["publications", "coverage"]}
          />
        </PageSection>
      )}
      {has("statistics") && (
        <PageSection id="statistics" title={t.sections.statistics}>
          <DashboardFigures
            dashboard={figures}
            budgetRestricted
            groups={["statistics"]}
            headings={false}
          />
          <MetricTotals metrics={figures.metrics} />
        </PageSection>
      )}
      {has("budget") && (
        <PageSection id="budget" title={t.sections.budget}>
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
        </PageSection>
      )}
      {has("reserves") && (
        <PageSection id="reserves" title={t.sections.reserves}>
          {snapshot.reserves.length === 0 ? (
            <EmptyNote>{v.noReserves}</EmptyNote>
          ) : (
            <ul className="grid gap-2">
              {snapshot.reserves.map((r) => (
                <li
                  key={r.id}
                  className="grid gap-0.5 rounded-xl border border-border p-3 text-sm"
                >
                  <span className="text-caption text-muted-foreground">
                    {t.reserveCategories[r.category]}
                    {r.activationId && ` · ${titleOf(r.activationId)}`}
                  </span>
                  <span className="font-medium">{r.description}</span>
                </li>
              ))}
            </ul>
          )}
          <div className="grid gap-1">
            <h3 className="text-sm font-medium">{v.recommendations}</h3>
            <p className="text-sm whitespace-pre-line text-muted-foreground">
              {snapshot.recommendations ?? v.noRecommendations}
            </p>
          </div>
        </PageSection>
      )}
      {has("annexes") && (
        <PageSection id="annexes" title={t.sections.annexes}>
          {snapshot.evidence.length === 0 ? (
            <EmptyNote>{v.noEvidence}</EmptyNote>
          ) : (
            <EvidenceTable
              evidence={snapshot.evidence}
              titleOf={titleOf}
              activationHref={null}
            />
          )}
        </PageSection>
      )}
    </div>
  );
}
