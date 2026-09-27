import {
  LoadingRegion,
  Skeleton,
  SkeletonRows,
} from "@/components/ui/skeleton";
import { fr } from "@/lib/i18n/fr";

// Placeholder of a project section while it renders: the project header and
// sidebars stay (layout), only the section below is replaced — the shape of
// ProjectPageHeader, then rows unless the section gives its own shape.
export function ProjectSectionLoading({
  label = fr.auth.common.loading,
  children,
}: {
  label?: string;
  children?: React.ReactNode;
}) {
  return (
    <LoadingRegion label={label} className="grid gap-6">
      <div className="grid gap-2">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      {children ?? <SkeletonRows count={4} />}
    </LoadingRegion>
  );
}
