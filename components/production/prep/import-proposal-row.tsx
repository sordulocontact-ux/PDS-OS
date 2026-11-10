"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { productionImport } from "@/lib/i18n/fr/production-import";
import { cn } from "@/lib/utils";

const fr = { productionImport };

/**
 * One proposal of an imported organisation: a box to keep it, what it is,
 * the value it would replace (struck through) then the proposed one, and
 * the words of the pasted text it rests on. `children`: what the person
 * still enters (the number of people of a need).
 */
export function ImportProposalRow({
  id,
  checked,
  disabled,
  onToggle,
  title,
  value,
  before = null,
  quote,
  children,
}: {
  id: string;
  checked: boolean;
  disabled: boolean;
  onToggle: () => void;
  title: string;
  value: string;
  // The value already there, replaced only if the box is ticked.
  before?: string | null;
  quote: string;
  children?: React.ReactNode;
}) {
  const t = fr.productionImport.review;
  const boxId = `production-import-${id}`;
  return (
    <li className="flex items-start gap-3 px-4 py-3.5">
      <Checkbox
        id={boxId}
        size="md"
        checked={checked}
        disabled={disabled}
        onChange={onToggle}
        aria-label={t.keep(title)}
        className="mt-0.5"
      />
      <div
        className={cn(
          "flex min-w-0 flex-1 flex-col gap-1.5",
          !checked && "text-muted-foreground",
        )}
      >
        <label htmlFor={boxId} className="cursor-pointer font-semibold">
          {title}
        </label>
        {before !== null && (
          <p className="text-caption break-words text-muted-foreground">
            <span>{t.before} · </span>
            <del>{before}</del>
          </p>
        )}
        <p className="break-words whitespace-pre-wrap">
          {before !== null && (
            <span className="text-caption text-muted-foreground">
              {t.after} ·{" "}
            </span>
          )}
          {value}
        </p>
        <p className="text-caption break-words text-muted-foreground">
          {t.quote(quote)} · {t.source}
        </p>
        {children}
      </div>
    </li>
  );
}
