import { cn } from "@/lib/utils";

/**
 * The top band of a section's page (docs/STYLE-FINANCE-PARTOUT.md § 5.1,
 * born in Finance, lot 5 of docs/FINANCE-V2.md, after Midday): the whole
 * width of the page, 56 px, a hairline under it, kept at the top while the
 * page scrolls; the section's ⌘K search across the line (`children`), and
 * at its end what the section watches (`end`: a bell). Drawn in the new
 * style only: the classic one had no band outside Finance (`always`).
 */
export function SectionTopbar({
  always = false,
  end,
  children,
}: {
  // Finance had its band before the new style: kept in both.
  always?: boolean;
  end?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-[color:var(--border-hairline)] bg-[var(--background)] px-4 md:px-[var(--page-gutter)]",
        !always && "classic:hidden",
      )}
    >
      <div className="flex min-w-0 flex-1 items-center">{children}</div>
      {end}
    </div>
  );
}
