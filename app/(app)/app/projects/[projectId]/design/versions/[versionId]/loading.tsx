import { ProjectSectionLoading } from "@/components/projects/project-section-loading";
import { Skeleton } from "@/components/ui/skeleton";
import { fr } from "@/lib/i18n/fr";

// A proposal opens the direct work of its deliverable (redirect): the same
// placeholder as the work page.
export default function DesignVersionLoading() {
  return (
    <ProjectSectionLoading label={fr.conceptionWork.title}>
      <div className="flex flex-col gap-5 pt-6">
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-9 w-44 rounded-pill" />
          <Skeleton className="h-9 w-28 rounded-pill" />
        </div>
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-48 rounded-2xl" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-16 rounded-2xl" />
          <Skeleton className="h-16 rounded-2xl" />
          <Skeleton className="h-16 rounded-2xl" />
          <Skeleton className="h-16 rounded-2xl" />
        </div>
      </div>
    </ProjectSectionLoading>
  );
}
