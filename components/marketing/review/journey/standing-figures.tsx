"use client";

import { IconChevronRight } from "nucleo-sharp-essential";
import { useState } from "react";

import { FormDialog } from "@/components/ui/form-dialog";
import { fr } from "@/lib/i18n/fr";
import type {
  StandingFigure,
  StandingGroup,
  StandingRow,
} from "@/lib/marketing/review/standing";

const t = fr.reviewJourney.standing;

/**
 * « Où on en est »: the four sentences (proto `.srow`) and, under « Voir le
 * détail », the tiles by group (`.dtile`). Every one opens the same glass
 * modal: what it counts, its rule of calculation, « Aucun élément. » when
 * nothing is counted.
 */
export function StandingRows({ rows }: { rows: StandingRow[] }) {
  const [open, setOpen] = useState<StandingFigure | null>(null);
  return (
    <>
      <ul className="overflow-hidden rounded-xl border border-[color:var(--border-hairline)]">
        {rows.map((row) => (
          <li
            key={row.key}
            className="border-b border-[color:var(--border-hairline)] last:border-b-0"
          >
            <button
              type="button"
              onClick={() => setOpen(row.figure)}
              className="flex w-full items-center gap-3 px-4 py-3.5 text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[color:var(--focus-ring)] [@media(hover:hover)]:hover:bg-[var(--surface-soft)]"
            >
              <span className="flex min-w-0 flex-1 flex-col">
                <b className="text-[length:var(--type-body-md)] leading-[var(--type-body-md-lh)] font-semibold">
                  {row.text}
                </b>
                {row.sub && (
                  <span className="text-[length:var(--type-body-sm)] leading-[var(--type-body-sm-lh)] text-[color:var(--text-secondary)]">
                    {row.sub}
                  </span>
                )}
              </span>
              <IconChevronRight
                aria-hidden
                className="size-4 shrink-0 text-[color:var(--text-tertiary)]"
              />
            </button>
          </li>
        ))}
      </ul>
      <FigureDialog figure={open} onClose={() => setOpen(null)} />
    </>
  );
}

export function StandingTiles({ groups }: { groups: StandingGroup[] }) {
  const [open, setOpen] = useState<StandingFigure | null>(null);
  return (
    <>
      {groups.map((group) => (
        <section key={group.key} className="flex flex-col gap-2.5">
          <h3 className="text-[length:var(--type-body-md)] leading-[var(--type-body-md-lh)] font-semibold">
            {group.label}
          </h3>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-2.5">
            {group.figures.map((figure) => (
              <button
                key={figure.key}
                type="button"
                aria-label={t.open(`${group.label} · ${figure.label}`)}
                onClick={() => setOpen(figure)}
                className="flex flex-col items-start gap-1 rounded-lg border border-transparent bg-[var(--surface-soft)] px-3.5 py-3 text-left transition-colors duration-[var(--duration-fast)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--focus-ring)] [@media(hover:hover)]:hover:border-[color:var(--border-default)]"
              >
                <span className="text-[length:var(--type-micro)] leading-[var(--type-micro-lh)] text-[color:var(--text-tertiary)]">
                  {figure.label}
                </span>
                <b className="text-[length:var(--type-figure-md)] leading-[var(--type-figure-md-lh)] font-semibold tabular-nums">
                  {figure.value}
                </b>
              </button>
            ))}
          </div>
        </section>
      ))}
      <FigureDialog figure={open} onClose={() => setOpen(null)} />
    </>
  );
}

function FigureDialog({
  figure,
  onClose,
}: {
  figure: StandingFigure | null;
  onClose: () => void;
}) {
  return (
    <FormDialog
      open={figure !== null}
      onOpenChange={(next) => !next && onClose()}
      title={figure?.title ?? ""}
      description={figure ? t.rule(figure.rule) : ""}
      closeLabel={fr.dialogs.close}
    >
      {figure && figure.items.length > 0 ? (
        <ul className="flex flex-col">
          {figure.items.map((item) => (
            <li
              key={item.key}
              className="flex flex-col border-b border-[color:var(--border-hairline)] px-3.5 py-3 last:border-b-0"
            >
              <b className="text-[length:var(--type-body-md)] leading-[var(--type-body-md-lh)] font-semibold break-words">
                {item.title}
              </b>
              {item.detail && (
                <span className="text-[length:var(--type-micro)] leading-[var(--type-micro-lh)] break-words text-[color:var(--text-tertiary)]">
                  {item.detail}
                </span>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[length:var(--type-body-sm)] leading-[var(--type-body-sm-lh)] text-[color:var(--text-secondary)]">
          {t.none}
        </p>
      )}
    </FormDialog>
  );
}
