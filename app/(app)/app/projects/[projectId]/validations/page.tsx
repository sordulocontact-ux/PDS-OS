import { IconShieldCheck } from "nucleo-sharp-essential";

import { ValidationItem } from "@/components/project-history/validation-item";
import { EmptyState } from "@/components/shell/empty-state";
import { PageSection } from "@/components/shell/page-section";
import { requireApproved } from "@/lib/auth/dal";
import { fr } from "@/lib/i18n/fr";
import { listProjectValidations } from "@/lib/project-history/queries";
import { requireLaunchedProject } from "@/lib/projects/queries";
import { allInOrder } from "@/lib/utils/parallel";

const t = fr.projectHistory.validations;

export const metadata = { title: `${t.title} · ${fr.app.name}` };

// Every validation request of the project: pending ones first, on their own,
// then the decided history. Deciding happens on the stage page.
export default async function ProjectValidationsPage({
  params,
}: PageProps<"/app/projects/[projectId]/validations">) {
  const { projectId } = await params;
  const [, , validations] = await allInOrder([
    requireApproved(),
    requireLaunchedProject(projectId),
    listProjectValidations(projectId),
  ]);
  const pending = validations.filter((v) => v.state === "pending");
  const decided = validations.filter((v) => v.state !== "pending");

  return (
    <div className="grid gap-8">
      {validations.length === 0 ? (
        <EmptyState
          icon={IconShieldCheck}
          title={t.emptyTitle}
          body={t.emptyBody}
        />
      ) : (
        <>
          {pending.length > 0 && (
            <PageSection id="pending" title={t.pending}>
              <ul className="grid gap-3">
                {pending.map((v) => (
                  <ValidationItem key={v.id} validation={v} />
                ))}
              </ul>
            </PageSection>
          )}
          <PageSection id="history" title={t.history}>
            {decided.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t.historyEmpty}</p>
            ) : (
              <ul className="grid gap-3">
                {decided.map((v) => (
                  <ValidationItem key={v.id} validation={v} />
                ))}
              </ul>
            )}
          </PageSection>
        </>
      )}
    </div>
  );
}
