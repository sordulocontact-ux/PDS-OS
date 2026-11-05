import { notFound } from "next/navigation";

import { CallPage } from "@/components/calls/call-page";
import { requireApproved } from "@/lib/auth/dal";
import { getCall } from "@/lib/calls/queries";
import { fr } from "@/lib/i18n/fr";
import { requireLaunchedProject } from "@/lib/projects/queries";
import { createClient } from "@/lib/supabase/server";
import { allInOrder } from "@/lib/utils/parallel";

export const metadata = { title: fr.calls.list.title };

/**
 * One call of a project, opened inside it (the project's Calls in its
 * navigation): the same page as from the Calls section, under the
 * project's header and trail « Calls / title » (lib/calls/door.ts).
 */
export default async function ProjectCallPage({
  params,
  searchParams,
}: PageProps<"/app/projects/[projectId]/calls/[callId]">) {
  const { projectId, callId } = await params;
  const { meet } = await searchParams;
  const [, project, call] = await allInOrder([
    requireApproved(),
    requireLaunchedProject(projectId),
    createClient().then((supabase) => getCall(supabase, projectId, callId)),
  ]);
  if (!call) notFound();

  return (
    <CallPage
      call={call}
      project={project}
      door={{ kind: "project", projectId }}
      meetFailed={meet === "failed"}
    />
  );
}
