import { CallList } from "@/components/calls/call-list";
import { CreateCallForm } from "@/components/calls/create-call-form";
import { ProjectPageActions } from "@/components/projects/project-page-actions";
import { requireApproved } from "@/lib/auth/dal";
import { canEditProject } from "@/lib/projects/edit-access";
import { requireLaunchedProject } from "@/lib/projects/queries";
import { toParisLocalInput } from "@/lib/calls/format";
import { listCalls } from "@/lib/calls/queries";
import { fr } from "@/lib/i18n/fr";
import { createClient } from "@/lib/supabase/server";
import { allInOrder } from "@/lib/utils/parallel";

export const metadata = { title: `${fr.calls.list.title} · ${fr.app.name}` };

export default async function ProjectCallsPage({
  params,
}: PageProps<"/app/projects/[projectId]/calls">) {
  const { projectId } = await params;
  const [access, project, calls] = await allInOrder([
    requireApproved(),
    requireLaunchedProject(projectId),
    createClient().then((supabase) => listCalls(supabase, projectId)),
  ]);
  const canEdit = canEditProject(access, project);
  const t = fr.calls.list;
  const now = new Date();
  const empty = calls.length === 0;

  return (
    <div className="grid gap-6">
      <ProjectPageActions>
        {!empty && (
          <CreateCallForm
            projectId={projectId}
            defaultOccurredAt={toParisLocalInput(now)}
            defaultTitle=""
            initiallyOpen={false}
          />
        )}
      </ProjectPageActions>

      {empty ? (
        <section className="grid gap-4">
          <div className="grid max-w-prose gap-1">
            <h3 className="text-base font-medium">{t.emptyTitle}</h3>
            <p className="text-sm text-muted-foreground">
              {canEdit ? t.emptyBody : t.emptyBodyReadOnly}
            </p>
          </div>
          <CreateCallForm
            projectId={projectId}
            defaultOccurredAt={toParisLocalInput(now)}
            defaultTitle={t.firstCallTitle}
            initiallyOpen
          />
        </section>
      ) : (
        <CallList projectId={projectId} calls={calls} now={now} />
      )}
    </div>
  );
}
