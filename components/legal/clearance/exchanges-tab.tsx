import { fr } from "@/lib/i18n/fr";
import type { Clearance } from "@/lib/legal/clearance/types";
import { formatInstant } from "@/lib/utils/instant";

/** The exchanges of a borrowing (sent, received, notes), newest first, in
 * the panel's « Journal » — each written by its moment: the request sent,
 * their answer pasted. */
export function ExchangesTab({ clearance }: { clearance: Clearance }) {
  const t = fr.legalClearance;
  if (clearance.exchanges.length === 0)
    return <p className="text-sm text-muted-foreground">{t.exchanges.empty}</p>;
  return (
    <ul className="flex flex-col divide-y">
      {clearance.exchanges.map((e) => (
        <li key={e.id} className="flex flex-col gap-1 py-3">
          <span className="text-sm text-muted-foreground">
            {t.kinds[e.kind as keyof typeof t.kinds]} ·{" "}
            {t.directions[e.direction as keyof typeof t.directions]} ·{" "}
            {formatInstant(e.at)}
            {e.by && ` · ${e.by}`}
          </span>
          <span className="break-words whitespace-pre-wrap">{e.body}</span>
        </li>
      ))}
    </ul>
  );
}
