import { Suspense } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { PageContainer } from "@/components/shell/page-container";
import { buttonVariants, ButtonRoll } from "@/components/ui/button";
import {
  LoadingRegion,
  Skeleton,
  SkeletonRows,
} from "@/components/ui/skeleton";
import { ViewLink } from "@/components/ui/view-link";
import { MyTasksSection } from "@/components/work/my-tasks-section";
import { WorkList } from "@/components/work/work-list";
import { WorkSections } from "@/components/work/work-sections";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { SECTION_PARAM, TASKS_SECTION_VALUE } from "@/lib/work/sections";

export const metadata = { title: `${fr.work.title} · ${fr.app.name}` };

// Everyone's work, each list gated by a permission (docs/CONTEXTE-PROJET.md
// § 12): the director decides, the project manager runs, the creative
// director designs. « Maintenant » then every action by when
// (docs/VISION-UX.md § 2 and § 4); the dates of all the projects are in the
// Calendrier, one click away. Beside them, « Mes tâches », the person's own
// to-do list (retour du 31/10/2026): both sections are read at once, a tab
// switches in place.
export default async function WorkPage({
  searchParams,
}: PageProps<"/app/work">) {
  const access = await requireApproved();
  const t = fr.work;
  // Back from refusing a project or asking about it (respondToAssignment).
  const { responded, [SECTION_PARAM]: section } = await searchParams;
  const sent =
    responded === "refused" || responded === "clarification_requested"
      ? fr.transmission.respond.sent[responded]
      : null;

  return (
    <PageContainer>
      <WorkSections
        title={t.title}
        descriptions={{
          actions:
            (access.role && t.descriptions[access.role]) ||
            t.descriptionFallback,
          tasks: t.tasks.description,
        }}
        action={
          <ViewLink
            href={routes.calendar}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <ButtonRoll>{t.lead.calendar}</ButtonRoll>
          </ViewLink>
        }
        initial={section === TASKS_SECTION_VALUE ? "tasks" : "actions"}
        actions={
          <>
            {sent && <FormMessage kind="info">{sent}</FormMessage>}
            <Suspense
              fallback={
                <LoadingRegion label={fr.auth.common.loading}>
                  {/* « Maintenant », then a group of rows. */}
                  <div className="flex flex-col gap-5">
                    <Skeleton className="h-48 rounded-2xl" />
                    <SkeletonRows />
                  </div>
                </LoadingRegion>
              }
            >
              <WorkList access={access} />
            </Suspense>
          </>
        }
        tasks={
          <Suspense
            fallback={
              <LoadingRegion label={fr.auth.common.loading}>
                <div className="flex flex-col gap-5">
                  <Skeleton className="h-8 rounded-lg" />
                  <SkeletonRows />
                </div>
              </LoadingRegion>
            }
          >
            <MyTasksSection access={access} />
          </Suspense>
        }
      />
    </PageContainer>
  );
}
