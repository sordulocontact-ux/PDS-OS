import { notFound } from "next/navigation";

import { ActivationMenu } from "@/components/marketing/activation-menu";
import { EvidenceList } from "@/components/marketing/evidence-list";
import { MarketingHistory } from "@/components/marketing/marketing-history";
import { BackLink } from "@/components/shell/back-link";
import { PageSection } from "@/components/shell/page-section";
import { FactList } from "@/components/ui/fact-list";
import { StatusBadge } from "@/components/ui/status-badge";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { formatBriefDate } from "@/lib/framing/assess";
import { fr } from "@/lib/i18n/fr";
import { EVIDENCE_KINDS } from "@/lib/marketing/model";
import { loadMarketing, loadMarketingEvents } from "@/lib/marketing/queries";
import { requireLaunchedProject } from "@/lib/projects/queries";
import { activationStatusTone } from "@/lib/ui/state-tones";
import { allInOrder } from "@/lib/utils/parallel";

const t = fr.marketing.activations;

export const metadata = { title: `${t.title} · ${fr.app.name}` };

/**
 * One activation followed by the Marketing: what it is, then its
 * publications, coverage and statistics, each with its level and where it
 * comes from, then its history (ticket « Suivi & bilan », lot 1).
 */
export default async function ActivationPage({
  params,
}: PageProps<"/app/projects/[projectId]/activations/[activationId]">) {
  const { projectId, activationId } = await params;
  const [access] = await allInOrder([
    requireApproved(),
    requireLaunchedProject(projectId),
  ]);
  const [data, events] = await Promise.all([
    loadMarketing(projectId, access),
    loadMarketingEvents(projectId, access, { activationId }),
  ]);
  const activation = data.activations.find((a) => a.id === activationId);
  if (!activation) notFound();
  const archived = activation.archivedAt !== null;
  const canContribute = data.canContribute && !archived;
  const evidence = data.evidence.filter(
    (e) => e.activationId === activation.id && e.archivedAt === null,
  );
  const f = t.facts;
  const source = activation.deliverableTitle
    ? t.fields.deliverable(activation.deliverableTitle)
    : activation.leverLabel
      ? t.fields.lever(activation.leverLabel)
      : null;

  return (
    <div className="flex flex-col gap-8 pt-6">
      <header className="flex flex-col gap-3">
        <BackLink href={routes.projectActivations(projectId)}>
          {t.back}
        </BackLink>
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-display-sm font-semibold break-words">
            {activation.title}
          </h2>
          {archived ? (
            <StatusBadge tone="neutral">{t.archivedBadge}</StatusBadge>
          ) : (
            <StatusBadge tone={activationStatusTone[activation.status]}>
              {t.statuses[activation.status]}
            </StatusBadge>
          )}
          {data.canContribute && !data.marketingClosed && (
            <span className="ml-auto">
              <ActivationMenu
                projectId={projectId}
                activation={activation}
                options={{
                  members: data.members,
                  deliverables: data.deliverables,
                  levers: data.levers,
                }}
                size="icon-lg"
              />
            </span>
          )}
        </div>
      </header>
      <FactList
        emptyLabel={f.none}
        facts={[
          { label: f.kind, value: t.kinds[activation.kind] },
          { label: f.owner, value: activation.ownerName },
          { label: f.source, value: source },
          {
            label: f.period,
            value:
              activation.startsOn || activation.endsOn
                ? f.periodRange(
                    activation.startsOn && formatBriefDate(activation.startsOn),
                    activation.endsOn && formatBriefDate(activation.endsOn),
                  )
                : null,
          },
          { label: f.note, value: activation.note },
        ]}
      />
      {EVIDENCE_KINDS.map((kind) => (
        <EvidenceList
          key={kind}
          projectId={projectId}
          activationId={activation.id}
          kind={kind}
          evidence={evidence.filter((e) => e.kind === kind)}
          canContribute={canContribute}
        />
      ))}
      <PageSection id="history" title={t.history}>
        <MarketingHistory events={events} emptyLabel={t.historyEmpty} />
      </PageSection>
    </div>
  );
}
