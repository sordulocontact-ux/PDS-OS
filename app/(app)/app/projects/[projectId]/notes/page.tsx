import { CreateCallForm } from "@/components/calls/create-call-form";
import { NewNoteButton } from "@/components/notes/new-note-button";
import { NotesListView } from "@/components/notes/notes-list-view";
import { ProjectHeader } from "@/components/projects/project-header";
import { requireApproved } from "@/lib/auth/dal";
import { callDeleter } from "@/lib/calls/delete-rule";
import { nextRoundHourInput } from "@/lib/calls/format";
import { loadCallContacts, loadCallMembers } from "@/lib/calls/invite";
import { fr } from "@/lib/i18n/fr";
import { googleMeetConfigured } from "@/lib/integrations/google-calendar";
import { loadNoteProjectOptions } from "@/lib/notes/options";
import { getNoteRows } from "@/lib/notes/queries";
import { asNoteTab } from "@/lib/notes/views";
import { canEditProject } from "@/lib/projects/edit-access";
import { requireLaunchedProject } from "@/lib/projects/queries";
import { filterValues } from "@/lib/ui/filter-options";
import { allInOrder } from "@/lib/utils/parallel";

export const metadata = { title: fr.notes.title };

/**
 * A project's Notes (Pilotage, next to Travail): the same list as the Notes
 * section, its calls opening inside the project (lib/calls/door.ts).
 * « Nouveau call » (main) and « Nouvelle note » (outline) on the title's
 * line; a project with neither shows the first call's form in place.
 */
export default async function ProjectNotesPage({
  params,
  searchParams,
}: PageProps<"/app/projects/[projectId]/notes">) {
  const { projectId } = await params;
  const query = await searchParams;
  const [access, project, rows, team, contacts, projects] = await allInOrder([
    requireApproved(),
    requireLaunchedProject(projectId),
    getNoteRows(projectId),
    loadCallMembers(projectId),
    loadCallContacts(),
    loadNoteProjectOptions(),
  ]);
  const invitable = team
    .filter((p) => p.personId !== access.personId)
    .map((p) => ({ ...p, detail: fr.callPrep.roles[p.place] }));
  const canEdit = canEditProject(access, project);
  const t = fr.calls.list;
  const now = new Date();
  const form = {
    projectId,
    defaultOccurredAt: nextRoundHourInput(now),
    team: invitable,
    contacts,
    googleMeet: googleMeetConfigured(),
  };
  const noteButton = (variant: "default" | "outline") => (
    <NewNoteButton
      projects={projects}
      projectId={projectId}
      variant={variant}
    />
  );

  return (
    <div className="flex flex-col gap-6">
      <ProjectHeader
        projectId={projectId}
        actions={
          <div className="flex items-center gap-2">
            {noteButton("outline")}
            {rows.length > 0 && (
              <CreateCallForm {...form} defaultTitle="" initiallyOpen={false} />
            )}
          </div>
        }
      />
      <NotesListView
        rows={rows}
        now={now}
        door={{ kind: "project", projectId }}
        tab={asNoteTab(query.tab)}
        project={[]}
        person={filterValues(query.person)}
        deleter={callDeleter(access)}
        projects={projects}
        empty={
          <section className="flex flex-col gap-4">
            <div className="flex max-w-prose flex-col gap-1">
              <h2 className="text-base font-medium">{t.emptyTitle}</h2>
              <p className="text-sm text-muted-foreground">
                {canEdit ? t.emptyBody : t.emptyBodyReadOnly}
              </p>
            </div>
            <CreateCallForm
              {...form}
              defaultTitle={t.firstCallTitle}
              initiallyOpen
            />
          </section>
        }
      />
    </div>
  );
}
