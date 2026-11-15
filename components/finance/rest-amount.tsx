import { financeBudgets } from "@/lib/i18n/fr/finance-budgets";
import { cn } from "@/lib/utils";
import { formatAmount } from "@/lib/utils/money";

const t = financeBudgets;

/**
 * What is left of a budget: « Reste 3 400 € » (or the amount alone,
 * `bare`), « Dépassé de 30 778 € » in red once spent beyond it. Only the
 * figure is in Finance's figure font: the words stay text (Sacha 15/11/2026).
 */
export function RestAmount({
  cents,
  bare = false,
  className,
}: {
  cents: number;
  bare?: boolean;
  className?: string;
}) {
  const over = cents < 0;
  const word = over ? t.overWord : bare ? null : t.restWord;
  return (
    <span
      className={cn(
        "whitespace-nowrap",
        over && "text-[color:var(--error)]",
        className,
      )}
    >
      {word && `${word} `}
      <span className="tabular-nums">
        {formatAmount(Math.abs(cents), { ht: false })}
      </span>
    </span>
  );
}
