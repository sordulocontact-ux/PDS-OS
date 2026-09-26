import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";

import { CreateProjectForm } from "@/components/projects/create-project-form";
import { PageContainer } from "@/components/shell/page-container";
import { PageHeader } from "@/components/shell/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { listArtists, listOwnerCandidates } from "@/lib/projects/queries";

export default async function NewProjectPage() {
  const access = await requireApproved();
  const t = fr.shell.newProject;
  const [artists, owners] = await Promise.all([
    listArtists(),
    listOwnerCandidates(),
  ]);

  return (
    <PageContainer className="max-w-2xl">
      <Link
        href={routes.projects}
        className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4" aria-hidden />
        {fr.shell.project.back}
      </Link>
      <PageHeader title={t.title} description={t.subtitle} />
      <Card>
        <CardContent>
          <CreateProjectForm
            artists={artists}
            owners={owners}
            defaultOwnerId={access.personId}
          />
        </CardContent>
      </Card>
    </PageContainer>
  );
}
