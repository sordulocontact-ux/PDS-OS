import { IconChevronRight } from "nucleo-sharp-essential";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { StateMark, type MarkState } from "@/components/ui/state-mark";
import { StatusBadge } from "@/components/ui/status-badge";
import type { Tone } from "@/lib/ui/state-tones";

export type DimensionBadge = { tone: Tone; label: string };

/**
 * The dimensions of a step (Cadrage « Les 6 dimensions », Stratégie « Les 8
 * dimensions »; proto « Suite du Cadrage », Sacha 29/10/2026, made common
 * on 06/11/2026): the header (title, dictation beside it), then one frame
 * where each dimension is a `DimensionItem`.
 */
export function DimensionList({
  labelledBy,
  header,
  children,
}: {
  // The id of the title given in `header`.
  labelledBy: string;
  header: ReactNode;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={labelledBy} className="flex flex-col gap-3">
      {header}
      {/* One card per dimension, spaced (Vanta, Adaline, Squarespace;
          Sacha 07/11/2026). */}
      <div className="flex flex-col gap-2">{children}</div>
    </section>
  );
}

const isBadge = (b: DimensionBadge | false | null): b is DimensionBadge =>
  Boolean(b);

/**
 * One dimension, its own card: its state mark (`mark`: done, to look at,
 * nothing yet), its name, its pill (counted by the module's code: « n à
 * confirmer », what is left, « Complète »), the chevron; open, its lines
 * under a hairline (`children`), then what closes it (`footer`: « Confirmer
 * les n », « Ajouter … »). Nothing inside folds again (Sacha 06/11/2026:
 * « des chevrons dans des chevrons, ça cache des informations »).
 */
export function DimensionItem({
  id,
  name,
  mark,
  badges,
  open = false,
  children,
  footer,
}: {
  // Anchor (a link of the step opens on it).
  id: string;
  name: ReactNode;
  mark: MarkState;
  // A pill each; `false` / `null` for one that does not apply.
  badges: Array<DimensionBadge | false | null>;
  open?: boolean;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <details
      id={id}
      open={open}
      className="group/dim scroll-mt-24 overflow-hidden rounded-xl border border-[color:var(--border-hairline)] bg-card"
    >
      <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-4 py-3 outline-none hover:bg-[var(--control-bg-hover)] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[color:var(--focus-ring)] [&::-webkit-details-marker]:hidden">
        <StateMark state={mark} />
        <span className="min-w-0 flex-1 text-body-md font-medium">{name}</span>
        {badges.filter(isBadge).map((b) => (
          <StatusBadge key={b.label} tone={b.tone} size="sm">
            {b.label}
          </StatusBadge>
        ))}
        <IconChevronRight className="size-4 shrink-0 text-[color:var(--text-tertiary)] transition-transform duration-[var(--duration-base)] ease-[var(--ease-standard)] group-open/dim:rotate-90 motion-reduce:transition-none" />
      </summary>
      <div className="border-t border-[color:var(--border-hairline)]">
        {children}
        {footer}
      </div>
    </details>
  );
}

/**
 * « Confirmer les n » at the foot of a dimension (proto « Suite du
 * Cadrage »): what PO understood, confirmed in one gesture once read, each
 * line keeping its source; the hint says what the gesture does. Rendered
 * by a client component (`onConfirm`).
 */
export function DimensionConfirm({
  label,
  pendingLabel,
  hint,
  pending,
  onConfirm,
  children,
}: {
  label: string;
  pendingLabel: string;
  hint: string;
  pending: boolean;
  onConfirm: () => void;
  // Under the button (the error).
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2 border-t border-[color:var(--border-hairline)] px-3.5 py-3 first:border-t-0">
      <Button
        size="sm"
        disabled={pending}
        aria-busy={pending || undefined}
        onClick={onConfirm}
      >
        {pending ? pendingLabel : label}
      </Button>
      <p className="min-w-48 flex-1 text-caption text-[color:var(--text-secondary)]">
        {hint}
      </p>
      {children && <div className="basis-full">{children}</div>}
    </div>
  );
}
