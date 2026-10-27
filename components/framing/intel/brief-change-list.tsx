import type { BriefChange } from "@/lib/framing/brief-snapshot";
import { framingIntel } from "@/lib/i18n/fr/framing-intel";

const fr = { framingIntel };

/** What changed between two versions of the Brief, item by item: before
 * struck through, then after. */
export function BriefChangeList({ changes }: { changes: BriefChange[] }) {
  const t = fr.framingIntel;
  if (changes.length === 0)
    return (
      <p className="text-body-md text-muted-foreground">{t.brief.noChange}</p>
    );
  return (
    <ul className="flex flex-col gap-2">
      {changes.map((change) => (
        <li
          key={`${change.dimension}-${change.label}`}
          className="grid gap-1 text-body-md"
        >
          <span className="font-semibold">
            {t.dimensions[change.dimension]} · {change.label}
          </span>
          <span className="text-muted-foreground line-through decoration-1">
            {change.before}
          </span>
          <span>{change.after}</span>
        </li>
      ))}
    </ul>
  );
}
