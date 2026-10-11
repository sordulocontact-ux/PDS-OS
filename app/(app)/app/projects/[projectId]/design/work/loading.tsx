import { ProjectSectionLoading } from "@/components/projects/project-section-loading";
import { Skeleton } from "@/components/ui/skeleton";
import { fr } from "@/lib/i18n/fr";

// The direct work of the Conception: the targets in a row of pills, then the
// open target's title, what is known and its four numbered questions.
export default function DesignWorkLoading() {
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
