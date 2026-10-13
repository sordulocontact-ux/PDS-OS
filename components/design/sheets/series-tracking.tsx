"use client";

import { useDesignAction } from "@/components/design/work/use-design-action";
import { Button } from "@/components/ui/button";
import { setSeriesTracking } from "@/lib/design/actions/sheet-items";
import { fr } from "@/lib/i18n/fr";

/**
 * How a series is followed (MKT-C2-07): « En bloc » (one decision for all
 * its items) or « Contenu par contenu » (one decision each, every content at
 * its own pace) — the project's mode until chosen. The rule that gives the
 * series its status is said here; decisions already taken stay in history.
 */
export function SeriesTracking({
  projectId,
  sheetId,
  tracking,
  canEdit,
}: {
  projectId: string;
  sheetId: string;
  tracking: "global" | "per_item" | null;
  canEdit: boolean;
}) {
  const t = fr.conceptionSheet.tracking;
  const { pending, run } = useDesignAction();
  const options = [
    { key: "global" as const, label: t.global, hint: t.globalHint },
    { key: "per_item" as const, label: t.perItem, hint: t.perItemHint },
  ];
  return (
    <div className="flex flex-col gap-3">
      <div role="group" aria-label={t.title} className="flex flex-wrap gap-2">
        {options.map((o) => (
          <Button
            key={o.key}
            type="button"
            size="sm"
            variant={tracking === o.key ? "default" : "outline"}
            aria-pressed={tracking === o.key}
            disabled={!canEdit || pending}
            title={o.hint}
            onClick={() =>
              tracking !== o.key &&
              run(() => setSeriesTracking(projectId, sheetId, o.key), {
                success: t.saved,
              })
            }
          >
            {o.label}
          </Button>
        ))}
      </div>
      <p className="text-caption text-muted-foreground">
        {tracking === "global"
          ? t.globalHint
          : tracking === "per_item"
            ? t.perItemHint
            : t.project}
      </p>
      <p className="text-caption text-muted-foreground">{t.rule}</p>
      <p className="text-caption text-muted-foreground">{t.history}</p>
    </div>
  );
}
