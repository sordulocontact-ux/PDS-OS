"use client";

import { useState, useTransition } from "react";
import { toast } from "@/components/ui/toast";

import { ActivationSection } from "@/components/activations/activation-section";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { StatTiles } from "@/components/ui/stat-tiles";
import { StatusBadge } from "@/components/ui/status-badge";
import { ToneCallout } from "@/components/ui/tone-callout";
import type { SnapshotRowRecord } from "@/lib/activations/agency/queries";
import {
  applyAgencySnapshot,
  discardAgencySnapshot,
} from "@/lib/activations/agency/source-actions";
import { activationAgency } from "@/lib/i18n/fr/activation-agency";
import { activations } from "@/lib/i18n/fr/activations";

const fr = { activations, activationAgency };

const t = fr.activationAgency.preview;
const changeTone = {
  added: "info",
  modified: "warning",
  absent: "neutral",
  unchanged: "neutral",
} as const;

const summary = (r: SnapshotRowRecord) => {
  const m = r.mapped ?? {};
  return (
    [
      m.handle && `@${String(m.handle).replace(/^@/, "")}`,
      m.name,
      m.media,
      m.platform,
      m.agency_status,
    ]
      .filter(Boolean)
      .join(" · ") || r.rowKey
  );
};

/**
 * What a read of the agency's source would change, before anything is
 * applied (ticket : « Avant application, PO présente les ajouts,
 * modifications, suppressions apparentes, erreurs et conflits ») : counts
 * with their rule, each changed row with its errors, kept or left out.
 */
export function PreviewPanel({
  projectId,
  snapshotId,
  sourceLabel,
  rows,
  fileErrors,
  canWrite,
}: {
  projectId: string;
  snapshotId: string;
  sourceLabel: string;
  rows: SnapshotRowRecord[];
  fileErrors: string[];
  canWrite: boolean;
}) {
  const changed = rows.filter((r) => r.change !== "unchanged");
  const [kept, setKept] = useState<Set<string>>(
    () => new Set(changed.map((r) => r.rowKey)),
  );
  const [pending, startTransition] = useTransition();
  const count = (c: SnapshotRowRecord["change"]) =>
    rows.filter((r) => r.change === c).length;
  const all = kept.size === changed.length;
  const act = (
    run: () => Promise<{ ok: boolean; error?: string }>,
    done: string,
  ) =>
    startTransition(async () => {
      const r = await run();
      if (r.ok) toast.success(done);
      else toast.error(r.error ?? fr.activations.errors.generic);
    });

  return (
    <ActivationSection
      id="preview"
      title={`${t.title} · ${sourceLabel}`}
      description={t.description}
    >
      <div className="flex flex-col gap-4">
        <StatTiles
          columns={5}
          stats={[
            { label: t.added, value: String(count("added")) },
            { label: t.modified, value: String(count("modified")) },
            { label: t.absent, value: String(count("absent")) },
            { label: t.unchanged, value: String(count("unchanged")) },
            {
              label: t.errors,
              value: String(rows.filter((r) => r.errors.length > 0).length),
            },
          ]}
        />
        <p className="text-caption text-muted-foreground">{t.rule}</p>
        {fileErrors.length > 0 && (
          <ToneCallout tone="warning">
            <p className="font-medium">{t.fileErrors}</p>
            <ul className="list-disc pl-5">
              {fileErrors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          </ToneCallout>
        )}
        {changed.length === 0 ? (
          <p className="text-body-sm text-muted-foreground">{t.nothing}</p>
        ) : (
          <ul className="flex flex-col divide-y divide-[color:var(--border-hairline)] rounded-xl border">
            {changed.map((r) => (
              <li key={r.rowKey} className="flex items-start gap-3 px-3 py-2">
                {canWrite && (
                  <Checkbox
                    aria-label={`${t.select} ${summary(r)}`}
                    className="mt-1"
                    checked={kept.has(r.rowKey)}
                    onChange={(e) =>
                      setKept((prev) => {
                        const next = new Set(prev);
                        if (e.target.checked) next.add(r.rowKey);
                        else next.delete(r.rowKey);
                        return next;
                      })
                    }
                  />
                )}
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="flex flex-wrap items-center gap-2 text-body-sm">
                    <StatusBadge size="sm" tone={changeTone[r.change]}>
                      {t.changes[r.change]}
                    </StatusBadge>
                    <span className="font-medium break-words">
                      {summary(r)}
                    </span>
                    {r.position && (
                      <span className="text-caption text-muted-foreground">
                        l. {r.position}
                      </span>
                    )}
                  </span>
                  {r.errors.map((e) => (
                    <span
                      key={e}
                      className="text-caption text-[color:var(--tone-warning-fg)]"
                    >
                      {e}
                    </span>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}
        {canWrite && (
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="lg"
              disabled={pending}
              onClick={() =>
                act(
                  () => discardAgencySnapshot({ projectId, snapshotId }),
                  t.discarded,
                )
              }
            >
              {t.discard}
            </Button>
            <Button
              type="button"
              size="lg"
              disabled={pending}
              onClick={() =>
                act(
                  () =>
                    applyAgencySnapshot({
                      projectId,
                      snapshotId,
                      keys: all ? null : [...kept],
                    }),
                  t.confirmed,
                )
              }
            >
              {all ? t.confirmAll : t.confirmSelected(kept.size)}
            </Button>
          </div>
        )}
      </div>
    </ActivationSection>
  );
}
