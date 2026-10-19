import { EmptyNote } from "@/components/shell/empty-state";
import { PageSection } from "@/components/shell/page-section";
import { ToneCallout } from "@/components/ui/tone-callout";
import { ViewLink } from "@/components/ui/view-link";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { versionName } from "@/lib/production/post/labels";
import {
  isPendingCorrection,
  isUnderReview,
} from "@/lib/production/post/rules";
import type { PostPeople, PostVersion } from "@/lib/production/post/types";
import type { Holder } from "@/lib/production/sheet";
import { productionVersionTone } from "@/lib/ui/state-tones";

import { DecisionForm } from "./decision-form";

const t = fr.productionPost.decision;
const linkClass = "w-fit text-sm underline underline-offset-4";

/**
 * « Décision sur la version » (PROD-033): every version under review, who
 * decides (named), its open feedback, then its one decision — valider,
 * demander des corrections, refuser. Commenting is never deciding.
 */
export function DecisionSection({
  projectId,
  deliverableId,
  versions,
  canReview,
  reviewers,
  people,
  defaults,
}: {
  projectId: string;
  deliverableId: string;
  versions: PostVersion[];
  canReview: boolean;
  reviewers: string[];
  people: PostPeople;
  defaults: { recipient: Holder | null; dueOn: string | null };
}) {
  const waiting = versions.filter((v) => isUnderReview(v.status));
  const approved = versions.find((v) => v.status === "approved") ?? null;
  const ficheHref = `${routes.projectProductionSheet(projectId, deliverableId)}#heritage`;
  const deciders =
    reviewers.length > 0 ? t.deciders(reviewers.join(", ")) : t.decidersNone;

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
              <p className="text-sm">{deciders}</p>
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
            {v.intApproved ? (
              <p className="text-sm text-muted-foreground">
                {fr.productionCut.side.int(
                  fr.productionCut.side.states.approved,
                )}
                {" · "}
                {fr.productionCut.side.ext(
                  fr.productionCut.side.states.pending,
                )}
              </p>
            ) : canReview ? (
              <DecisionForm
                projectId={projectId}
                version={v}
                people={people}
                defaults={{
                  recipient: v.author ?? defaults.recipient,
                  dueOn: defaults.dueOn,
                }}
              />
            ) : (
              <p className="text-sm text-muted-foreground">{t.readOnly}</p>
            )}
          </div>
        );
      })}
    </PageSection>
  );
}
