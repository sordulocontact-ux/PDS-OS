"use client";

import { IconSparkle3 } from "nucleo-sharp-essential";

import { Button } from "@/components/ui/button";
import { TitleBlock } from "@/components/ui/title-block";
import { poQuestion } from "@/lib/i18n/fr/po-question";

const fr = { poQuestion };

const t = fr.poQuestion.reading;

export type PoReadingItem = {
  key: string;
  // What PO read, in bold (« Sami Kader · co-auteur »).
  label: string;
  // The exact words it comes from, found by the code.
  quote: string | null;
};

/**
 * « ✦ Ce que PO a compris » (proto « Projet complet »): each element PO
 * read in a free answer, in bold with the words it comes from, and
 * « Retirer »; nothing is kept before the caller's « Enregistrer ». What
 * the code could not find verbatim is said dropped. `empty`: what to say
 * when nothing was read.
 */
export function PoReading({
  items,
  dropped = 0,
  empty,
  onRemove,
}: {
  items: PoReadingItem[];
  dropped?: number;
  empty?: React.ReactNode;
  onRemove: (index: number) => void;
}) {
  return (
    <div className="flex flex-col gap-3" aria-live="polite">
      <TitleBlock>
        <h4 className="flex items-center gap-1.5 text-[length:var(--type-body-sm)] font-semibold">
          <IconSparkle3 aria-hidden className="size-4" />
          {t.title}
        </h4>
        <p className="text-[length:var(--type-body-sm)] text-[color:var(--text-secondary)]">
          {t.hint}
        </p>
      </TitleBlock>
      {items.length === 0 ? (
        empty
      ) : (
        <ul className="flex flex-col divide-y divide-[color:var(--border-hairline)] rounded-xl border border-[color:var(--border-hairline)]">
          {items.map((item, index) => (
            <li
              key={item.key}
              className="flex items-start justify-between gap-3 px-3.5 py-2.5"
            >
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="text-[length:var(--type-body-sm)] font-semibold break-words">
                  {item.label}
                </span>
                {item.quote && (
                  <span className="text-[length:var(--type-micro)] leading-[var(--type-micro-lh)] break-words text-[color:var(--text-secondary)]">
                    « {item.quote} »
                  </span>
                )}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label={t.removeLabel(item.label)}
                onClick={() => onRemove(index)}
              >
                {t.remove}
              </Button>
            </li>
          ))}
        </ul>
      )}
      {dropped > 0 && (
        <p className="text-[length:var(--type-body-sm)] text-[color:var(--text-secondary)]">
          {t.dropped(dropped)}
        </p>
      )}
    </div>
  );
}
