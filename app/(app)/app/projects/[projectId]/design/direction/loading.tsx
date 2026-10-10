import { ProjectSectionLoading } from "@/components/projects/project-section-loading";
import { Skeleton } from "@/components/ui/skeleton";
import { fr } from "@/lib/i18n/fr";

// The artistic direction: people, synthesis by section, versions.
export default function DesignDirectionLoading() {
  return (
    <ProjectSectionLoading label={fr.conceptionDirection.title}>
      <div className="flex flex-col gap-8 pt-6">
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-48 rounded-2xl" />
        <Skeleton className="h-48 rounded-2xl" />
      </div>
    </ProjectSectionLoading>
  );
}
