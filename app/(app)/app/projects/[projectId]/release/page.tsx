import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ReleaseForm } from "@/components/release/release-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireApproved } from "@/lib/auth/dal";
import { requireLaunchedProject } from "@/lib/projects/queries";
import { fr } from "@/lib/i18n/fr";
import { getProjectRelease } from "@/lib/release/queries";
import { isUuid } from "@/lib/release/uuid";
import { createClient } from "@/lib/supabase/server";
import { allInOrder } from "@/lib/utils/parallel";

import { saveRelease } from "./actions";

const t = fr.release;

export const metadata: Metadata = { title: `${t.page.title} · ${fr.app.name}` };

// Distribution, Préparation: the release's identifiers and date. Detection
// and smartlink live on the next step, En ligne (./online).
export default async function ReleasePage({
  params,
}: PageProps<"/app/projects/[projectId]/release">) {
  const { projectId } = await params;
  if (!isUuid(projectId)) notFound();
  const [, , data] = await allInOrder([
    requireApproved(),
    requireLaunchedProject(projectId),
    createClient().then((supabase) => getProjectRelease(supabase, projectId)),
  ]);
  if (!data) notFound();
  const { project, release } = data;

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

      <Card className="max-w-3xl">
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
