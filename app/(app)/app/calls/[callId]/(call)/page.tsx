import { notFound } from "next/navigation";

import { CallWorkspace } from "@/components/calls/call-workspace";
import { EditAccessProvider } from "@/components/projects/edit-access";
import { PageContainer } from "@/components/shell/page-container";
import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { listOwnedProjects } from "@/lib/calls/outcomes";
import { loadCallPage } from "@/lib/calls/page-data";
import {
  getCallAudioUrls,
  getMeeting,
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

  const call = await getMeeting(callId);
  if (!call) notFound();
  const [transcript, report, audioUrls, members, projects] = await Promise.all([
    loadLatestTranscript(supabase, callId),
    loadLatestReport(supabase, callId),
    getCallAudioUrls(supabase, call),
    loadMembers(access),
    can(access, "pilot_projects")
      ? listOwnedProjects(supabase, access.personId)
      : [],
  ]);
  const canEdit =
    access.personId !== null && call.createdBy === access.personId;
  const organizer =
    members.find((m) => m.personId === call.createdBy)?.name ?? null;
  const data = await loadCallPage(supabase, {
    call,
    report,
    mePersonId: access.personId,
    ownerName: organizer,
  });

  return (
    <PageContainer>
      <EditAccessProvider canEdit={canEdit}>
        <CallWorkspace
          call={call}
          transcript={transcript}
          audioUrls={audioUrls}
          canEdit={canEdit}
          back={{ href: routes.calls, label: fr.calls.back }}
          where={{ label: fr.calls.all.internal, href: null }}
          organizer={organizer}
          data={data}
          members={members}
          mePersonId={access.personId}
          taskProjects={projects}
          meetFailed={meet === "failed"}
        />
      </EditAccessProvider>
    </PageContainer>
  );
}
