import { CollapsibleSection } from "./collapsible-section";
import { sectionClass, sectionHeaderClass } from "./page-section-classes";

// A titled block of a detail page: an h2 the section is labelled by, an
// optional one-line description, then its content. `id` must be unique on
// the page. `card`: on its own white card (the blocks of a title page).
// `collapsible`: a chevron on the right folds it (open unless `defaultOpen`
// is false).
export function PageSection({
  id,
  title,
  eyebrow,
  description,
  action,
  card = false,
  collapsible = false,
  defaultOpen = true,
  children,
}: {
  id: string;
  title: string;
  // Small caption above the title (« Question 1 sur 2 »).
  eyebrow?: string;
  description?: string;
  action?: React.ReactNode;
  card?: boolean;
  collapsible?: boolean;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const titleId = `${id}-title`;
  const heading = (
    <div className="flex min-w-0 flex-col gap-0.5">
      {eyebrow && (
        <span className="text-sm text-muted-foreground tabular-nums">
          {eyebrow}
        </span>
      )}
      <h2 id={titleId} className="text-base font-medium">
        {title}
      </h2>
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
    </div>
  );
  if (collapsible)
    return (
      <CollapsibleSection
        id={id}
        title={title}
        heading={heading}
        action={action}
        card={card}
        defaultOpen={defaultOpen}
      >
        {children}
      </CollapsibleSection>
    );
  return (
    <section id={id} aria-labelledby={titleId} className={sectionClass(card)}>
      <div className={sectionHeaderClass}>
        {heading}
        {action}
      </div>
      {children}
    </section>
  );
}
