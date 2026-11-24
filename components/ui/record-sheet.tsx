import type { ComponentType, ReactNode } from "react";

import { Fold } from "@/components/ui/fold";
import { cn } from "@/lib/utils";

// The pieces of a record's side sheet (docs/STYLE-FINANCE-PARTOUT.md
// § 6.7 bis, the Réseau's model after Accordee, Sacha 24/11/2026): a
// titled block, a line « icon · label · value », the summary card. Its
// blocks of people and linked records: record-sheet-blocks.tsx.

type IconType = ComponentType<{ className?: string; "aria-hidden"?: boolean }>;

/** A block of the sheet: its title, then its content. */
export function SheetBlock({
  title,
  aside,
  children,
}: {
  title: string;
  // On the title's line, at its right (a total, a count).
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-[length:var(--type-body-md)] font-medium">
          {title}
        </h3>
        {aside && (
          <span className="text-caption text-[color:var(--text-secondary)]">
            {aside}
          </span>
        )}
      </div>
      {children}
    </section>
  );
}

/** « icon Label   value »: a fact of the contact, a record linked to it. */
export function SheetLine({
  icon: Icon,
  label,
  children,
}: {
  icon: IconType;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,10rem)_minmax(0,1fr)] items-start gap-3">
      <span className="flex min-h-7 items-center gap-2.5 text-[color:var(--text-secondary)]">
        <Icon aria-hidden className="size-4 shrink-0" />
        <span className="truncate">{label}</span>
      </span>
      <div className="flex min-h-7 min-w-0 items-center break-words">
        {children}
      </div>
    </div>
  );
}

/** The lines of a block, evenly apart. */
export function SheetLines({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("flex flex-col gap-2", className)}>{children}</div>;
}

/**
 * The one framed card at the head of a sheet: what is awaited (in red when
 * late) or the good news, a line under it, then « icon · label · count »
 * lines, the counts at zero left out. A line given its `list` folds it,
 * closed at first, opened by its chevron (« Parties 2 › », Sacha
 * 24/11/2026); a list shown elsewhere in the sheet stays a count.
 */
export function SheetSummaryCard({
  title,
  alert = false,
  caption,
  lines,
}: {
  title: string;
  // Something is late: the title in the danger tone.
  alert?: boolean;
  caption?: string | null;
  lines: { icon: IconType; label: string; count: number; list?: ReactNode }[];
}) {
  const shown = lines.filter((line) => line.count > 0);
  // Counts stay aligned when some line has a chevron.
  const folding = shown.some((line) => line.list);
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-[color:var(--border-default)] bg-[var(--surface-soft)] p-4">
      <div className="flex flex-col gap-0.5">
        <p
          className={cn(
            "font-medium",
            alert && "text-[color:var(--tone-danger-fg)]",
          )}
        >
          {title}
        </p>
        {caption && (
          <p className="text-caption text-[color:var(--text-secondary)]">
            {caption}
          </p>
        )}
      </div>
      {shown.length > 0 && (
        <SheetLines className="border-t border-[color:var(--border-hairline)] pt-3">
          {shown.map(({ icon: Icon, label, count, list }) => {
            const line = (
              <>
                <Icon
                  aria-hidden
                  className="size-4 shrink-0 text-[color:var(--text-secondary)]"
                />
                <span className="flex-1">{label}</span>
                <span className="text-[color:var(--text-secondary)] tabular-nums">
                  {count}
                </span>
              </>
            );
            return list ? (
              <Fold key={label} variant="row" summary={line}>
                <div className="flex flex-col gap-2 pl-6.5">{list}</div>
              </Fold>
            ) : (
              <div key={label} className="flex items-center gap-2.5">
                {line}
                {folding && <span aria-hidden className="size-4 shrink-0" />}
              </div>
            );
          })}
        </SheetLines>
      )}
    </div>
  );
}

export const SHEET_LINK =
  "text-[color:var(--text-link)] underline-offset-2 hover:underline";
