import { Suspense } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { PageContainer } from "@/components/shell/page-container";
import { PageHeader } from "@/components/shell/page-header";
import { LoadingRegion, SkeletonRows } from "@/components/ui/skeleton";
import { WorkList } from "@/components/work/work-list";
import { requireApproved } from "@/lib/auth/dal";
import { fr } from "@/lib/i18n/fr";

// Everyone's work, each list gated by a permission (docs/CONTEXTE-PROJET.md
// § 12): the director decides, the project manager runs, the creative
// director designs. One table, in the design of every list page.
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
      />
      {sent && <FormMessage kind="info">{sent}</FormMessage>}

      <Suspense
        fallback={
          <LoadingRegion label={fr.auth.common.loading}>
            <SkeletonRows />
          </LoadingRegion>
        }
      >
        <WorkList access={access} />
      </Suspense>
    </PageContainer>
  );
}
