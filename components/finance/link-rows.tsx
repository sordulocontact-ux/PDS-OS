import { ViewLink } from "@/components/ui/view-link";

export type LinkRow = {
  key: string;
  href: string | null;
  main: string;
  sub: string;
  end?: React.ReactNode;
};

/**
 * Rows split by hairlines, each opening the page where it is acted on
 * (« À surveiller » of the overview, the Alertes page): what, in one line,
 * its detail below, a badge or an amount at the end.
 */
export function LinkRows({ rows }: { rows: LinkRow[] }) {
  const className =
    "flex items-center justify-between gap-3 rounded-lg px-2 py-2.5";
  return (
    <ul className="-mx-2 -my-1 divide-y divide-[var(--border-hairline)]">
      {rows.map((row) => {
        const body = (
          <>
            <span className="grid min-w-0 gap-0.5">
              <span className="text-body-md font-medium break-words">
                {row.main}
              </span>
              <span className="text-caption text-[color:var(--text-secondary)]">
                {row.sub}
              </span>
            </span>
            {row.end && <span className="shrink-0">{row.end}</span>}
          </>
        );
        return (
          <li key={row.key}>
            {row.href ? (
              <ViewLink
                href={row.href}
                className={`${className} hover:bg-[var(--control-bg-hover)]`}
              >
                {body}
              </ViewLink>
            ) : (
              <div className={className}>{body}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
