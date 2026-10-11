import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ClosureSection } from "@/components/distribution/closure-section";
import { DistributionHistory } from "@/components/distribution/distribution-history";
import { ToneCallout } from "@/components/ui/tone-callout";
import { requireApproved } from "@/lib/auth/dal";
import { loadClosureView } from "@/lib/distribution/closure-queries";
import { fr } from "@/lib/i18n/fr";
import { requireLaunchedProject } from "@/lib/projects/queries";
import { isUuid } from "@/lib/release/uuid";
import { allInOrder } from "@/lib/utils/parallel";

const t = fr.distribution.closure;

export const metadata: Metadata = { title: `${t.title} · ${fr.app.name}` };

// Distribution, Clôture (ticket « Distribution » § 6.13, § 10): close the
// follow-up normally or with arbitrated reserves, validated by the
// designated validator, reopen it if needed; then the whole history.
export default async function DistributionClosurePage({
  params,
}: PageProps<"/app/projects/[projectId]/release/closure">) {
  const { projectId } = await params;
  if (!isUuid(projectId)) notFound();
  const [access, project] = await allInOrder([
    requireApproved(),
    requireLaunchedProject(projectId),
  ]);
  const view = await loadClosureView(project, access);

  return (
    <div className="grid gap-6">
      <header className="grid gap-1">
        <h2 className="text-lg font-semibold">{t.title}</h2>
        <p className="text-sm text-muted-foreground">{t.description}</p>
      </header>
      <ToneCallout tone="info">{fr.distribution.manualNotice}</ToneCallout>
      <ClosureSection projectId={projectId} view={view} />
      <DistributionHistory closures={view.closures} events={view.events} />
    </div>
  );
}
