import { ProjectSectionLoading } from "@/components/projects/project-section-loading";
import { Skeleton } from "@/components/ui/skeleton";
import { fr } from "@/lib/i18n/fr";

// The Postproduction: references, steps, then the versions.
export default function ProductionPostLoading() {
  return (
    <ProjectSectionLoading label={fr.productionPost.title}>
      <div className="flex flex-col gap-10">
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
        <div className="flex flex-col gap-4">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-56 rounded-xl" />
        </div>
      </div>
    </ProjectSectionLoading>
  );
}
