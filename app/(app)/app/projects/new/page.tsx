import { IconArrowLeft } from "@/components/icons";
import Link from "next/link";

import { CreateProjectForm } from "@/components/projects/create-project-form";
import { PageContainer } from "@/components/shell/page-container";
import { PageHeader } from "@/components/shell/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { requirePermission } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { listArtistOptions, listMasterOptions } from "@/lib/catalog/queries";
import { fr } from "@/lib/i18n/fr";

// ?master=<id>: opened from a master page — that master is linked, the type
// is a music release and the title is the master's. Everything stays editable.
export default async function NewProjectPage({
  searchParams,
}: PageProps<"/app/projects/new">) {
  await requirePermission("create_projects");
  const t = fr.shell.newProject;
  const { master: masterParam } = await searchParams;
  const [masters, artists] = await Promise.all([
    listMasterOptions(),
    listArtistOptions(),
  ]);
  const fromMaster =
    typeof masterParam === "string"
      ? masters.find((m) => m.id === masterParam)
      : undefined;

  return (
    <PageContainer className="max-w-2xl">
      <Link
        href={fromMaster ? routes.master(fromMaster.id) : routes.projects}
        className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <IconArrowLeft className="size-4" aria-hidden />
        {fromMaster
          ? fr.catalog.master.backTo(fromMaster.title)
          : fr.shell.project.back}
      </Link>
      <PageHeader title={t.title} description={t.subtitle} />
      <Card>
        <CardContent>
          <CreateProjectForm
            masters={masters}
            artists={artists}
            defaults={
              fromMaster
                ? {
                    title: fromMaster.title,
                    type: "music_release",
                    masterIds: [fromMaster.id],
                  }
                : { title: "", type: null, masterIds: [] }
            }
          />
        </CardContent>
      </Card>
    </PageContainer>
  );
}
