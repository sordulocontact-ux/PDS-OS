import { notFound } from "next/navigation";

import { CallPage } from "@/components/calls/call-page";
import { PageContainer } from "@/components/shell/page-container";
import { requireApproved } from "@/lib/auth/dal";
import { getVisibleCall } from "@/lib/calls/queries";
import { fr } from "@/lib/i18n/fr";
import { getProject } from "@/lib/projects/queries";
import { allInOrder } from "@/lib/utils/parallel";

export const metadata = { title: `${fr.calls.all.title} · ${fr.app.name}` };

/**
 * A call opened from the Calls section: an internal meeting or a project's
 * call, the navigation staying on Calls; « Projet : X » leads to the
 * project (lib/calls/door.ts). The same page as inside the project.
 */
export default async function CallsCallPage({
  params,
  searchParams,
}: PageProps<"/app/calls/[callId]">) {
  const { callId } = await params;
  const { meet } = await searchParams;
  const [, call] = await allInOrder([
    requireApproved(),
    getVisibleCall(callId),
  ]);
  if (!call) notFound();
  const project = call.projectId ? await getProject(call.projectId) : null;

  return (
    <PageContainer>
      <CallPage
        call={call}
        project={project}
        door={{ kind: "calls" }}
        meetFailed={meet === "failed"}
      />
    </PageContainer>
  );
}
