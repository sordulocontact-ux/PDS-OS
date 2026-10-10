import { EmptyNote } from "@/components/shell/empty-state";
import { PageSection } from "@/components/shell/page-section";
import { ToneCallout } from "@/components/ui/tone-callout";
import { ViewLink } from "@/components/ui/view-link";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { versionName } from "@/lib/production/post/labels";
import { isPendingCorrection } from "@/lib/production/post/rules";
import type { PostVersion } from "@/lib/production/post/types";
import { productionVersionTone } from "@/lib/ui/state-tones";

import { DecisionForm } from "./decision-form";

const t = fr.productionPost.decision;
const linkClass = "w-fit text-sm underline underline-offset-4";

/**
 * « Validation finale de la version » (parcours 18): each version submitted
 * to the final validation, with what the validator checks (the version and
 * its feedback above, the Fiche Livrable), then the decision. No open
 * feedback is never a validation: only this decision validates.
 */
export function DecisionSection({
  projectId,
  deliverableId,
  versions,
  canReview,
}: {
  projectId: string;
  deliverableId: string;
  versions: PostVersion[];
  canReview: boolean;
}) {
  const waiting = versions.filter((v) => v.status === "final_review");
  const approved = versions.find((v) => v.status === "approved") ?? null;
  const ficheHref = `${routes.projectProductionSheet(projectId, deliverableId)}#heritage`;

  return (
    <PageSection id="decision" title={t.title} description={t.description} card>
      {waiting.length === 0 &&
        (approved ? (
          <ToneCallout tone={productionVersionTone.approved}>
            {t.approved(versionName(approved))}
          </ToneCallout>
        ) : (
          <EmptyNote>{t.none}</EmptyNote>
        ))}
      {waiting.map((v) => {
        const open = v.comments.filter((c) =>
          isPendingCorrection(c.status),
        ).length;
        return (
          <div key={v.id} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <p className="font-semibold">{t.waiting(versionName(v))}</p>
              <p className="text-sm text-muted-foreground">
                {t.openComments(open)}
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                <a href={`#version-${v.id}`} className={linkClass}>
                  {t.seeVersion}
                </a>
                <ViewLink href={ficheHref} className={linkClass}>
                  {t.fiche}
                </ViewLink>
              </div>
            </div>
            {canReview ? (
              <DecisionForm projectId={projectId} versionId={v.id} />
            ) : (
              <p className="text-sm text-muted-foreground">{t.readOnly}</p>
            )}
          </div>
        );
      })}
    </PageSection>
  );
}
