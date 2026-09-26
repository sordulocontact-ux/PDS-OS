// A titled block of a detail page: an h2 the section is labelled by, then
// its content. `id` must be unique on the page.
export function PageSection({
  id,
  title,
  action,
  children,
}: {
  id: string;
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  const titleId = `${id}-title`;
  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id={titleId} className="text-base font-medium">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}
