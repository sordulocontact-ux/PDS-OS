import { LoadingRegion, SkeletonRows } from "@/components/ui/skeleton";
import { auth } from "@/lib/i18n/fr/auth";

const fr = { auth };

// Placeholder of a project section while it renders: the page's title and
// the sidebars stay (layout), only the content below is replaced — rows
// unless the section gives its own shape.
export function ProjectSectionLoading({
  label = fr.auth.common.loading,
  children,
}: {
  label?: string;
  children?: React.ReactNode;
}) {
  return (
    <LoadingRegion label={label} className="grid gap-6">
      {children ?? <SkeletonRows count={4} />}
    </LoadingRegion>
  );
}
