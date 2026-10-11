import { SourceLine } from "@/components/framing/source-line";
import type { Provenance } from "@/lib/framing/brief";
import { fr } from "@/lib/i18n/fr";

/**
 * Under a list question: where each proposed line comes from, with the way
 * to its passage (PROJ-BUG-02). Kept apart from the lines, which are buttons
 * that open their editor: a link cannot sit inside them.
 */
export function LineSources({
  projectId,
  items,
}: {
  projectId: string;
  items: Array<{ id: string; label: string; provenance: Provenance | null }>;
}) {
  if (items.length === 0) return null;
  return (
    <section className="flex flex-col gap-2 border-t border-[color:var(--border-hairline)] pt-4">
      <h4 className="text-caption font-semibold text-muted-foreground">
        {fr.framingIntel.guide.lineSources}
      </h4>
      <ul className="flex flex-col gap-3">
        {items.map((item) => (
          <li key={item.id} className="flex min-w-0 flex-col gap-0.5">
            <span className="text-body-md break-words">
              {item.label}
              {item.provenance?.quote && (
                <span className="text-muted-foreground">
                  {" "}
                  · « {item.provenance.quote} »
                </span>
              )}
            </span>
            <SourceLine
              projectId={projectId}
              provenance={item.provenance}
              state="proposed"
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
