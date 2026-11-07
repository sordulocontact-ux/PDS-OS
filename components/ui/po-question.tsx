import { IconChevronLeft, IconChevronRight } from "nucleo-sharp-essential";

import { StatusBadge } from "@/components/ui/status-badge";
import { ViewLink } from "@/components/ui/view-link";
import { poQuestion } from "@/lib/i18n/fr/po-question";
import type { Tone } from "@/lib/ui/state-tones";
import { cn } from "@/lib/utils";

const fr = { poQuestion };

const t = fr.poQuestion;

/**
 * THE box of a question PO asks, one at a time — the Cadrage's
 * (QuestionScreen), the Cadrage juridique's (QuestionCard) and the
 * Stratégie's (StrategyQuestionBox). Sunk to the
 * page's surface inside the step's card (Figma PDS OS 304:20801), the domain
 * alone above the question (« Temporalité »: whether it is missing or to
 * confirm shows in the field or the answer below, Sacha 29/10/2026), its
 * rank on the right — with arrows to the question before and after when
 * the caller gives `nav` —, the question in 20 px, why it is asked and its
 * state badge, then the answer the caller renders (`children`: field,
 * « M'aider à définir », Confirmer / Modifier, PoReading…). Server-safe.
 */
export function PoQuestion({
  eyebrow,
  rank,
  nav,
  title,
  why,
  state,
  children,
}: {
  eyebrow: string;
  rank?: { position: number; total: number };
  // The arrows to the question before and after (Cadrage, Cadrage juridique).
  nav?: PoQuestionNav;
  title: string;
  why?: React.ReactNode;
  state?: { label: string; tone: Tone };
  children?: React.ReactNode;
}) {
  const position = nav ?? rank;
  return (
    <section
      aria-labelledby="po-question-title"
      className="flex min-w-0 flex-col gap-3.5 rounded-xl border border-[color:var(--border-hairline)] bg-[var(--surface-page)] p-4.5"
    >
      <div className="flex flex-col gap-1.5">
        <div className="flex min-h-8 items-center justify-between gap-3">
          <span className="min-w-0 text-caption text-[color:var(--text-secondary)]">
            {eyebrow}
          </span>
          {nav ? (
            <QuestionArrows nav={nav} />
          ) : (
            position &&
            position.total > 1 && (
              <span className="shrink-0 text-caption text-[color:var(--text-tertiary)] tabular-nums">
                {t.rank(position.position, position.total)}
              </span>
            )
          )}
        </div>
        <h3
          id="po-question-title"
          className="text-[length:var(--type-display-sm)] leading-[var(--type-display-sm-lh)] font-medium tracking-[var(--type-display-tracking)] text-balance break-words"
        >
          <span className="sr-only">{t.box} : </span>
          {title}
        </h3>
        {why && (
          <div className="text-[length:var(--type-body-sm)] leading-[var(--type-body-sm-lh)] text-[color:var(--text-secondary)]">
            {why}
          </div>
        )}
        {state && (
          <StatusBadge tone={state.tone} size="sm" className="self-start">
            {state.label}
          </StatusBadge>
        )}
      </div>
      {children}
    </section>
  );
}

// A link (Cadrage: one URL per question), or an action when the questions
// live in one page's state (Cadrage juridique); null at the ends.
type NavTarget = string | (() => void) | null;

export type PoQuestionNav = {
  position: number;
  total: number;
  previous: NavTarget;
  next: NavTarget;
};

const arrowClass =
  "grid size-8 shrink-0 place-items-center rounded-full border border-[color:var(--border-default)] text-foreground transition-colors duration-[var(--duration-fast)] ease-[var(--ease-standard)] hover:border-[color:var(--border-hover)] hover:bg-[var(--control-bg-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--focus-ring)] [&_svg]:size-4";

/** « ‹ 8 sur 23 › »: links to the question before and after, faded at the ends. */
function QuestionArrows({ nav }: { nav: PoQuestionNav }) {
  const arrow = (to: NavTarget, label: string, icon: React.ReactNode) =>
    typeof to === "string" ? (
      <ViewLink href={to} aria-label={label} className={arrowClass}>
        {icon}
      </ViewLink>
    ) : to ? (
      <button
        type="button"
        onClick={to}
        aria-label={label}
        className={cn(arrowClass, "cursor-pointer")}
      >
        {icon}
      </button>
    ) : (
      <span aria-hidden className={cn(arrowClass, "opacity-35")}>
        {icon}
      </span>
    );
  return (
    <nav aria-label={t.nav} className="flex shrink-0 items-center gap-1.5">
      {arrow(nav.previous, t.previous, <IconChevronLeft />)}
      <span className="text-caption text-[color:var(--text-tertiary)] tabular-nums">
        {t.rank(nav.position, nav.total)}
      </span>
      {arrow(nav.next, t.next, <IconChevronRight />)}
    </nav>
  );
}
