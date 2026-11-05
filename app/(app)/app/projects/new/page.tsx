import { FormMessage } from "@/components/auth/form-message";
import { CreateProjectForm } from "@/components/projects/create-project-form";
import { BackLink } from "@/components/shell/back-link";
import { PageContainer } from "@/components/shell/page-container";
import { PageHeader } from "@/components/shell/page-header";
import { requirePermission } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { listArtistOptions, listMasterOptions } from "@/lib/catalog/queries";
import { fr } from "@/lib/i18n/fr";
import { listContentFormats } from "@/lib/projects/content-formats";
import { listCreativePeople } from "@/lib/projects/creatives";
import { draftDefaults, getProjectDraft } from "@/lib/projects/drafts";
import { listAssignablePeople } from "@/lib/projects/queries";

export const metadata = {
  title: `${fr.shell.newProject.title} · ${fr.app.name}`,
};

// ?master=<id>: opened from a master page — that master is linked, the
// project is a music single and the title is the master's. Everything stays
// editable.
// ?draft=<id>: resumes a draft of this form (feedback n°6), opened from the
// projects list where the drafts are listed with a "Brouillon" badge.
export default async function NewProjectPage({
  searchParams,
}: PageProps<"/app/projects/new">) {
  const access = await requirePermission("create_projects");
  const t = fr.shell.newProject;
  const { master: masterParam, draft: draftParam } = await searchParams;
  const draftId = typeof draftParam === "string" ? draftParam : null;
  const organizationId = access.organizationId ?? "";
  const [masters, artists, contentFormats, managers, creatives, draft] =
    await Promise.all([
      listMasterOptions(),
      listArtistOptions(),
      listContentFormats(),
      listAssignablePeople(organizationId),
      listCreativePeople(organizationId),
      draftId ? getProjectDraft(draftId) : null,
    ]);
  const fromMaster =
    typeof masterParam === "string"
      ? masters.find((m) => m.id === masterParam)
      : undefined;

  return (
    <PageContainer className="max-w-2xl">
      <BackLink
        href={fromMaster ? routes.master(fromMaster.id) : routes.projects}
      >
        {fromMaster
          ? fr.catalog.master.backTo(fromMaster.title)
          : fr.shell.project.back}
      </BackLink>
      <PageHeader title={t.title} description={t.subtitle} />
      {draftId && !draft && (
        <FormMessage kind="error">{t.draft.notFound}</FormMessage>
      )}
      <CreateProjectForm
        // A new form for each draft: nothing carried from the last one.
        key={draft ? draftId : "new"}
        masters={masters}
        artists={artists}
        contentFormats={contentFormats}
        managers={managers}
        creatives={creatives}
        draftId={draft ? draftId : null}
        defaults={
          draft
            ? draftDefaults(draft)
            : fromMaster
              ? {
                  title: fromMaster.title,
                  type: "music_release",
                  musicFormat: "single",
                  masterIds: [fromMaster.id],
                }
              : { title: "", type: null, masterIds: [] }
        }
      />
    </PageContainer>
  );
}
