import { notFound, redirect } from "next/navigation";

import { LegalStepFrame } from "@/components/legal/legal-step-frame";
import { buttonVariants, ButtonRoll } from "@/components/ui/button";
import { ViewLink } from "@/components/ui/view-link";
import { routes } from "@/lib/auth/redirects";
import { legalDemarches } from "@/lib/i18n/fr/legal-demarches";
import { scopeEntry } from "@/lib/legal/title-groups";
import { legalTitleLayout } from "@/lib/legal/title-layout";
import { loadProjectTitles } from "@/lib/projects/titles";
import { legalTitleCreditsKey } from "@/lib/ui/legal-steps";

const fr = { legalDemarches };

/**
 * « Créditer les auteurs », a step of a collective's title in the Catalogue
 * without a composer, an author or an arranger (audit du 28/11/2026): no
 * split nor SACEM is proposed before. Its gesture is in the Catalogue, the
 * title's credits; the step stays a page of the Juridique, so the project's
 * navigation never leaves the project. Once credited, the address opens the
 * title's next step.
 */
export async function TitleCreditsStep({
  projectId,
  titleId,
}: {
  projectId: string;
  titleId: string;
}) {
  const [layout, titles] = await Promise.all([
    legalTitleLayout(projectId),
    loadProjectTitles(projectId),
  ]);
  const title = titles.find((t) => t.id === titleId);
  if (!layout || !title) notFound();
  const key = legalTitleCreditsKey(titleId);
  const scope = layout.scopes.find((s) => s.titleId === titleId);
  if (!title.master || !scope?.steps.some((s) => s.key === key)) {
    const first = scope && scopeEntry(scope);
    redirect(first?.href ?? routes.projectLegal(projectId));
  }
  return (
    <LegalStepFrame projectId={projectId} stepKey={key} titre={titleId}>
      <ViewLink
        href={routes.masterCredits(title.master.id)}
        className={buttonVariants({ className: "self-start" })}
      >
        <ButtonRoll>{fr.legalDemarches.titleCredits.open}</ButtonRoll>
      </ViewLink>
    </LegalStepFrame>
  );
}
