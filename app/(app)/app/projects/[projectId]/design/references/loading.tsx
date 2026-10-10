import { ProjectSectionLoading } from "@/components/projects/project-section-loading";
import { Skeleton } from "@/components/ui/skeleton";
import { fr } from "@/lib/i18n/fr";

// The references of the Conception: a header, then grids of cards.
export default function DesignReferencesLoading() {
  return (
    <ProjectSectionLoading label={fr.conceptionRefs.title}>
      <div className="flex flex-col gap-8 pt-6">
        <Skeleton className="h-9 w-full max-w-xl" />
        <Skeleton className="h-9 w-48" />
        <div className="grid grid-cols-[repeat(auto-fill,minmax(13rem,1fr))] gap-3">
          <Skeleton className="aspect-[4/3] rounded-xl" />
          <Skeleton className="aspect-[4/3] rounded-xl" />
          <Skeleton className="aspect-[4/3] rounded-xl" />
        </div>
      </div>
    </ProjectSectionLoading>
  );
}
