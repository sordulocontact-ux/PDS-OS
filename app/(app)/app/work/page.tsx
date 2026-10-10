import { Suspense } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { PageContainer } from "@/components/shell/page-container";
import { PageHeader } from "@/components/shell/page-header";
import { CardGridSkeleton } from "@/components/ui/card-grid";
import { MyWorkCards } from "@/components/work/my-work-cards";
import { requireApproved } from "@/lib/auth/dal";
import { fr } from "@/lib/i18n/fr";

// Everyone's work, each list gated by a permission (docs/CONTEXTE-PROJET.md
// § 12): the director decides, the project manager runs, the creative
// director designs. Someone holding several permissions sees every block.
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

      <Suspense fallback={<CardGridSkeleton label={fr.auth.common.loading} />}>
        <MyWorkCards access={access} />
      </Suspense>
    </PageContainer>
  );
}
