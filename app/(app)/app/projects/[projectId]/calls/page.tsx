import { notFound } from "next/navigation";

import { CallList } from "@/components/calls/call-list";
import { CreateCallForm } from "@/components/calls/create-call-form";
import { requireApproved } from "@/lib/auth/dal";
import { requireLaunchedProject } from "@/lib/projects/queries";
import { toParisLocalInput } from "@/lib/calls/format";
import { getProjectTitle, listCalls } from "@/lib/calls/queries";
import { fr } from "@/lib/i18n/fr";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: `${fr.calls.list.title} · ${fr.app.name}` };

export default async function ProjectCallsPage({
  params,
}: PageProps<"/app/projects/[projectId]/calls">) {
  await requireApproved();
  const { projectId } = await params;
  await requireLaunchedProject(projectId);
  const supabase = await createClient();

  const projectTitle = await getProjectTitle(supabase, projectId);
  if (!projectTitle) notFound();
  const calls = await listCalls(supabase, projectId);
  const t = fr.calls.list;
  const empty = calls.length === 0;

  return (
    <div className="grid gap-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="grid max-w-prose gap-1">
          <h2 className="text-lg font-semibold">{t.title}</h2>
          <p className="text-sm text-muted-foreground">{t.description}</p>
        </div>
        {!empty && (
          <CreateCallForm
            projectId={projectId}
            defaultOccurredAt={toParisLocalInput(new Date())}
            initiallyOpen={false}
          />
        )}
      </header>

      {empty ? (
        <section className="grid gap-4">
          <div className="grid max-w-prose gap-1">
            <h3 className="text-base font-medium">{t.emptyTitle}</h3>
            <p className="text-sm text-muted-foreground">{t.emptyBody}</p>
          </div>
          <CreateCallForm
            projectId={projectId}
            defaultOccurredAt={toParisLocalInput(new Date())}
            initiallyOpen
          />
        </section>
      ) : (
        <CallList projectId={projectId} calls={calls} />
      )}
    </div>
  );
}
