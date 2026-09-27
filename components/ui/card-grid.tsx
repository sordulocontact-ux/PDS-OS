import { LoadingRegion, Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// Grid of ListCards (home page, Travail page): one column on mobile, two
// then three as the screen widens.
export function CardGrid({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn("grid gap-5 md:grid-cols-2 xl:grid-cols-3", className)}
    >
      {children}
    </div>
  );
}

// The same grid while its cards load, announced once by `label`.
export function CardGridSkeleton({
  label,
  count = 6,
}: {
  label: string;
  count?: number;
}) {
  return (
    <LoadingRegion label={label}>
      <CardGrid>
        {Array.from({ length: count }, (_, i) => (
          <Skeleton key={i} className="h-48 rounded-2xl" />
        ))}
      </CardGrid>
    </LoadingRegion>
  );
}
