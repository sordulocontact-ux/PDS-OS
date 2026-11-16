import { IconCheck } from "nucleo-sharp-essential";

/** Why the code proposes a match, as small ticked chips (« ✓ même montant »,
 * as the proto): a proof's sheet and a bank transaction's sheet. */
export function ReasonChips({ reasons }: { reasons: string[] }) {
  return (
    <ul className="flex flex-wrap gap-1.5">
      {reasons.map((reason) => (
        <li
          key={reason}
          className="flex items-center gap-1 rounded-pill bg-[var(--surface-soft)] px-2 py-0.5 text-caption text-[color:var(--text-secondary)]"
        >
          <IconCheck aria-hidden className="size-3.5" />
          {reason}
        </li>
      ))}
    </ul>
  );
}
