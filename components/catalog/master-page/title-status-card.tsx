import Link from "next/link";

import { versionLabel } from "@/components/catalog/master-page/audio/audio-version-list";
import { TitleAudioState } from "@/components/catalog/title/title-audio-state";
import { PageSection } from "@/components/shell/page-section";
import { buttonVariants } from "@/components/ui/button";
import { FactList } from "@/components/ui/fact-list";
import { StatusBadge } from "@/components/ui/status-badge";
import { routes } from "@/lib/auth/redirects";
import type { NumberedVersion } from "@/lib/catalog/audio-versions";
import type { ChecklistItem } from "@/lib/catalog/master/overview";
import type {
  DistributionState,
  TitleNextAction,
} from "@/lib/catalog/master/title-status";
import type { AudioState } from "@/lib/catalog/title-rules";
import type { LinkedProject } from "@/lib/catalog/types";
import { fr } from "@/lib/i18n/fr";
import { titleDistributionTone } from "@/lib/ui/state-tones";

/**
 * The head of a title's overview (retours Catalogue 01 et 11): its audio
 * state, its version of reference, its project, its distribution (kept
 * apart from the audio state), then the one next action, computed by code
 * (titleNextAction) and leading where it is done.
 */
export function TitleStatusCard({
  masterId,
  audioState,
  finalValidated,
  reference,
  projects,
  distribution,
  next,
  checklist,
}: {
  masterId: string;
  audioState: AudioState | null;
  finalValidated: boolean;
  reference: NumberedVersion | null;
  projects: LinkedProject[];
  distribution: DistributionState;
  next: TitleNextAction;
  checklist: ChecklistItem[];
}) {
  const t = fr.masterPage.overview;
  const action = describe(next, masterId, checklist);

  return (
    <PageSection card id="status" title={t.status.title}>
      <div className="flex flex-col gap-4">
        <FactList
          emptyLabel={t.status.noProject}
          facts={[
            {
              label: t.status.audio,
              value: (
                <TitleAudioState
                  state={audioState}
                  validated={finalValidated}
                />
              ),
            },
            {
              label: t.status.reference,
              value: reference ? versionLabel(reference) : t.status.noReference,
            },
            {
              label: t.status.projects,
              value:
                projects.length > 0 ? (
                  <span className="flex flex-wrap gap-x-3 gap-y-1">
                    {projects.map((project) => (
                      <Link
                        key={project.id}
                        href={routes.project(project.id)}
                        className="underline underline-offset-4"
                      >
                        {project.title}
                      </Link>
                    ))}
                  </span>
                ) : null,
            },
            {
              label: t.status.distribution,
              value: (
                <StatusBadge
                  tone={titleDistributionTone[distribution]}
                  size="sm"
                >
                  {t.distributionStates[distribution]}
                </StatusBadge>
              ),
            },
          ]}
        />
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-lg)] bg-[color:var(--surface-soft)] px-4 py-3">
          <div className="flex min-w-0 flex-col">
            <span className="text-sm text-[color:var(--text-secondary)]">
              {t.status.next}
            </span>
            <span className="font-medium">{action.label}</span>
          </div>
          {action.href && (
            <Link
              href={action.href}
              className={buttonVariants({ size: "sm", variant: "outline" })}
            >
              {action.cta}
            </Link>
          )}
        </div>
      </div>
    </PageSection>
  );
}

function describe(
  next: TitleNextAction,
  masterId: string,
  checklist: ChecklistItem[],
): { label: string; href: string | null; cta: string } {
  const t = fr.masterPage.overview.nextActions;
  const audio = routes.masterAudio(masterId);
  const open = fr.masterPage.overview.status.open;
  switch (next.kind) {
    case "add_first_version":
      return { label: t.add_first_version, href: audio, cta: open };
    case "review":
      return {
        label: t.review(versionLabel(next.version)),
        href: audio,
        cta: open,
      };
    case "awaiting_review":
      return {
        label: t.awaiting_review(versionLabel(next.version)),
        href: audio,
        cta: open,
      };
    case "deposit_correction":
      return {
        label: t.deposit_correction(versionLabel(next.version)),
        href: audio,
        cta: open,
      };
    case "deposit_next":
      return {
        label: t.deposit_next(fr.catalog.audioStates[next.state]),
        href: audio,
        cta: open,
      };
    case "link_project":
      return {
        label: t.link_project,
        href: routes.masterProjects(masterId),
        cta: open,
      };
    case "complete": {
      const item = checklist.find((i) => i.key === next.key);
      return {
        label: t.complete(item?.label ?? ""),
        href: item?.href ?? null,
        cta: open,
      };
    }
    case "none":
      return { label: t.none, href: null, cta: open };
  }
}
