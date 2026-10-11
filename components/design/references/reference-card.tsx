import {
  IconFile,
  IconFilm,
  IconImage,
  IconLink,
  type IconProps,
} from "nucleo-sharp-essential";

import { ExternalLink } from "@/components/catalog/artist-profile/external-link";
import { ReferenceActions } from "@/components/design/references/reference-actions";
import { ReferenceThumbnail } from "@/components/design/references/reference-thumbnail";
import type { TargetOption } from "@/components/design/references/target-picker";
import { StatusBadge } from "@/components/ui/status-badge";
import { targetKeyOf } from "@/lib/design/reference-rules";
import type { ReferenceView } from "@/lib/design/references";
import { fr } from "@/lib/i18n/fr";
import { referenceStatusTone } from "@/lib/ui/state-tones";

const ICONS: Record<ReferenceView["media"], React.ComponentType<IconProps>> = {
  image: IconImage,
  pdf: IconFile,
  video: IconFilm,
  other: IconFile,
  link: IconLink,
};

/**
 * One reference in a compact grid: its thumbnail (an image) or what it is,
 * its name opened in a new tab, its note, whether it is validated, and the
 * other targets the same resource serves (never a copy).
 */
export function ReferenceCard({
  projectId,
  reference: r,
  // The section it is shown in; null in « À rattacher ».
  currentKey,
  targets,
  canWrite,
}: {
  projectId: string;
  reference: ReferenceView;
  currentKey: string | null;
  targets: TargetOption[];
  canWrite: boolean;
}) {
  const t = fr.conceptionRefs;
  const Icon = ICONS[r.media];
  const labelOf = new Map(targets.map((o) => [o.key, o.label]));
  const kind = (
    <span className="flex flex-col items-center gap-1 text-muted-foreground">
      <Icon aria-hidden className="size-6" />
      <span className="text-caption font-medium">{t.kinds[r.media]}</span>
    </span>
  );
  const others = r.links
    .map(targetKeyOf)
    .filter((key) => key !== currentKey)
    .flatMap((key) => (labelOf.has(key) ? [labelOf.get(key)!] : []));

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-xl border border-border bg-background">
      <div className="relative flex aspect-[4/3] items-center justify-center bg-muted">
        {r.thumbnail ? (
          <ReferenceThumbnail src={r.thumbnail} fallback={kind} />
        ) : (
          kind
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <div className="flex items-start gap-2">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            {r.href ? (
              <ExternalLink
                href={r.href}
                className="truncate text-body-md font-medium underline-offset-2 hover:underline"
              >
                <span className="sr-only">{t.openLabel(r.name)} : </span>
                {r.name}
              </ExternalLink>
            ) : (
              <span className="truncate text-body-md font-medium text-muted-foreground">
                {r.name || t.unavailable}
              </span>
            )}
            <StatusBadge
              tone={referenceStatusTone[r.status]}
              size="sm"
              className="w-fit"
            >
              {t.statuses[r.status]}
            </StatusBadge>
          </div>
          {canWrite && (
            <ReferenceActions
              projectId={projectId}
              reference={{
                id: r.id,
                name: r.name,
                title: r.title,
                note: r.note,
                targets: r.links.map(targetKeyOf),
              }}
              options={targets}
            />
          )}
        </div>
        {r.note && (
          <p className="text-caption break-words text-muted-foreground">
            {r.note}
          </p>
        )}
        {others.length > 0 && (
          <p className="text-caption text-muted-foreground">
            {t.alsoFor(others.join(", "))}
          </p>
        )}
      </div>
    </article>
  );
}
