import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AvailabilityCard } from "@/components/distribution/availability-card";
import { PlatformsSection } from "@/components/distribution/platforms-section";
import { DetectionCard } from "@/components/release/detection-card";
import { SmartlinkCard } from "@/components/release/smartlink-card";
import { ToneCallout } from "@/components/ui/tone-callout";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { isOpen } from "@/lib/distribution/anomalies";
import { loadAnomalies } from "@/lib/distribution/anomalies-queries";
import { loadPlatformsView } from "@/lib/distribution/platforms-queries";
import { getPublicEnv } from "@/lib/env-public";
import { fr } from "@/lib/i18n/fr";
import { requireLaunchedProject } from "@/lib/projects/queries";
import { getProjectRelease } from "@/lib/release/queries";
import { isUuid } from "@/lib/release/uuid";
import { createClient } from "@/lib/supabase/server";
import { allInOrder } from "@/lib/utils/parallel";

import { checkRelease, setSmartlinkEnabled } from "../actions";

const t = fr.release;

export const metadata: Metadata = {
  title: `${t.online.title} · ${fr.app.name}`,
};

// "Vérifier maintenant" queries several catalogues in a row.
export const maxDuration = 60;

// Distribution, Plateformes (ticket « Distribution » § 6.11, CA10, CA16): the
// public availability, each platform's link, declared availability,
// verification and compliance by a person; then the automatic detection
// (only suggestions) and the public smartlink.
export default async function ReleaseOnlinePage({
  params,
}: PageProps<"/app/projects/[projectId]/release/online">) {
  const { projectId } = await params;
  if (!isUuid(projectId)) notFound();
  const [access, project, data] = await allInOrder([
    requireApproved(),
    requireLaunchedProject(projectId),
    createClient().then((supabase) => getProjectRelease(supabase, projectId)),
  ]);
  if (!data) notFound();
  const { release, links } = data;
  const [view, anomalies] = await Promise.all([
    loadPlatformsView(project, access),
    loadAnomalies(projectId, access),
  ]);

  return (
    <div className="grid gap-6">
      <header className="grid gap-1">
        <h2 className="text-lg font-semibold">{t.online.title}</h2>
        <p className="text-sm text-muted-foreground">{t.online.description}</p>
      </header>
      <ToneCallout tone="info">{fr.distribution.manualNotice}</ToneCallout>
      <AvailabilityCard projectId={projectId} view={view} />
      <PlatformsSection
        projectId={projectId}
        platforms={view.platforms}
        anomalies={anomalies.filter(isOpen)}
        canEdit={view.canEdit}
        canCheck={view.canCheck}
      />
      {release && (
        <div className="grid items-start gap-6 lg:grid-cols-2">
          <DetectionCard
            release={release}
            links={links}
            checkAction={checkRelease.bind(null, projectId)}
          />
          <SmartlinkCard
            url={`${getPublicEnv().NEXT_PUBLIC_SITE_URL.replace(/\/$/, "")}${routes.smartlink(release.smartlink_token)}`}
            enabled={release.smartlink_enabled}
            toggleAction={setSmartlinkEnabled.bind(null, projectId)}
          />
        </div>
      )}
    </div>
  );
}
