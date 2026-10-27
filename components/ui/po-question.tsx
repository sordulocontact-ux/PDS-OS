import { StatusBadge } from "@/components/ui/status-badge";
import { poQuestion } from "@/lib/i18n/fr/po-question";
import type { Tone } from "@/lib/ui/state-tones";

const fr = { poQuestion };

const t = fr.poQuestion;

/**
 * « Question de PO » (proto « Projet complet », `.nowbox`): THE box of a
 * question PO asks, one at a time — the Cadrage's (QuestionScreen) and the
 * Cadrage juridique's (QuestionCard). Soft background, « Question de PO »,
 * the domain and state in capitals (« PARTICIPANTS · INFORMATION
 * MANQUANTE »), its rank on the right (« 1 sur 2 »), the question in 20 px,
 * why it is asked and its state badge — then the answer the caller renders
 * (`children`: field, « M'aider à définir », Confirmer / Modifier, « Lire
 * ma réponse », PoReading…). Server-safe.
 */
export function PoQuestion({
  eyebrow,
  rank,
  title,
  why,
  state,
  children,
}: {
  eyebrow: string;
  rank?: { position: number; total: number };
  title: string;
  why?: React.ReactNode;
  state?: { label: string; tone: Tone };
  children?: React.ReactNode;
}) {
  return (
    <section
      aria-labelledby="po-question-title"
      className="flex min-w-0 flex-col gap-2.5 rounded-xl bg-[var(--surface-soft)] p-4"
    >
      <h3 className="text-[length:var(--type-body-sm)] leading-[var(--type-body-sm-lh)] font-semibold text-[color:var(--text-tertiary)]">
        {t.box}
      </h3>
      <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline justify-between gap-3">
          <span className="min-w-0 text-[length:var(--type-micro)] leading-[var(--type-micro-lh)] font-semibold tracking-[var(--type-eyebrow-tracking)] text-[color:var(--text-tertiary)] uppercase">
            {eyebrow}
          </span>
          {rank && rank.total > 1 && (
            <span className="shrink-0 text-[length:var(--type-micro)] leading-[var(--type-micro-lh)] text-[color:var(--text-tertiary)] tabular-nums">
              {t.rank(rank.position, rank.total)}
            </span>
          )}
        </div>
        <h4
          id="po-question-title"
          className="text-[length:var(--type-display-sm)] leading-[var(--type-display-sm-lh)] font-medium tracking-[var(--type-display-tracking)] text-balance break-words"
        >
          {title}
        </h4>
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
