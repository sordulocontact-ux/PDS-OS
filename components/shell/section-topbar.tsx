/**
 * The top band of a section's page (docs/STYLE-FINANCE-PARTOUT.md § 5.1,
 * born in Finance, lot 5 of docs/FINANCE-V2.md, after Midday): the whole
 * width of the page, 56 px, a hairline under it, kept at the top while the
 * page scrolls; where one is (`children`: TopbarCrumb, Sacha 24/11/2026,
 * the search having gone to the main sidebar), and at its end what the
 * section watches (`end`: a bell). In both styles (the new one validated by
 * Ibé, 24/11/2026).
 */
export function SectionTopbar({
  end,
  children,
}: {
  end?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-[color:var(--border-hairline)] bg-[var(--background)] px-4 md:px-[var(--page-gutter)]">
      <div className="flex min-w-0 flex-1 items-center">{children}</div>
      {end}
    </div>
  );
}
