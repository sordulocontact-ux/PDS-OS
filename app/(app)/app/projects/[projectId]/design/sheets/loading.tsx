import { ProjectSectionLoading } from "@/components/projects/project-section-loading";
import { SkeletonRows } from "@/components/ui/skeleton";
import { fr } from "@/lib/i18n/fr";

// The Fiches Livrables: one line per deliverable.
export default function DesignSheetsLoading() {
  return (
    <ProjectSectionLoading label={fr.conceptionSheet.listTitle}>
      <div className="pt-6">
        <SkeletonRows count={4} />
      </div>
    </ProjectSectionLoading>
  );
}
