import { ProjectSectionLoading } from "@/components/projects/project-section-loading";
import { Skeleton } from "@/components/ui/skeleton";
import { fr } from "@/lib/i18n/fr";

// A validation request: its header, then the frozen version and its decisions.
export default function DesignDecisionLoading() {
  return (
    <ProjectSectionLoading label={fr.conceptionRequests.statuses.pending}>
      <div className="flex flex-col gap-8 pt-6">
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-48 rounded-2xl" />
        <Skeleton className="h-48 rounded-2xl" />
      </div>
    </ProjectSectionLoading>
  );
}
