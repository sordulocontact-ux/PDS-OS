"use client";

import { useState } from "react";

import { ReferenceThumbnail } from "@/components/design/references/reference-thumbnail";
import {
  TargetPicker,
  type TargetOption,
} from "@/components/design/references/target-picker";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { setReferenceTargets } from "@/lib/design/actions/reference-links";
import { fr } from "@/lib/i18n/fr";

const t = fr.designSteps.references;

export type TileReference = {
  id: string;
  name: string;
  href: string | null;
  thumbnail: string | null;
  validated: boolean;
  // « Moodboard · Licence libre »
  kindLine: string;
  note: string | null;
  // The groups it serves (target keys), and their names but the current.
  targets: string[];
  others: string[];
  // « Déposée par Nadia Benali ».
  credit: string;
};

/**
 * One reference (proto refTile): picture, title, Proposée / Validée, sort
 * and rights, notes, « Aussi pour : … », who brought it; « Rattacher à… »
 * opens the groups in place (none = « À rattacher »).
 */
export function ReferenceTile({
  projectId,
  reference: r,
  options,
  canEdit,
}: {
  projectId: string;
  reference: TileReference;
  options: TargetOption[];
  canEdit: boolean;
}) {
  const [linking, setLinking] = useState(false);
  const [targets, setTargets] = useState(r.targets);
  const { pending, error, run } = useWriteSubmit(
    () => setLinking(false),
    targets.length ? t.attached : t.detached,
  );
  return (
    <article className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-[color:var(--border-hairline)] bg-card">
      <a
        href={r.href ?? undefined}
        target="_blank"
        rel="noreferrer"
        className="relative block aspect-[4/3] bg-[var(--surface-soft)]"
      >
        {r.thumbnail ? (
          <ReferenceThumbnail
            src={r.thumbnail}
            fallback={<span className="sr-only">{r.name}</span>}
          />
        ) : (
          <span className="absolute inset-0 grid place-items-center px-3 text-center text-caption break-all text-[color:var(--text-secondary)]">
            {r.name}
          </span>
        )}
      </a>
      <div className="flex flex-col gap-1.5 p-3">
        <b className="text-body-sm font-semibold break-words">{r.name}</b>
        <span className="flex flex-wrap items-center gap-2">
          <StatusBadge tone={r.validated ? "success" : "neutral"} size="sm">
            {r.validated ? t.validated : t.proposed}
          </StatusBadge>
          <span className="text-[length:var(--type-micro)] leading-[var(--type-micro-lh)] text-[color:var(--text-tertiary)]">
            {r.kindLine}
          </span>
        </span>
        {r.note && (
          <span className="text-caption text-[color:var(--text-secondary)]">
            {r.note}
          </span>
        )}
        {r.others.length > 0 && (
          <span className="text-[length:var(--type-micro)] leading-[var(--type-micro-lh)] text-[color:var(--text-tertiary)]">
            {t.alsoFor(r.others.join(", "))}
          </span>
        )}
        <span className="text-[length:var(--type-micro)] leading-[var(--type-micro-lh)] text-[color:var(--text-tertiary)]">
          {r.credit}
        </span>
        {canEdit && linking ? (
          <div className="flex flex-col gap-2">
            <TargetPicker
              legend={t.attachTo}
              options={options}
              value={targets}
              onChange={setTargets}
              disabled={pending}
            />
            {error && (
              <p className="text-caption text-[color:var(--tone-danger-fg)]">
                {error}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                disabled={pending}
                onClick={() =>
                  run(() => setReferenceTargets(projectId, r.id, targets))
                }
              >
                {t.save}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setTargets(r.targets);
                  setLinking(false);
                }}
              >
                {t.cancel}
              </Button>
            </div>
          </div>
        ) : (
          canEdit && (
            <Button
              size="sm"
              variant="ghost"
              className="self-start"
              onClick={() => setLinking(true)}
            >
              {r.targets.length ? t.attachTo : t.attach}
            </Button>
          )
        )}
      </div>
    </article>
  );
}
