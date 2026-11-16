import { SessionFormButton } from "@/components/sessions/session-form-button";
import { SessionsView } from "@/components/sessions/sessions-view";
import { SectionFrame } from "@/components/shell/section-frame";
import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { listStudioSessions } from "@/lib/sessions/queries";
import { sessionViewOf } from "@/lib/sessions/state";
import { allInOrder } from "@/lib/utils/parallel";

export const metadata = {
  title: `${fr.sessions.title} · ${fr.app.name}`,
};

// Sessions studio (retour d'Ibé du 01/11/2026): every session, its tabs (À
// venir, Passées, Toutes), a search. Only the list (docs/VISION-UX.md § 3).
export default async function SessionsPage({
  searchParams,
}: PageProps<"/app/sessions">) {
  const [access, { sessions, error }, params] = await allInOrder([
    requireApproved(),
    listStudioSessions(),
    searchParams,
  ]);
  const canCreate = can(access, "manage_sessions");
  const action =
    canCreate && sessions.length > 0 ? <SessionFormButton /> : null;
  return (
    <SectionFrame
      title={fr.sessions.title}
      description={fr.sessions.subtitle}
      action={action}
      toolsAction={!error && sessions.length > 0}
    >
      <SessionsView
        pageAction={action}
        rows={sessions}
        error={error}
        view={sessionViewOf(params.vue)}
        path={routes.sessions}
        canCreate={canCreate}
      />
    </SectionFrame>
  );
}
