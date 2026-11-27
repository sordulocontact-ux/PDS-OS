/**
 * One setting in a group of Paramètres (inside `Rows`): what it is on the
 * left, with a line saying more when it needs one, the control on the
 * right; one under the other on a phone. As Accordee's settings.
 */
export function SettingsRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 px-5 py-4">
      <div className="grid min-w-0 gap-0.5">
        <span className="text-body-md font-medium text-[color:var(--text-primary)]">
          {label}
        </span>
        {description && (
          <span className="text-body-sm text-[color:var(--text-secondary)]">
            {description}
          </span>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </li>
  );
}
