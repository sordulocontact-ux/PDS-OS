import { EmptyNote } from "@/components/shell/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import type { ReferenceView } from "@/lib/design/references";
import { fr } from "@/lib/i18n/fr";
import { referenceStatusTone } from "@/lib/ui/state-tones";

/**
 * The references of the sheet's deliverable, read here: a proposal until a
 * validated section of the artistic direction carries it. Added and linked
 * on the References page, never copied into the sheet.
 */
export function SheetReferences({
  references,
}: {
  references: ReferenceView[];
}) {
  const t = fr.conceptionSheet.references;
  if (references.length === 0) return <EmptyNote>{t.empty}</EmptyNote>;
  return (
    <ul className="flex flex-col gap-2">
      {references.map((r) => (
        <li
          key={r.id}
          className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-border px-4 py-3"
        >
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            {r.href ? (
              <a
                href={r.href}
                target="_blank"
                rel="noopener noreferrer"
                className="truncate text-body-md font-medium underline-offset-2 hover:underline"
              >
                {r.name}
              </a>
            ) : (
              <span className="truncate text-body-md font-medium">
                {r.name}
              </span>
            )}
            {r.note && (
              <span className="text-caption break-words text-muted-foreground">
                {r.note}
              </span>
            )}
          </span>
          <span className="text-caption text-muted-foreground">
            {r.kind === "file" ? t.file : t.link}
          </span>
          <StatusBadge tone={referenceStatusTone[r.status]} size="sm">
            {fr.conceptionRefs.statuses[r.status]}
          </StatusBadge>
        </li>
      ))}
    </ul>
  );
}
