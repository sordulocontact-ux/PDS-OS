import Link from "next/link";
import { IconScale } from "nucleo-sharp-essential";

import { DelegateButton } from "@/components/legal/tracking/delegate-button";
import { TaskControl } from "@/components/legal/tracking/task-control";
import { ProjectPageHeader } from "@/components/projects/project-page-header";
import { EmptyNote, EmptyState } from "@/components/shell/empty-state";
import { PageSection } from "@/components/shell/page-section";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { ToneCallout } from "@/components/ui/tone-callout";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { TRACK_GROUPS, type TrackedItem } from "@/lib/legal/tracking/state";
import type { LegalTracking } from "@/lib/legal/tracking/queries";
import { formatDate } from "@/lib/release/format";
import { planItemTone, type Tone } from "@/lib/ui/state-tones";

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

  return (
    <div className="grid gap-8">
      {header}
      <ToneCallout tone="neutral">{t.integrations}</ToneCallout>
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
              <ul className="flex flex-col gap-4">
                {items.map((item) => (
                  <TrackedRow
                    key={item.key}
                    projectId={projectId}
                    item={item}
                    people={tracking.people}
                  />
                ))}
              </ul>
            )}
          </PageSection>
        );
      })}
    </div>
  );
}

// A refusal or a rejection is a block; a missed due date or a decision
// awaited waits for someone's action; otherwise the item state's tone.
function toneOf(item: TrackedItem): Tone {
  if (item.overdue) return "warning";
  if (item.group === "decision")
    return item.current === "waiting_external" ? "warning" : "danger";
  return planItemTone[item.current];
}

function TrackedRow({
  projectId,
  item,
  people,
}: {
  projectId: string;
  item: TrackedItem;
  people: Array<{ personId: string; name: string }>;
}) {
  const t = fr.legal.tracking;
  const meta = [
    item.responsibleName ?? fr.legal.plan.noResponsible,
    item.dueOn
      ? item.overdue
        ? t.overdue(formatDate(item.dueOn))
        : t.due(formatDate(item.dueOn))
      : null,
    item.since ? t.since(formatDate(item.since)) : null,
    item.task ? (item.task.done ? t.task.done : t.task.open) : t.task.none,
  ].filter(Boolean);
  const finished = item.current === "done" || item.current === "obsolete";

  return (
    <li className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="font-medium break-words">{item.label}</span>
        {item.detail && (
          <span className="text-sm break-words text-muted-foreground">
            {item.detail}
          </span>
        )}
        {item.why && (
          <span className="text-sm break-words text-muted-foreground">
            {item.why}
          </span>
        )}
        <span className="text-sm text-muted-foreground">
          {meta.join(" · ")}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
        <StatusBadge tone={toneOf(item)}>{item.reason}</StatusBadge>
        <TaskControl projectId={projectId} item={item} />
        {item.sourceHref && !finished && (
          <Button
            variant="outline"
            size="xs"
            nativeButton={false}
            render={<Link href={item.sourceHref} />}
          >
            {t.open}
          </Button>
        )}
        {!finished && (
          <DelegateButton
            projectId={projectId}
            itemId={item.id}
            label={item.label}
            responsibleId={item.responsibleId}
            dueOn={item.dueOn}
            people={people}
          />
        )}
      </div>
    </li>
  );
}
