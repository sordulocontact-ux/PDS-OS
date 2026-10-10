import { ProjectSectionLoading } from "@/components/projects/project-section-loading";
import { Skeleton } from "@/components/ui/skeleton";
import { fr } from "@/lib/i18n/fr";

// The Brief créatif: title, versions, then its sections.
export default function DesignBriefLoading() {
  return (
    <ProjectSectionLoading label={fr.conceptionDirection.brief.title}>
      <div className="flex flex-col gap-8 pt-6">
        <Skeleton className="h-9 w-72" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-14 rounded-full" />
          <Skeleton className="h-8 w-14 rounded-full" />
        </div>
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
      </div>
    </ProjectSectionLoading>
  );
}
