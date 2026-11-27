import { redirect } from "next/navigation";

import { FormMessage } from "@/components/auth/form-message";
import { CreateProjectFormHost } from "@/components/projects/create-project-form-host";
import { SectionFrame } from "@/components/shell/section-frame";
import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { listArtistOptions, listMasterOptions } from "@/lib/catalog/queries";
import { fr } from "@/lib/i18n/fr";
import { loadCollectiveContext } from "@/lib/projects/collective-context";
import { canConvertSelection } from "@/lib/projects/collective-rules";
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
// ?selection=<id>: « Créer le projet » of a selection of artists (lot 5 of
// docs/pds-mic-plan.md) — a collective on the PDS Mic model, PDS as main
// artist, the selection's holder as manager, its artists copied. Also open
// to that holder when they manage the Catalogue without creating projects
// otherwise: they then run it.
export default async function NewProjectPage({
  searchParams,
}: PageProps<"/app/projects/new">) {
  const access = await requireApproved();
  const t = fr.shell.newProject;
  const {
    master: masterParam,
    draft: draftParam,
    selection: selectionParam,
  } = await searchParams;
  const draftId = typeof draftParam === "string" ? draftParam : null;
  const organizationId = access.organizationId ?? "";
  const direction = can(access, "create_projects");
  if (
    !direction &&
    !(typeof selectionParam === "string" && can(access, "manage_catalog"))
  )
    redirect(routes.app);

  const [masters, artists, contentFormats, managers, creatives, draft] =
    await Promise.all([
      listMasterOptions(),
      listArtistOptions(),
      listContentFormats(),
      listAssignablePeople(organizationId),
      listCreativePeople(organizationId),
      draftId && direction ? getProjectDraft(draftId) : null,
    ]);
  const collective = await loadCollectiveContext(
    access,
    artists,
    contentFormats,
  );
  const fromSelection =
    typeof selectionParam === "string"
      ? (collective?.selections.find((s) => s.id === selectionParam) ?? null)
      : null;
  // Who neither creates projects nor holds this selection: nothing here.
  if (
    !direction &&
    !(
      fromSelection &&
      canConvertSelection(access, fromSelection.holder.personId)
    )
  )
    redirect(routes.app);
  const fromMaster =
    typeof masterParam === "string"
      ? masters.find((m) => m.id === masterParam)
      : undefined;
  const holder = !direction ? (collective?.holder ?? null) : null;

  return (
    <SectionFrame
      list={false}
      className="max-w-2xl"
      title={t.title}
      description={holder ? t.collective.subtitle : t.subtitle}
      parent={
        fromSelection
          ? [
              { label: fr.shell.nav.artists, href: routes.artists },
              {
                label: fromSelection.name,
                href: routes.artistSelection(fromSelection.id),
              },
            ]
          : fromMaster
            ? [
                { label: fr.shell.nav.masters, href: routes.masters },
                { label: fromMaster.title, href: routes.master(fromMaster.id) },
              ]
            : { label: fr.shell.nav.projects, href: routes.projects }
      }
    >
      {" "}
      {draftId && !draft && direction && (
        <FormMessage kind="error">{t.draft.notFound}</FormMessage>
      )}
      <CreateProjectFormHost
        // A new form for each draft: nothing carried from the last one
        // (the draft this form saved itself excepted).
        formKey={(draft ? draftId : null) ?? fromSelection?.id ?? "new"}
        masters={masters}
        artists={artists}
        contentFormats={contentFormats}
        managers={managers}
        creatives={creatives}
        draftId={draft ? draftId : null}
        organizationId={access.organizationId ?? undefined}
        collectiveContext={collective}
        cancelHref={
          fromSelection ? routes.artistSelection(fromSelection.id) : undefined
        }
        defaults={
          draft
            ? draftDefaults(draft)
            : fromSelection
              ? {
                  title: fromSelection.name,
                  type: "content",
                  contentMode: collective?.modelFormatId ? "format" : null,
                  contentFormatId: collective?.modelFormatId ?? null,
                  collective: true,
                  mainArtistId: collective?.houseArtistId ?? null,
                  selectionId: fromSelection.id,
                  masterIds: [],
                  // The holder chosen to run it, when they may.
                  assigneePersonId: managers.some(
                    (m) => m.personId === fromSelection.holder.personId,
                  )
                    ? fromSelection.holder.personId
                    : null,
                }
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
    </SectionFrame>
  );
}
