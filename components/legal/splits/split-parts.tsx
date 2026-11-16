"use client";

import { FieldError } from "@/components/auth/form-message";
import { Input } from "@/components/ui/input";
import { legalSplits } from "@/lib/i18n/fr/legal-splits";
import {
  publishersOf,
  totalOf,
  type DraftErrors,
  type SplitDraft,
} from "@/lib/legal/splits/draft";
import { FULL, formatShare } from "@/lib/legal/splits/shares";
import { cn } from "@/lib/utils";

const fr = { legalSplits };

/** « Parts de l'œuvre » (JUR-01): one part per creator and per publisher
 * that follows from who publishes whom, typed by a person — empty at
 * first, PO never proposes one — and the total, exactly 100 %. */
export function SplitParts({
  draft,
  errors,
  onCreator,
  onPublisher,
}: {
  draft: SplitDraft;
  errors: DraftErrors | null;
  onCreator: (key: number, share: string) => void;
  onPublisher: (key: string, share: string) => void;
}) {
  const t = fr.legalSplits.editor;
  const names = new Map(draft.creators.map((c) => [c.key, c.name]));
  const total = totalOf(draft);
  const rows = [
    ...draft.creators.map((c) => ({
      id: `share-${c.key}`,
      name: c.name || t.thisCreator,
      detail: c.role ? fr.legalSplits.roles[c.role] : null,
      value: c.share,
      error: errors?.creators[c.key]?.share,
      set: (v: string) => onCreator(c.key, v),
    })),
    ...publishersOf(draft.creators).map((p) => ({
      id: `share-${p.key}`,
      name: p.name,
      detail: t.represents(p.represents.map((k) => names.get(k) ?? "")),
      value: draft.publisherShares[p.key] ?? "",
      error: errors?.publishers[p.key],
      set: (v: string) => onPublisher(p.key, v),
    })),
  ];
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-[color:var(--border-hairline)] bg-card">
      {rows.map((row) => (
        <div
          key={row.id}
          className="grid grid-cols-[minmax(0,1fr)_8rem] items-start gap-3 border-b border-[color:var(--border-hairline)] px-3.5 py-2.75 modern:px-4 modern:py-3"
        >
          <span className="flex min-w-0 flex-col gap-0.5 pt-2">
            <label htmlFor={row.id} className="font-semibold break-words">
              {row.name}
            </label>
            {row.detail && (
              <span className="text-caption text-muted-foreground">
                {row.detail}
              </span>
            )}
            {row.error && (
              <FieldError id={`${row.id}-error`}>{row.error}</FieldError>
            )}
          </span>
          <div className="relative">
            <Input
              id={row.id}
              name={row.id}
              aria-required
              aria-invalid={row.error ? true : undefined}
              aria-describedby={row.error ? `${row.id}-error` : undefined}
              inputMode="decimal"
              placeholder={t.sharePlaceholder}
              className="h-10 pr-9 text-right text-base tabular-nums md:text-sm"
              value={row.value}
              onChange={(event) => row.set(event.target.value)}
            />
            <span
              aria-hidden
              className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground"
            >
              %
            </span>
          </div>
        </div>
      ))}
      <div className="flex flex-col gap-1 px-3.5 py-2.75 modern:px-4 modern:py-3">
        <span
          aria-live="polite"
          className={cn(
            "self-end font-semibold tabular-nums",
            total !== FULL && "text-[color:var(--tone-warning-fg)]",
          )}
        >
          {total === FULL ? t.totalOk : t.total(formatShare(total))}
        </span>
        {errors?.total && (
          <FieldError id="split-total-error">{errors.total}</FieldError>
        )}
      </div>
    </div>
  );
}
