"use client";

import { useState } from "react";

import { StepSection } from "@/components/shell/journey/step-section";
import { FormDialog } from "@/components/ui/form-dialog";
import { InfoRow, Rows } from "@/components/ui/rows";
import { dialogs } from "@/lib/i18n/fr/dialogs";
import { reviewJourney } from "@/lib/i18n/fr/review-journey";
import type {
  StandingFigure,
  StandingGroup,
  StandingRow,
} from "@/lib/marketing/review/standing";

const fr = { dialogs, reviewJourney };

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
      <Rows>
        {rows.map((row) => (
          <InfoRow
            key={row.key}
            title={row.text}
            detail={row.sub ?? undefined}
            onClick={() => setOpen(row.figure)}
          />
        ))}
      </Rows>
      <FigureDialog figure={open} onClose={() => setOpen(null)} />
    </>
  );
}

export function StandingTiles({ groups }: { groups: StandingGroup[] }) {
  const [open, setOpen] = useState<StandingFigure | null>(null);
  return (
    <>
      {groups.map((group) => (
        <StepSection key={group.key} title={group.label}>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-2.5 modern:gap-2">
            {group.figures.map((figure) => (
              <button
                key={figure.key}
                type="button"
                aria-label={t.open(`${group.label} · ${figure.label}`)}
                onClick={() => setOpen(figure)}
                className="flex flex-col items-start gap-1 rounded-lg border border-transparent bg-[var(--surface-soft)] px-3.5 py-3 text-left transition-colors duration-[var(--duration-fast)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--focus-ring)] modern:px-4 [@media(hover:hover)]:hover:border-[color:var(--border-default)]"
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
        </StepSection>
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
        <Rows flush>
          {figure.items.map((item) => (
            <InfoRow
              key={item.key}
              title={item.title}
              detail={item.detail ?? undefined}
            />
          ))}
        </Rows>
      ) : (
        <p className="text-[length:var(--type-body-sm)] leading-[var(--type-body-sm-lh)] text-[color:var(--text-secondary)]">
          {t.none}
        </p>
      )}
    </FormDialog>
  );
}
