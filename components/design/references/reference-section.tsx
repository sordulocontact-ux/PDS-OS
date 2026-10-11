import { ReferenceCard } from "@/components/design/references/reference-card";
import type { TargetOption } from "@/components/design/references/target-picker";
import { PageSection } from "@/components/shell/page-section";
import { EmptyNote } from "@/components/shell/empty-state";
import type { ReferenceView } from "@/lib/design/references";
import { fr } from "@/lib/i18n/fr";

/**
 * The references of one target (the direction, a deliverable, or none yet)
 * in a compact grid: a whole moodboard, separate references, or both.
 */
export function ReferenceSection({
  id,
  title,
  description,
  projectId,
  references,
  currentKey,
  targets,
  canWrite,
}: {
  id: string;
  title: string;
  description?: string;
  projectId: string;
  references: ReferenceView[];
  // The target shown here; null for « À rattacher ».
  currentKey: string | null;
  targets: TargetOption[];
  canWrite: boolean;
}) {
  return (
    <PageSection id={id} title={title} description={description}>
      {references.length === 0 ? (
        <EmptyNote>{fr.conceptionRefs.emptyTarget}</EmptyNote>
      ) : (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(13rem,1fr))] gap-3">
          {references.map((reference) => (
            <li key={reference.id} className="flex min-w-0">
              <div className="min-w-0 flex-1">
                <ReferenceCard
                  projectId={projectId}
                  reference={reference}
                  currentKey={currentKey}
                  targets={targets}
                  canWrite={canWrite}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </PageSection>
  );
}
