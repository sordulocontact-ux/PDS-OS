import { ProjectSectionLoading } from "@/components/projects/project-section-loading";
import { Skeleton } from "@/components/ui/skeleton";
import { fr } from "@/lib/i18n/fr";

// The direct work of the Conception: the targets on the left, the
// conversation with PO on the right.
export default function DesignWorkLoading() {
  return (
    <ProjectSectionLoading label={fr.conceptionWork.title}>
      <div className="grid gap-8 pt-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <div className="flex gap-2 lg:flex-col">
          <Skeleton className="h-16 w-56 rounded-2xl lg:w-auto" />
          <Skeleton className="h-16 w-56 rounded-2xl lg:w-auto" />
          <Skeleton className="hidden h-16 rounded-2xl lg:block" />
        </div>
        <div className="flex flex-col gap-5">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-48 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
      </div>
    </ProjectSectionLoading>
  );
}
