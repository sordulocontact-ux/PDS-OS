import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ReadinessList } from "@/components/distribution/readiness-list";
import { ReadinessSummary } from "@/components/distribution/readiness-summary";
import { ReleaseForm } from "@/components/release/release-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ToneCallout } from "@/components/ui/tone-callout";
import { requireApproved } from "@/lib/auth/dal";
import { distributionReadiness } from "@/lib/distribution/readiness";
import { loadDistributionSources } from "@/lib/distribution/sources";
import { requireLaunchedProject } from "@/lib/projects/queries";
import { fr } from "@/lib/i18n/fr";
import { formatDate } from "@/lib/release/format";
import { getProjectRelease } from "@/lib/release/queries";
import { isUuid } from "@/lib/release/uuid";
import { createClient } from "@/lib/supabase/server";
import { allInOrder } from "@/lib/utils/parallel";

import { saveRelease } from "./actions";

const t = fr.release;

export const metadata: Metadata = { title: `${t.page.title} · ${fr.app.name}` };

// Distribution, Préparation (ticket « Distribution » § 6.2-6.3): the
// contrôle de préparation — what the deposit reuses, read in each owner
// module, corrected there — then the release's own identifiers and date.
export default async function ReleasePage({
  params,
}: PageProps<"/app/projects/[projectId]/release">) {
  const { projectId } = await params;
  if (!isUuid(projectId)) notFound();
  const [access, project, data] = await allInOrder([
    requireApproved(),
    requireLaunchedProject(projectId),
    createClient().then((supabase) => getProjectRelease(supabase, projectId)),
  ]);
  if (!data) notFound();
  const { release } = data;
  const sources = await loadDistributionSources(project, access);
  const readiness = distributionReadiness(sources.input, formatDate);

  const initial = {
    title: release?.title ?? project.title,
    isrc: release?.isrc ?? "",
    upc: release?.upc ?? "",
    plannedReleaseDate: release?.planned_release_date ?? "",
    spotifyUrl: release?.spotify_url ?? "",
  };

  return (
    <div className="grid gap-6">
      <header className="grid gap-1">
        <h2 className="text-lg font-semibold">{t.page.title}</h2>
        <p className="text-sm text-muted-foreground">{t.page.description}</p>
      </header>

      <ToneCallout tone="info">{fr.distribution.manualNotice}</ToneCallout>
      <ReadinessSummary readiness={readiness} failed={sources.failed} />
      <ReadinessList items={readiness.items} />

      <Card id="release-form" className="max-w-3xl scroll-mt-6">
        <CardHeader>
          <CardTitle>
            {release ? t.form.titleEdit : t.form.titleCreate}
          </CardTitle>
          <CardDescription>{t.form.hint}</CardDescription>
        </CardHeader>
        <CardContent>
          <ReleaseForm
            action={saveRelease.bind(null, projectId)}
            initial={initial}
            isNew={!release}
          />
        </CardContent>
      </Card>
    </div>
  );
}
