import { CallsListView } from "@/components/calls/calls-list-view";
import { CreateCallForm } from "@/components/calls/create-call-form";
import { ProjectHeader } from "@/components/projects/project-header";
import { callDeleter } from "@/lib/calls/delete-rule";
import { requireApproved } from "@/lib/auth/dal";
import { asCallView, nextRoundHourInput } from "@/lib/calls/format";
import { loadCallContacts, loadCallMembers } from "@/lib/calls/invite";
import { listAllCalls } from "@/lib/calls/queries";
import { fr } from "@/lib/i18n/fr";
import { googleMeetConfigured } from "@/lib/integrations/google-calendar";
import { canEditProject } from "@/lib/projects/edit-access";
import { requireLaunchedProject } from "@/lib/projects/queries";
import { createClient } from "@/lib/supabase/server";
import { allInOrder } from "@/lib/utils/parallel";

export const metadata = { title: fr.calls.list.title };

/**
 * A project's Calls (Pilotage, next to Travail): the same list as the Calls
 * section, its calls opening inside the project (lib/calls/door.ts).
 * « Nouveau call » on the title's line for the owner; a project without a
 * call shows the form in place, its only action.
 */
export default async function ProjectCallsPage({
  params,
  searchParams,
}: PageProps<"/app/projects/[projectId]/calls">) {
  const { projectId } = await params;
  const { view } = await searchParams;
  const [access, project, calls, team, contacts] = await allInOrder([
    requireApproved(),
    requireLaunchedProject(projectId),
    createClient().then((supabase) => listAllCalls(supabase, { projectId })),
    loadCallMembers(projectId),
    loadCallContacts(),
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

  return (
    <div className="flex flex-col gap-6">
      <ProjectHeader
        projectId={projectId}
        actions={
          calls.length > 0 && (
            <CreateCallForm {...form} defaultTitle="" initiallyOpen={false} />
          )
        }
      />
      <CallsListView
        calls={calls}
        now={now}
        door={{ kind: "project", projectId }}
        view={asCallView(view)}
        project={[]}
        deleter={callDeleter(access)}
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
