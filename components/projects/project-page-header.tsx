// Header of a project section page (Calls, Travail, Budget…): the project
// title is already the page's h1 (project layout), so the section is an h2,
// with one sentence and an optional action on the right.
export function ProjectPageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div className="grid max-w-prose gap-1">
        <h2 className="text-lg font-semibold">{title}</h2>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action}
    </header>
  );
}
