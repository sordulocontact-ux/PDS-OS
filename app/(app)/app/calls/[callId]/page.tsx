import { notFound } from "next/navigation";

import { CallOutcomes } from "@/components/calls/call-outcomes";
import { CallWorkspace } from "@/components/calls/call-workspace";
import { EditAccessProvider } from "@/components/projects/edit-access";
import { PageContainer } from "@/components/shell/page-container";
import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { listOwnedProjects, loadCallOutcomes } from "@/lib/calls/outcomes";
import {
  getCallAudioUrls,
  getCall,
  loadLatestReport,
  loadLatestTranscript,
} from "@/lib/calls/queries";
import { loadMembers } from "@/lib/framing/related";
import { fr } from "@/lib/i18n/fr";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: `${fr.calls.all.title} · ${fr.app.name}` };

/**
 * An internal meeting (a call without a project): seen by its creator and
 * its attendees, recorded and processed by its creator, like a project's
 * call without the Brief. Its actions become tasks of a project the viewer
 * owns.
 */
export default async function MeetingPage({
  params,
  searchParams,
}: PageProps<"/app/calls/[callId]">) {
  const access = await requireApproved();
  const { callId } = await params;
  const { meet } = await searchParams;
  const supabase = await createClient();

  const call = await getCall(supabase, null, callId);
  if (!call) notFound();
  const [transcript, report, audioUrls, members] = await Promise.all([
    loadLatestTranscript(supabase, callId),
    loadLatestReport(supabase, callId),
    getCallAudioUrls(supabase, call),
    loadMembers(access),
  ]);
  const [outcomes, projects] = report
    ? await Promise.all([
        loadCallOutcomes(supabase, report),
        can(access, "pilot_projects")
          ? listOwnedProjects(supabase, access.personId)
          : [],
      ])
    : [null, []];

  const t = fr.calls;
  const canEdit =
    access.personId !== null && call.createdBy === access.personId;
  const creator = members.find((m) => m.personId === call.createdBy)?.name;

  return (
    <PageContainer>
      <EditAccessProvider canEdit={canEdit}>
        <CallWorkspace
          call={call}
          transcript={transcript}
          report={report}
          audioUrls={audioUrls}
          canEdit={canEdit}
          back={{ href: routes.calls, label: t.back }}
          where={t.all.internal}
          organizer={creator ?? null}
          steps={t.meetingPage}
          meetFailed={meet === "failed"}
          outcomes={
            outcomes && (
              <CallOutcomes
                outcomes={outcomes}
                members={members}
                projectId={null}
                projects={projects}
              />
            )
          }
        />
      </EditAccessProvider>
    </PageContainer>
  );
}
