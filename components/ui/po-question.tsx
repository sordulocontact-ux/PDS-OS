import { RankArrows, type RankNav } from "@/components/ui/rank-arrows";
import { StatusBadge } from "@/components/ui/status-badge";
import { TitleBlock } from "@/components/ui/title-block";
import { poQuestion } from "@/lib/i18n/fr/po-question";
import type { Tone } from "@/lib/ui/state-tones";

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
 * `variant="inline"`: the same question opened in place, under its line of
 * a list (Cadrage « Les 6 dimensions », Sacha 09/11/2026): no frame nor
 * domain, the question in 18 px and `aside` (« Fermer ») on its right.
 */
export function PoQuestion({
  eyebrow,
  rank,
  nav,
  title,
  why,
  state,
  variant = "box",
  aside,
  children,
}: {
  eyebrow: string;
  rank?: { position: number; total: number };
  // The arrows to the question before and after (Cadrage, Cadrage juridique).
  nav?: PoQuestionNav;
  title: string;
  why?: React.ReactNode;
  state?: { label: string; tone: Tone };
  variant?: "box" | "inline";
  // Inline: on the right of the question (« Fermer »).
  aside?: React.ReactNode;
  children?: React.ReactNode;
}) {
  const position = nav ?? rank;
  if (variant === "inline")
    return (
      <section
        aria-labelledby="po-question-inline-title"
        className="flex min-w-0 flex-col gap-3.5 border-b border-[color:var(--border-hairline)] bg-[var(--surface-soft)] px-3.5 pt-3.5 pb-4 last:border-b-0"
      >
        <div className="flex items-start justify-between gap-3">
          <TitleBlock>
            <h4
              id="po-question-inline-title"
              className="text-body-lg font-medium tracking-[var(--type-display-tracking)] text-balance break-words"
            >
              {title}
            </h4>
            {why && (
              <div className="text-[length:var(--type-body-sm)] leading-[var(--type-body-sm-lh)] text-[color:var(--text-secondary)]">
                {why}
              </div>
            )}
          </TitleBlock>
          {aside}
        </div>
        {children}
      </section>
    );
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
            <RankArrows nav={nav} labels={arrowLabels} />
          ) : (
            position &&
            position.total > 1 && (
              <span className="shrink-0 text-caption text-[color:var(--text-tertiary)] tabular-nums">
                {t.rank(position.position, position.total)}
              </span>
            )
          )}
        </div>
        <TitleBlock>
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
        </TitleBlock>
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

// The arrows to the question before and after (components/ui/rank-arrows.tsx).
export type PoQuestionNav = RankNav;

const arrowLabels = { nav: t.nav, previous: t.previous, next: t.next };
