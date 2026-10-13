import { fr } from "@/lib/i18n/fr";
import { splitChanges } from "@/lib/legal/splits/compare";
import type { SplitVersionView } from "@/lib/legal/splits/queries";

/** A version against the one it follows (JUR-29): what changed, line by line. */
export function SplitVersionChanges({
  previous,
  version,
}: {
  previous: SplitVersionView;
  version: SplitVersionView;
}) {
  const t = fr.legalSplits.changes;
  const changes = splitChanges(previous.lines, version.lines);
  return (
    <div className="flex flex-col gap-1 text-sm text-muted-foreground">
      <span className="font-medium text-foreground">
        {t.title(previous.version)}
      </span>
      {changes.length === 0 ? (
        <span>{t.none}</span>
      ) : (
        <ul className="flex list-disc flex-col gap-0.5 pl-5">
          {changes.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
