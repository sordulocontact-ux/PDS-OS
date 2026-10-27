import { Suspense } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { PageContainer } from "@/components/shell/page-container";
import { PageHeader } from "@/components/shell/page-header";
import { buttonVariants } from "@/components/ui/button";
import {
  LoadingRegion,
  Skeleton,
  SkeletonRows,
} from "@/components/ui/skeleton";
import { ViewLink } from "@/components/ui/view-link";
import { WorkList } from "@/components/work/work-list";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";

// Everyone's work, each list gated by a permission (docs/CONTEXTE-PROJET.md
// § 12): the director decides, the project manager runs, the creative
// director designs. « Maintenant » then every action by when
// (docs/VISION-UX.md § 2 and § 4); the dates of all the projects are in the
// Calendrier, one click away.
export default async function WorkPage({
  searchParams,
}: PageProps<"/app/work">) {
  const access = await requireApproved();
  const t = fr.work;
  // Back from refusing a project or asking about it (respondToAssignment).
  const { responded } = await searchParams;
  const sent =
    responded === "refused" || responded === "clarification_requested"
      ? fr.transmission.respond.sent[responded]
      : null;

  return (
    <PageContainer>
      <PageHeader
        title={t.title}
        description={
          (access.role && t.descriptions[access.role]) || t.descriptionFallback
        }
        action={
          <ViewLink
            href={routes.calendar}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            {t.lead.calendar}
          </ViewLink>
        }
      />
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
    </PageContainer>
  );
}
