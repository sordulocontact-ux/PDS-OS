import { ProjectHeader } from "@/components/projects/project-header";
import { SessionsView } from "@/components/sessions/sessions-view";
import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { requireLaunchedProject } from "@/lib/projects/queries";
import { listStudioSessions } from "@/lib/sessions/queries";
import { sessionViewOf } from "@/lib/sessions/state";
import { allInOrder } from "@/lib/utils/parallel";

export const metadata = { title: fr.sessions.title };

/**
 * A project's studio sessions (Pilotage, retour d'Ibé du 01/11/2026): those
 * linked to the project or to one of its titles, the same rows as the
 * Sessions studio page. « Nouvelle session » with the project already chosen.
 */
export default async function ProjectSessionsPage({
  params,
  searchParams,
}: PageProps<"/app/projects/[projectId]/sessions">) {
  const { projectId } = await params;
  const [access, , { sessions, error }, query] = await allInOrder([
    requireApproved(),
    requireLaunchedProject(projectId),
    listStudioSessions({ projectId }),
    searchParams,
  ]);
  return (
    <div className="flex flex-col gap-6">
      <ProjectHeader projectId={projectId} />
      <SessionsView
        rows={sessions}
        error={error}
        view={sessionViewOf(query.vue)}
        path={routes.projectSessions(projectId)}
        canCreate={can(access, "manage_sessions")}
        scope={{ projectId }}
      />
    </div>
  );
}
