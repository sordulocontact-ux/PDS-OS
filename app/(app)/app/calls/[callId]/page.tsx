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
  getAudioUrl,
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
}: PageProps<"/app/calls/[callId]">) {
  const access = await requireApproved();
  const { callId } = await params;
  const supabase = await createClient();

  const call = await getCall(supabase, null, callId);
  if (!call) notFound();
  const [transcript, report, audioUrl, members] = await Promise.all([
    loadLatestTranscript(supabase, callId),
    loadLatestReport(supabase, callId),
    call.audioPath ? getAudioUrl(supabase, call.audioPath) : null,
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
  const attendees = call.attendees.map((a) => a.name).filter(Boolean);

  return (
    <PageContainer>
      <EditAccessProvider canEdit={canEdit}>
        <CallWorkspace
          call={call}
          transcript={transcript}
          report={report}
          audioUrl={audioUrl}
          canEdit={canEdit}
          back={{ href: routes.calls, label: t.back }}
          subtitle={
            <p className="text-sm text-muted-foreground">
              {[
                t.all.internal,
                creator && t.meeting.createdBy(creator),
                `${t.meeting.attendees} : ${
                  attendees.length > 0
                    ? attendees.join(", ")
                    : t.meeting.onlyCreator
                }`,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          }
          steps={t.meetingPage}
          outcomes={
            outcomes && (
              <CallOutcomes
                outcomes={outcomes}
                members={members}
                mePersonId={access.personId}
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
