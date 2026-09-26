import { cn } from "@/lib/utils";

// Horizontal gutters and max width of application pages.
export function PageContainer({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "mx-auto flex w-full max-w-[var(--page-max)] flex-col gap-[var(--section-gap)] px-4 py-6 md:px-[var(--page-gutter)] md:py-8",
        className,
      )}
    >
      {children}
    </div>
  );
}
