import { SplitCard } from "@/components/legal/splits/split-card";
import { EmptyNote } from "@/components/shell/empty-state";
import { fr } from "@/lib/i18n/fr";
import type { TitleSplit } from "@/lib/legal/splits/queries";

/** Répartitions of a project (ticket Juridique 04): one sheet per title. */
export function SplitsView({
  projectId,
  splits,
}: {
  projectId: string;
  splits: TitleSplit[];
}) {
  const t = fr.legalSplits.page;
  return (
    <div className="grid gap-8">
      {splits.length === 0 ? (
        <EmptyNote>{t.empty}</EmptyNote>
      ) : (
        splits.map((split) => (
          <SplitCard key={split.masterId} projectId={projectId} split={split} />
        ))
      )}
    </div>
  );
}
