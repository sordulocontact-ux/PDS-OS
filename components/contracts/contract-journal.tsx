import { EmptyNote } from "@/components/shell/empty-state";
import { PageSection } from "@/components/shell/page-section";
import { Fold } from "@/components/ui/fold";
import type { ContractEvent } from "@/lib/contracts/journal";
import { contracts } from "@/lib/i18n/fr/contracts";
import { formatShortInstant } from "@/lib/utils/day";

const fr = { contracts };

// A short journal reads open; a long one stays folded (proto « Contrats »).
const OPEN_BELOW = 4;

/** « Déjà fait » of a contract: its versions and journal, newest first,
 * folded under « Versions et journal (n) ». */
export function ContractJournal({ events }: { events: ContractEvent[] }) {
  const t = fr.contracts.journal;
  return (
    <PageSection card id="contract-journal" title={t.title}>
      {events.length === 0 ? (
        <EmptyNote>{t.empty}</EmptyNote>
      ) : (
        <Fold
          summary={t.summary(events.length)}
          defaultOpen={events.length < OPEN_BELOW}
        >
          <ul className="flex flex-col divide-y">
            {events.map((e) => (
              <li key={e.id} className="flex flex-col gap-0.5 py-2.5">
                <span className="font-medium">
                  {e.label}
                  {e.note && (
                    <span className="font-normal text-[color:var(--text-secondary)]">
                      {" "}
                      — {e.note}
                    </span>
                  )}
                </span>
                <span className="text-[length:var(--type-caption)] leading-[var(--type-caption-lh)] text-[color:var(--text-secondary)]">
                  {[e.by, formatShortInstant(e.at)].filter(Boolean).join(" · ")}
                </span>
              </li>
            ))}
          </ul>
        </Fold>
      )}
    </PageSection>
  );
}
