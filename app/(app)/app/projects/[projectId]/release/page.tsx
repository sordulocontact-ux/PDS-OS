import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DetectionCard } from "@/components/release/detection-card";
import { ReleaseForm } from "@/components/release/release-form";
import { SmartlinkCard } from "@/components/release/smartlink-card";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { getPublicEnv } from "@/lib/env-public";
import { fr } from "@/lib/i18n/fr";
import { getProjectRelease } from "@/lib/release/queries";
import { isUuid } from "@/lib/release/uuid";
import { createClient } from "@/lib/supabase/server";

import { checkRelease, saveRelease, setSmartlinkEnabled } from "./actions";

const t = fr.release;

export const metadata: Metadata = { title: `${t.page.title} · ${fr.app.name}` };

// "Vérifier maintenant" queries several catalogues in a row.
export const maxDuration = 60;

export default async function ReleasePage({
  params,
}: PageProps<"/app/projects/[projectId]/release">) {
  await requireApproved();
  const { projectId } = await params;
  if (!isUuid(projectId)) notFound();

  const supabase = await createClient();
  const data = await getProjectRelease(supabase, projectId);
  if (!data) notFound();
  const { project, release, links } = data;

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

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Card>
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

        {release && (
          <div className="grid gap-6">
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
    </div>
  );
}
