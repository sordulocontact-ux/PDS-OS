import { notFound } from "next/navigation";

import { CallWorkspace } from "@/components/calls/call-workspace";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import type { CallModule } from "@/lib/calls/now";
import { loadCallPage } from "@/lib/calls/page-data";
import {
  getCallAudioUrls,
  getCall,
  loadLatestReport,
  loadLatestTranscript,
  type CallDetail,
} from "@/lib/calls/queries";
import { loadMembers } from "@/lib/framing/related";
import { fr } from "@/lib/i18n/fr";
import { canEditProject } from "@/lib/projects/edit-access";
import { requireLaunchedProject } from "@/lib/projects/queries";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: `${fr.calls.list.title} · ${fr.app.name}` };

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

/**
 * One call of a project: record it, let the processing run by itself (it
 * lands on the module the call feeds), then settle what it proposed, turn
 * its actions into the project's tasks, send its summary, close it.
 */
export default async function CallPage({
  params,
  searchParams,
}: PageProps<"/app/projects/[projectId]/calls/[callId]">) {
  const access = await requireApproved();
  const { projectId, callId } = await params;
  const { meet } = await searchParams;
  const project = await requireLaunchedProject(projectId);
  const supabase = await createClient();

  const call = await getCall(supabase, projectId, callId);
  if (!call) notFound();
  const canEdit = canEditProject(access, project);
  const [transcript, report, audioUrls, members, deliverableId] =
    await Promise.all([
      loadLatestTranscript(supabase, callId),
      loadLatestReport(supabase, callId),
      getCallAudioUrls(supabase, call),
      canEdit ? loadMembers(access) : [],
      // A creative exchange about one deliverable (MKT-C2-05): its tasks
      // are about that deliverable too.
      supabase
        .from("design_calls")
        .select("deliverable_ids")
        .eq("call_id", callId)
        .maybeSingle()
        .then(async ({ data }) =>
          data?.deliverable_ids.length === 1
            ? ((
                await supabase
                  .from("design_deliverables")
                  .select("strategy_deliverable_id")
                  .eq("id", data.deliverable_ids[0])
                  .maybeSingle()
              ).data?.strategy_deliverable_id ?? null)
            : null,
        ),
    ]);
  const organizer = project.ownerName ?? null;
  const data = await loadCallPage(supabase, {
    call,
    report,
    mePersonId: access.personId,
    ownerName: organizer,
  });

  return (
    <CallWorkspace
      call={call}
      transcript={transcript}
      audioUrls={audioUrls}
      canEdit={canEdit}
      back={{ href: routes.projectCalls(projectId), label: fr.calls.back }}
      where={{ label: project.title, href: routes.project(projectId) }}
      organizer={organizer}
      module={moduleOf(projectId, call)}
      data={data}
      members={members}
      mePersonId={access.personId}
      taskProjects={canEdit ? [{ id: project.id, title: project.title }] : []}
      deliverableId={deliverableId}
      meetFailed={meet === "failed"}
    />
  );
}
