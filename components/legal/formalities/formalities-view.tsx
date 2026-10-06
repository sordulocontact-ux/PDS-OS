import { FormalityCard } from "@/components/legal/formalities/formality-card";
import { ProjectPageHeader } from "@/components/projects/project-page-header";
import { EmptyNote } from "@/components/shell/empty-state";
import { fr } from "@/lib/i18n/fr";
import type { TitleFormality } from "@/lib/legal/formalities/types";

/** SACEM of a project (ticket Juridique 06): one formality per title. */
export function FormalitiesView({
  projectId,
  titles,
}: {
  projectId: string;
  titles: TitleFormality[];
}) {
  const t = fr.legalFormalities.page;
  return (
    <div className="grid gap-8">
      <ProjectPageHeader title={t.title} description={t.description} />
      {titles.length === 0 ? (
        <EmptyNote>{t.empty}</EmptyNote>
      ) : (
        titles.map((title) => (
          <FormalityCard
            key={title.masterId}
            projectId={projectId}
            title={title}
          />
        ))
      )}
    </div>
  );
}
