import { EmptyNote } from "@/components/shell/empty-state";
import { PageSection } from "@/components/shell/page-section";
import type { JournalEntry } from "@/lib/activations/types";
import { fr } from "@/lib/i18n/fr";
import { formatDateTime } from "@/lib/release/format";

const t = fr.activations.journal;

/** The critical changes in order, never erased (ticket : « Le journal d'audit
 * est append-only pour les événements critiques »). Folded by default. */
export function JournalSection({ entries }: { entries: JournalEntry[] }) {
  return (
    <PageSection
      id="journal"
      title={t.title}
      description={t.description}
      collapsible
      defaultOpen={false}
    >
      {entries.length === 0 ? (
        <EmptyNote>{t.none}</EmptyNote>
      ) : (
        <ol className="flex flex-col gap-2 text-sm">
          {entries.map((e) => (
            <li
              key={e.id}
              className="flex flex-col gap-0.5 border-l-2 border-[color:var(--border-hairline)] pl-3"
            >
              <span>
                <span className="font-medium">{t.kinds[e.kind] ?? e.kind}</span>
                <span className="text-muted-foreground">
                  {" · "}
                  {formatDateTime(e.at)} · {t.by(e.actorName ?? t.system)}
                </span>
              </span>
              {e.note && (
                <span className="break-words text-muted-foreground">
                  {e.note}
                </span>
              )}
            </li>
          ))}
        </ol>
      )}
    </PageSection>
  );
}
