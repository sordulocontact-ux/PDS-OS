import { sectionCardClass } from "@/components/ui/section-card";
import { cn } from "@/lib/utils";

// A titled block of a detail page: an h2 the section is labelled by, an
// optional one-line description, then its content. `id` must be unique on
// the page. `card`: on its own white card (the blocks of a title page).
export function PageSection({
  id,
  title,
  description,
  action,
  card = false,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  card?: boolean;
  children: React.ReactNode;
}) {
  const titleId = `${id}-title`;
  return (
    <section
      id={id}
      aria-labelledby={titleId}
      className={cn(
        "flex min-w-0 scroll-mt-6 flex-col gap-5",
        card && sectionCardClass,
      )}
    >
      <div className="flex min-h-8 flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 id={titleId} className="text-base font-medium">
            {title}
          </h2>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
