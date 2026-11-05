import { CallHeader } from "@/components/calls/call-header";
import { CallWorkspace } from "@/components/calls/call-workspace";
import { EditAccessProvider } from "@/components/projects/edit-access";
import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import type { CallDoor } from "@/lib/calls/door";
import { isUpcoming } from "@/lib/calls/format";
import type { CallModule } from "@/lib/calls/now";
import { listOwnedProjects } from "@/lib/calls/outcomes";
import { loadCallPage } from "@/lib/calls/page-data";
import {
  getCallAudioUrls,
  loadLatestReport,
  loadLatestTranscript,
  type CallDetail,
} from "@/lib/calls/queries";
import { loadMembers } from "@/lib/framing/related";
import { calls } from "@/lib/i18n/fr/calls";
import { canEditProject } from "@/lib/projects/edit-access";
import type { ProjectDetail } from "@/lib/projects/types";
import { createClient } from "@/lib/supabase/server";

const fr = { calls };

/** The module a project's call feeds, where its proposals are settled. */
function moduleOf(projectId: string, call: CallDetail): CallModule {
  const names = fr.calls.page.modules;
  const prepared = call.prepared;
  if (prepared?.productionDeliverableId)
    return {
      href: routes.projectProductionStep(
        projectId,
        prepared.productionDeliverableId,
        "call",
      ),
      name: names.production,
    };
  if (prepared?.kind === "design")
    return { href: routes.projectDesignWork(projectId), name: names.design };
  if (prepared?.kind === "strategy")
    return { href: routes.projectStrategy(projectId), name: names.strategy };
  return { href: routes.projectFraming(projectId), name: names.framing };
}

// A creative exchange about one deliverable (MKT-C2-05): its tasks are
// about that deliverable too.
async function deliverableOf(
  supabase: Awaited<ReturnType<typeof createClient>>,
  callId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("design_calls")
    .select("deliverable_ids")
    .eq("call_id", callId)
    .maybeSingle();
  if (data?.deliverable_ids.length !== 1) return null;
  const { data: deliverable } = await supabase
    .from("design_deliverables")
    .select("strategy_deliverable_id")
    .eq("id", data.deliverable_ids[0])
    .maybeSingle();
  return deliverable?.strategy_deliverable_id ?? null;
}

/**
 * One call's page, whichever door opened it (lib/calls/door.ts): from Calls
 * (`/app/calls/<id>`, any call the viewer sees) or from its project
 * (`/app/projects/<p>/calls/<id>`). A project's call is worked on by the
 * project's owner, a meeting by its creator; record it, let the processing
 * run by itself (it lands on the module the call feeds), then settle what
 * it proposed, turn its actions into tasks (the call's project, or for a
 * meeting a launched project the viewer owns), send its summary, close it.
 * The pages read the call (and its project) for their 404 first.
 */
export async function CallPage({
  call,
  project,
  door,
  meetFailed,
}: {
  call: CallDetail;
  // The call's project, null for a meeting.
  project: ProjectDetail | null;
  door: CallDoor;
  meetFailed: boolean;
}) {
  const access = await requireApproved();
  const supabase = await createClient();
  const canEdit = project
    ? canEditProject(access, project)
    : access.personId !== null && call.createdBy === access.personId;
  const [transcript, report, audioUrls, members, taskProjects, deliverableId] =
    await Promise.all([
      loadLatestTranscript(supabase, call.id),
      loadLatestReport(supabase, call.id),
      getCallAudioUrls(supabase, call),
      // A meeting names its organizer from them.
      !project || canEdit ? loadMembers(access) : [],
      project
        ? canEdit
          ? [{ id: project.id, title: project.title }]
          : []
        : can(access, "pilot_projects")
          ? listOwnedProjects(supabase, access.personId)
          : [],
      project ? deliverableOf(supabase, call.id) : null,
    ]);
  const organizer = project
    ? project.ownerName
    : (members.find((m) => m.personId === call.createdBy)?.name ?? null);
  const data = await loadCallPage(supabase, {
    call,
    report,
    mePersonId: access.personId,
    ownerName: organizer,
  });
  const now = new Date();

  const page = (
    <CallWorkspace
      call={call}
      header={
        <CallHeader
          call={call}
          project={project && { id: project.id, title: project.title }}
          door={door}
          organizer={organizer}
          upcoming={isUpcoming(call, now)}
          closed={data.closures.length > 0}
        />
      }
      transcript={transcript}
      audioUrls={audioUrls}
      canEdit={canEdit}
      where={project?.title ?? fr.calls.all.internal}
      organizer={organizer}
      module={project ? moduleOf(project.id, call) : null}
      data={data}
      members={members}
      mePersonId={access.personId}
      taskProjects={taskProjects}
      deliverableId={deliverableId}
      meetFailed={meetFailed}
    />
  );
  // Inside a project, its frame already says who writes.
  return door.kind === "project" ? (
    page
  ) : (
    <EditAccessProvider canEdit={canEdit}>{page}</EditAccessProvider>
  );
}
