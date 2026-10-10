"use client";

import { ExternalLink } from "@/components/catalog/artist-profile/external-link";
import { useDesignAction } from "@/components/design/work/use-design-action";
import { EmptyNote } from "@/components/shell/empty-state";
import { Button } from "@/components/ui/button";
import { removeDesignReference } from "@/lib/design/actions/references";
import type { ConceptionReference } from "@/lib/design/conception";
import { fr } from "@/lib/i18n/fr";

/** The links gathered for the target, opened in a new tab. */
export function ReferencesList({
  projectId,
  references,
  canWrite,
}: {
  projectId: string;
  references: ConceptionReference[];
  canWrite: boolean;
}) {
  const t = fr.conceptionWork.references;
  const { pending, run } = useDesignAction();
  if (references.length === 0) return <EmptyNote>{t.empty}</EmptyNote>;
  return (
    <ul className="flex flex-col gap-2">
      {references
        .flatMap((r) => (!r.url ? [] : [{ ...r, url: r.url }]))
        .map((r) => (
          <li
            key={r.id}
            className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl border border-border px-4 py-3"
          >
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <ExternalLink
                href={r.url}
                className="truncate text-body-md font-semibold underline-offset-2 hover:underline"
              >
                <span className="sr-only">{t.open} : </span>
                {r.url}
              </ExternalLink>
              {r.note && (
                <span className="text-caption break-words text-muted-foreground">
                  {r.note}
                </span>
              )}
            </span>
            {canWrite && (
              <Button
                variant="ghost"
                size="sm"
                disabled={pending}
                aria-label={t.removeLabel(r.url)}
                onClick={() =>
                  run(() => removeDesignReference(projectId, r.id), {
                    success: t.removed,
                  })
                }
              >
                {t.remove}
              </Button>
            )}
          </li>
        ))}
    </ul>
  );
}
