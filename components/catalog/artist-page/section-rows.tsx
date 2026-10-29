import type { ReactNode } from "react";

/** Rows of a section card (proto `.rows`): nothing framed inside a card, a
 * hairline between rows. */
export function SectionRows({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <ul
      aria-label={label}
      className="flex flex-col [&>li+li]:border-t [&>li+li]:border-[color:var(--border-hairline)] [&>li+li]:pt-3 [&>li:not(:last-child)]:pb-3"
    >
      {children}
    </ul>
  );
}

/** One row: what it is (its name in semibold), what it says more in
 * secondary text, a badge on the right. */
export function SectionRow({
  title,
  detail,
  badge,
}: {
  title: ReactNode;
  detail?: string | null;
  badge?: ReactNode;
}) {
  return (
    <li className="flex items-center gap-3">
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[length:var(--type-body-md)] leading-[var(--type-body-md-lh)] break-words">
          {title}
        </span>
        {detail && (
          <span className="text-[length:var(--type-body-sm)] leading-[var(--type-body-sm-lh)] break-words text-[color:var(--text-secondary)]">
            {detail}
          </span>
        )}
      </span>
      {badge && <span className="shrink-0">{badge}</span>}
    </li>
  );
}
