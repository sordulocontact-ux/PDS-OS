import {
  AddReportButton,
  ReportDecisionButtons,
} from "@/components/activations/agency/report-buttons";
import { ReportSynthesis } from "@/components/activations/agency/report-synthesis";
import { EmptyNote } from "@/components/shell/empty-state";
import { PageSection } from "@/components/shell/page-section";
import { StatusBadge } from "@/components/ui/status-badge";
import { loadAgency } from "@/lib/activations/agency/queries";
import { agencyReserves } from "@/lib/activations/agency/reserves";
import type { ActivationFiche } from "@/lib/activations/fiche";
import { loadActivationFiles } from "@/lib/activations/files/queries";
import { divergentRows } from "@/lib/activations/modules";
import type { Access } from "@/lib/auth/access";
import { fr } from "@/lib/i18n/fr";
import { todayInParis } from "@/lib/insights/dates";
import { formatDate } from "@/lib/release/format";

const statusTone = {
  received: "action",
  provisional: "warning",
  complements_requested: "warning",
  archived: "neutral",
  validated: "success",
} as const;

/** The agency's report, kept as received, and what PDS decides of it, with
 * its objective reserves; the results summed by code, labelled as agency
 * data (« Bilan selon l'agence »). In the activation's page. */
export async function AgencyReports({
  fiche,
  access,
}: {
  fiche: ActivationFiche;
  access: Access;
}) {
  const {
    activation: a,
    board,
    members,
    canWrite,
    canValidate,
    project,
  } = fiche;
  const projectId = project.id;
  const [agency, files] = await Promise.all([
    loadAgency(a.id),
    loadActivationFiles(a.id),
  ]);
  const metrics = board.data.metrics.filter((m) => m.activationId === a.id);
  const reserves = agencyReserves(
    agency.rows,
    divergentRows(board.modules.rows.filter((r) => r.activation_id === a.id))
      .length,
    board.data.evidences.filter((e) => e.activationId === a.id),
    metrics,
  ).map((r) => r.label);
  const nameOf = (id: string | null) =>
    members.find((m) => m.personId === id)?.name ?? "—";
  const scope = {
    organizationId: access.organizationId ?? "",
    projectId,
    activationId: a.id,
  };
  const t = fr.activationAgency.report;

  return (
    <div id="report" className="grid scroll-mt-5 gap-8">
      <PageSection
        id="reports"
        title={t.title}
        description={t.description}
        action={
          canWrite && <AddReportButton scope={scope} today={todayInParis()} />
        }
      >
        {agency.reports.length === 0 ? (
          <EmptyNote>{t.none}</EmptyNote>
        ) : (
          <ul className="flex flex-col gap-3">
            {agency.reports.map((r) => {
              const file = r.fileId ? files.get(r.fileId) : undefined;
              return (
                <li
                  key={r.id}
                  className="flex flex-col gap-2 rounded-xl border bg-card p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium">
                      {t.receivedOn} {formatDate(r.receivedOn)}
                    </span>
                    <StatusBadge
                      size="sm"
                      tone={statusTone[r.status as keyof typeof statusTone]}
                    >
                      {t.statuses[r.status as keyof typeof t.statuses]}
                    </StatusBadge>
                  </div>
                  <p className="flex flex-wrap gap-4 text-sm">
                    {file?.href && (
                      <a
                        href={file.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline underline-offset-4"
                      >
                        {t.openFile} · {file.fileName}
                      </a>
                    )}
                    {r.url && (
                      <a
                        href={r.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="break-all underline underline-offset-4"
                      >
                        {r.url}
                      </a>
                    )}
                  </p>
                  {r.body && (
                    <details className="text-sm">
                      <summary className="w-fit cursor-pointer text-muted-foreground">
                        {t.body}
                      </summary>
                      <p className="mt-2 break-words whitespace-pre-wrap">
                        {r.body}
                      </p>
                    </details>
                  )}
                  {r.decidedAt && (
                    <p className="text-sm text-muted-foreground">
                      {t.statuses[r.status as keyof typeof t.statuses]}{" "}
                      {t.by(nameOf(r.decidedBy), formatDate(r.decidedAt))}
                      {r.comment && ` — ${r.comment}`}
                    </p>
                  )}
                  {r.reserves && r.reserves.length > 0 && (
                    <ul className="list-disc pl-5 text-sm text-muted-foreground">
                      {r.reserves.map((x) => (
                        <li key={x.key}>{x.label ?? x.key}</li>
                      ))}
                    </ul>
                  )}
                  {canWrite && r.status !== "validated" && (
                    <ReportDecisionButtons
                      projectId={projectId}
                      activationId={a.id}
                      reportId={r.id}
                      reserves={reserves}
                      canValidate={canValidate}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </PageSection>
      <ReportSynthesis
        sources={agency.sources}
        rows={agency.rows}
        metrics={metrics}
      />
    </div>
  );
}
