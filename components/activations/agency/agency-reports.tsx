import {
  AddReportButton,
  ReportDecisionButtons,
} from "@/components/activations/agency/report-buttons";
import { ReportSynthesis } from "@/components/activations/agency/report-synthesis";
import { EmptyNote } from "@/components/shell/empty-state";
import { ActivationSection } from "@/components/activations/activation-section";
import { Fold } from "@/components/ui/fold";
import { VersionCard } from "@/components/ui/version-card";
import { loadAgency } from "@/lib/activations/agency/queries";
import { agencyReserves } from "@/lib/activations/agency/reserves";
import type { ActivationFiche } from "@/lib/activations/fiche";
import { loadActivationFiles } from "@/lib/activations/files/queries";
import { divergentRows } from "@/lib/activations/modules";
import type { Access } from "@/lib/auth/access";
import { activationAgency } from "@/lib/i18n/fr/activation-agency";
import { todayInParis } from "@/lib/insights/dates";
import { formatDate } from "@/lib/release/format";

const fr = { activationAgency };

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
      <ActivationSection
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
          <div className="flex flex-col gap-3">
            {agency.reports.map((r, i) => {
              const file = r.fileId ? files.get(r.fileId) : undefined;
              return (
                <VersionCard
                  key={r.id}
                  title={`${t.receivedOn} ${formatDate(r.receivedOn)}`}
                  status={{
                    tone: statusTone[r.status as keyof typeof statusTone],
                    label: t.statuses[r.status as keyof typeof t.statuses],
                  }}
                  defaultOpen={i === 0 || r.status !== "validated"}
                >
                  {(file?.href || r.url) && (
                    <p className="flex flex-wrap gap-4 text-body-sm">
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
                  )}
                  {r.body && (
                    <Fold summary={t.body}>
                      <p className="text-body-sm break-words whitespace-pre-wrap">
                        {r.body}
                      </p>
                    </Fold>
                  )}
                  {r.decidedAt && (
                    <p className="text-body-sm text-[color:var(--text-secondary)]">
                      {t.statuses[r.status as keyof typeof t.statuses]}{" "}
                      {t.by(nameOf(r.decidedBy), formatDate(r.decidedAt))}
                      {r.comment && ` — ${r.comment}`}
                    </p>
                  )}
                  {r.reserves && r.reserves.length > 0 && (
                    <ul className="list-disc pl-5 text-body-sm text-[color:var(--text-secondary)]">
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
                </VersionCard>
              );
            })}
          </div>
        )}
      </ActivationSection>
      <ReportSynthesis
        sources={agency.sources}
        rows={agency.rows}
        metrics={metrics}
      />
    </div>
  );
}
