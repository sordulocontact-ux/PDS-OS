// Title block of an application page: title, optional description, and an
// optional primary action aligned right (below on narrow screens), and an
// optional leading visual before the title (an artist picture).
export function PageHeader({
  title,
  description,
  action,
  leading,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  leading?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 items-center gap-4">
        {leading}
        <div className="flex min-w-0 flex-col gap-2">
          <h1 className="font-heading text-display-lg">{title}</h1>
          {description && (
            <p className="text-body-lg text-[color:var(--text-secondary)]">
              {description}
            </p>
          )}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
