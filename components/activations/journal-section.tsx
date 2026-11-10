import { EmptyNote } from "@/components/shell/empty-state";
import { Fold } from "@/components/ui/fold";
import type { JournalEntry } from "@/lib/activations/types";
import { activations } from "@/lib/i18n/fr/activations";
import { formatDateTime } from "@/lib/release/format";

const fr = { activations };

const t = fr.activations.journal;

/** The critical changes in order, never erased (ticket : « Le journal d'audit
 * est append-only pour les événements critiques »). Folded by default. */
export function JournalSection({ entries }: { entries: JournalEntry[] }) {
  return (
    <section id="journal" className="scroll-mt-6">
      <Fold summary={t.title}>
        <p className="-mt-1 text-body-sm text-[color:var(--text-secondary)]">
          {t.description}
        </p>
        {entries.length === 0 ? (
          <EmptyNote>{t.none}</EmptyNote>
        ) : (
          <ol className="flex flex-col gap-2 text-body-sm">
            {entries.map((e) => (
              <li
                key={e.id}
                className="flex flex-col gap-0.5 border-l-2 border-[color:var(--border-hairline)] pl-3"
              >
                <span>
                  <span className="font-semibold">
                    {t.kinds[e.kind] ?? e.kind}
                  </span>
                  <span className="text-[color:var(--text-secondary)]">
                    {" · "}
                    {formatDateTime(e.at)} · {t.by(e.actorName ?? t.system)}
                  </span>
                </span>
                {e.note && (
                  <span className="break-words text-[color:var(--text-secondary)]">
                    {e.note}
                  </span>
                )}
              </li>
            ))}
          </ol>
        )}
      </Fold>
    </section>
  );
}
