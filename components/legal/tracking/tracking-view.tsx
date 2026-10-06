import Link from "next/link";
import { IconScale } from "nucleo-sharp-essential";

import { ActionGroup } from "@/components/legal/plan/action-group";
import { TrackedRow } from "@/components/legal/tracking/tracked-row";
import { AddedActions } from "@/components/legal/tracking/added-actions";
import { ProjectPageHeader } from "@/components/projects/project-page-header";
import { EmptyNote, EmptyState } from "@/components/shell/empty-state";
import { PageSection } from "@/components/shell/page-section";
import { Button } from "@/components/ui/button";
import { ToneCallout } from "@/components/ui/tone-callout";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { groupActions, lineOf } from "@/lib/legal/plan/groups";
import { groupAction } from "@/lib/legal/plan/where";
import { TRACK_GROUPS } from "@/lib/legal/tracking/state";
import type { LegalTracking } from "@/lib/legal/tracking/queries";

/**
 * Juridique's last step: « Qu'est-ce qui nécessite notre attention ? »
 * (Juridique 07), the launched plan regrouped by where each action really
 * stands, its sources read again at each visit. What is not integrated yet
 * is said, not hidden.
 */
export function TrackingView({
  projectId,
  tracking,
}: {
  projectId: string;
  tracking: LegalTracking;
}) {
  const t = fr.legal.tracking;
  const header = (
    <ProjectPageHeader title={t.title} description={t.description} />
  );

  if (tracking.state === "not_launched")
    return (
      <div className="grid gap-8">
        {header}
        <EmptyState
          icon={IconScale}
          title={t.notLaunched.title}
          body={t.notLaunched.body}
          action={
            <Button
              nativeButton={false}
              render={
                <Link href={routes.projectLegalStep(projectId, "plan")} />
              }
            >
              {t.notLaunched.action}
            </Button>
          }
        />
      </div>
    );

  const labelOf = new Map(tracking.items.map((i) => [i.key, i.label]));
  return (
    <div className="grid gap-8">
      {header}
      <ToneCallout tone="neutral">{t.integrations}</ToneCallout>
      {tracking.added > 0 && (
        <AddedActions projectId={projectId} count={tracking.added} />
      )}
      {TRACK_GROUPS.map((group) => {
        const items = tracking.items.filter((item) => item.group === group);
        return (
          <PageSection
            key={group}
            card
            id={`legal-tracking-${group}`}
            title={t.groups[group].title}
            description={t.groups[group].description}
          >
            {items.length === 0 ? (
              <EmptyNote>{t.empty}</EmptyNote>
            ) : (
              <div className="flex flex-col gap-6">
                {groupActions(items, labelOf).map((kind) => {
                  const shared =
                    group === "silent"
                      ? null
                      : groupAction(projectId, kind.items);
                  return (
                    <ActionGroup
                      key={kind.kind}
                      title={kind.title}
                      count={kind.items.length}
                      why={kind.why}
                      after={group === "silent" ? [] : kind.after}
                      action={shared}
                    >
                      {kind.items.map((item) => (
                        <TrackedRow
                          key={item.key}
                          projectId={projectId}
                          item={item}
                          line={lineOf(item, kind, labelOf)}
                          ownAction={shared === null && group !== "silent"}
                          people={tracking.people}
                        />
                      ))}
                    </ActionGroup>
                  );
                })}
              </div>
            )}
          </PageSection>
        );
      })}
    </div>
  );
}
