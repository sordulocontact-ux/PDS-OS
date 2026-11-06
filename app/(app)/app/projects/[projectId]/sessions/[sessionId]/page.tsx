import { notFound } from "next/navigation";

import { SessionPageView } from "@/components/sessions/session-page/session-page";
import { requireApproved } from "@/lib/auth/dal";
import { fr } from "@/lib/i18n/fr";
import { requireLaunchedProject } from "@/lib/projects/queries";
import { getStudioSession } from "@/lib/sessions/queries";
import { allInOrder } from "@/lib/utils/parallel";

export const metadata = { title: fr.sessions.title };

/**
 * One studio session of a project, opened inside it (Sacha, 06/11/2026: « un
 * peu comme Calls, on reste dans la page projet »): the same page as from
 * the menu, under the project's header and trail (lib/sessions/door.ts).
 */
export default async function ProjectSessionPage({
  params,
}: PageProps<"/app/projects/[projectId]/sessions/[sessionId]">) {
  const { projectId, sessionId } = await params;
  const [access, , session] = await allInOrder([
    requireApproved(),
    requireLaunchedProject(projectId),
    getStudioSession(sessionId),
  ]);
  if (!session) notFound();
  return (
    <SessionPageView
      session={session}
      access={access}
      door={{ kind: "project", projectId }}
      backLabel={fr.sessions.page.back}
    />
  );
}
