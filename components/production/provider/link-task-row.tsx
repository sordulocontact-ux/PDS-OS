"use client";

import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { productionChecklist } from "@/lib/i18n/fr/production-checklist";
import { finishTaskByLink } from "@/lib/production/checklist-actions";

import { useLinkSubmit } from "./use-link-submit";

const fr = { productionChecklist };

const t = fr.productionChecklist;

/** A task of the company on its link: what, for when, where it comes
 * from, « Fait » while it is not (proto portal task rows). */
export function LinkTaskRow({
  token,
  id,
  title,
  meta,
  done,
  review,
}: {
  token: string;
  id: string;
  title: string;
  meta: string;
  done: boolean;
  review: boolean;
}) {
  const { pending, run } = useLinkSubmit();
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[var(--surface-soft)] px-3 py-2.5 modern:py-3">
      <span className="flex min-w-0 flex-1 flex-col">
        <span>{title}</span>
        <span className="text-caption text-[color:var(--text-tertiary)]">
          {meta}
        </span>
      </span>
      <span className="flex items-center gap-2">
        <StatusBadge
          size="sm"
          tone={done ? "success" : review ? "warning" : "neutral"}
        >
          {done ? t.state.done : review ? t.state.review : t.state.todo}
        </StatusBadge>
        {!done && (
          <Button
            size="sm"
            variant="outline"
            aria-label={t.finishLabel(title)}
            disabled={pending}
            aria-busy={pending || undefined}
            onClick={() =>
              run(() => finishTaskByLink({ token, actionId: id }), t.link.done)
            }
          >
            {t.finish}
          </Button>
        )}
      </span>
    </li>
  );
}
