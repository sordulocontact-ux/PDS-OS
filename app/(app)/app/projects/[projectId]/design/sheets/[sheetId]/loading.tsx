import { ProjectSectionLoading } from "@/components/projects/project-section-loading";
import { Skeleton } from "@/components/ui/skeleton";
import { fr } from "@/lib/i18n/fr";

// One Fiche Livrable: its head, the sheet on the left, people, checks and
// validation on the right.
export default function DesignSheetLoading() {
  return (
    <ProjectSectionLoading label={fr.conception.sheetTitle}>
      <div className="flex flex-col gap-8 pt-6">
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-24 rounded-xl" />
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="flex flex-col gap-6">
            <Skeleton className="h-48 rounded-xl" />
            <Skeleton className="h-64 rounded-xl" />
          </div>
          <div className="flex flex-col gap-6">
            <Skeleton className="h-40 rounded-xl" />
            <Skeleton className="h-40 rounded-xl" />
          </div>
        </div>
      </div>
    </ProjectSectionLoading>
  );
}
