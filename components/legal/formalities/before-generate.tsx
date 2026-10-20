"use client";

import { Button } from "@/components/ui/button";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";

const t = fr.legalDocuments.bulletin;

export type BeforeItem = {
  key: string;
  label: string;
  column: "blocking" | "toConfirm" | "optional";
  reason: string;
  // « Confirmer »: the value proposed from its source becomes the person's.
  onConfirm?: () => void;
};

const COLUMNS = ["blocking", "toConfirm", "optional"] as const;
const ACCENT: Record<(typeof COLUMNS)[number], string> = {
  blocking: "text-[color:var(--tone-danger-fg)]",
  toConfirm: "text-[color:var(--tone-warning-fg)]",
  optional: "text-[color:var(--text-secondary)]",
};

/**
 * « Avant de générer » (proto « Projet complet », Déclaration SACEM): what
 * PDS OS still lacks (Bloquant), what it proposed from a source and the
 * person confirms (À confirmer), what may stay empty (Facultatif) — three
 * columns, side by side from `md`. Computed from the dossier as typed,
 * never stored.
 */
export function BeforeGenerate({ items }: { items: BeforeItem[] }) {
  return (
    <section className="flex flex-col gap-3" aria-label={t.before}>
      <h3 className="font-semibold">{t.before}</h3>
      <div className="grid gap-3 md:grid-cols-3">
        {COLUMNS.map((column) => {
          const mine = items.filter((i) => i.column === column);
          return (
            <div
              key={column}
              className="flex min-w-0 flex-col gap-2 rounded-xl border border-[color:var(--border-hairline)] p-3.5"
            >
              <span
                className={cn(
                  "text-[length:var(--type-body-sm)] font-semibold",
                  ACCENT[column],
                )}
              >
                {t[column]} {mine.length}
              </span>
              {mine.length === 0 ? (
                <p className="text-[length:var(--type-body-sm)] text-[color:var(--text-secondary)]">
                  {t.nothing}
                </p>
              ) : (
                <ul className="flex flex-col gap-2.5">
                  {mine.map((item) => (
                    <li key={item.key} className="flex flex-col gap-0.5">
                      <span className="font-medium break-words">
                        {item.label}
                      </span>
                      <span className="text-[length:var(--type-micro)] leading-[var(--type-micro-lh)] text-[color:var(--text-secondary)]">
                        {item.reason}
                      </span>
                      {item.onConfirm && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="mt-1 self-start"
                          onClick={item.onConfirm}
                        >
                          {t.confirm}
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
