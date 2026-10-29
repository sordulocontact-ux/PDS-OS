import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ViewLink } from "@/components/ui/view-link";
import { cn } from "@/lib/utils";

// DataTable: every table of the app, as a card like the home's lists and the
// Projets wireframe (Figma 90:4972): outlined, on the card surface, the header
// on a soft band, a hairline between rows, 16 px inside the frame. Fixed
// columns of 192 px (20 px gap) and a last column taking the rest. Built on
// the shadcn Table primitives. Inside a section card nothing is framed
// (docs/DESIGN.md, « Rien d'encadré dans une carte »): the table loses its
// frame, its band and its rules there, and only a hairline stays under the
// header.

type Hide = "sm" | "md" | "lg" | "xl" | "2xl";

// Literal classes: Tailwind only generates what it reads in full.
const hideBelow: Record<Hide, string> = {
  sm: "hidden sm:table-cell",
  md: "hidden md:table-cell",
  lg: "hidden lg:table-cell",
  xl: "hidden xl:table-cell",
  "2xl": "hidden 2xl:table-cell",
};

type ColumnProps = {
  // Hidden under this breakpoint (secondary columns on small screens).
  hideBelow?: Hide;
  // Takes the remaining width; other columns are 192 px.
  fill?: boolean;
  align?: "start" | "end";
};

const column = ({ hideBelow: hide, fill, align }: ColumnProps) =>
  cn(
    !fill && "w-48",
    hide && hideBelow[hide],
    align === "end" && "pr-0 text-right",
  );

// Tabs above a table (or its empty state): see data-table-views.tsx.
export { DataTableViews } from "@/components/ui/data-table-views";

// Shown in a cell that has no value.
export const EMPTY_CELL = "—";

export function DataTable({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-[color:var(--border-default)] bg-card in-[.section-card]:rounded-none in-[.section-card]:border-0 in-[.section-card]:bg-transparent">
      <Table>{children}</Table>
    </div>
  );
}

// 16 px from the frame on both ends of every row (header, body, groups).
export const ROW_INSET =
  "[&>*:first-child]:pl-4 [&>*:last-child]:pr-4 in-[.section-card]:[&>*:first-child]:pl-0 in-[.section-card]:[&>*:last-child]:pr-0";

export function DataTableHeader({ children }: { children: React.ReactNode }) {
  return (
    <TableHeader>
      <TableRow
        className={cn(
          "border-[color:var(--border-default)] bg-[var(--surface-soft)] hover:bg-[var(--surface-soft)] in-[.section-card]:border-[color:var(--border-hairline)] in-[.section-card]:bg-transparent in-[.section-card]:hover:bg-transparent",
          ROW_INSET,
        )}
      >
        {children}
      </TableRow>
    </TableHeader>
  );
}

export function DataTableHead({
  children,
  className,
  ...columnProps
}: ColumnProps & { children: React.ReactNode; className?: string }) {
  return (
    <TableHead
      className={cn(
        "h-11 px-0 pr-5 text-[length:var(--type-body-md)] font-medium text-[color:var(--text-secondary)]",
        column(columnProps),
        className,
      )}
    >
      {children}
    </TableHead>
  );
}

// A hairline between rows, none under the last (the frame closes it).
export function DataTableBody({ children }: { children: React.ReactNode }) {
  return (
    <TableBody className="[&>tr+tr]:border-t [&>tr+tr]:border-[color:var(--border-hairline)] in-[.section-card]:[&>tr+tr]:border-transparent">
      {children}
    </TableBody>
  );
}

// `relative`: a DataTableLink inside covers the whole row. Safari (26.3 still)
// ignores `relative` on a <tr>: every link then covers the whole table and the
// last row catches every click. A transform makes the row the containing block.
// Only a row with a DataTableLink lights up under the pointer: it opens.
export function DataTableRow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <TableRow
      className={cn(
        "relative [transform:translate(0)] border-0 hover:bg-transparent has-[[data-row-link]]:hover:bg-[var(--control-bg-hover)]",
        ROW_INSET,
        className,
      )}
    >
      {children}
    </TableRow>
  );
}

export function DataTableCell({
  children,
  className,
  ...columnProps
}: ColumnProps & { children: React.ReactNode; className?: string }) {
  return (
    <TableCell
      className={cn(
        "px-0 py-3 pr-5 text-[length:var(--type-body-md)] font-medium",
        column(columnProps),
        className,
      )}
    >
      {children}
    </TableCell>
  );
}

// The row's main link: its pseudo-element covers the whole row. Other
// interactive elements of the row need `relative z-10` to stay clickable.
// Prepared on intent only (ViewLink): a list prefetching every row it shows
// rendered each record's page at once (page loads audit, 27/10).
// Without `href` (an archived row has no page) the text stays plain.
export function DataTableLink({
  href,
  newTab = false,
  children,
}: {
  href: string | null;
  // A file opened in the browser, outside the app: a plain link, new tab.
  newTab?: boolean;
  children: React.ReactNode;
}) {
  if (href === null) return <span className="truncate">{children}</span>;
  const link = { "data-row-link": "" };
  const className =
    "truncate outline-none after:absolute after:inset-0 hover:underline focus-visible:underline";
  if (newTab)
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        {...link}
      >
        {children}
      </a>
    );
  return (
    <ViewLink href={href} className={className} {...link}>
      {children}
    </ViewLink>
  );
}

// First cell: a visual (icon disc, avatar), a title and an optional subtitle.
export function DataTableMedia({
  visual,
  title,
  subtitle,
}: {
  visual?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      {visual}
      <div className="flex min-w-0 flex-col">
        {title}
        {subtitle && (
          <span className="truncate text-[length:var(--type-caption)] leading-[var(--type-caption-lh)] text-[color:var(--text-tertiary)]">
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
}

// Round sunken disc holding an icon, the visual of rows without a picture.
export function DataTableIcon({
  icon: Icon,
}: {
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <span
      aria-hidden
      className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--surface-sunken)] text-[color:var(--text-secondary)]"
    >
      <Icon className="size-5" />
    </span>
  );
}

// Last column: the row's "⋯" menu (RowActions), as narrow as its button.
export function DataTableActionsHead({ label }: { label: string }) {
  return (
    <TableHead className="h-11 w-12 px-0">
      <span className="sr-only">{label}</span>
    </TableHead>
  );
}

export function DataTableActionsCell({
  children,
}: {
  children: React.ReactNode;
}) {
  return <TableCell className="w-12 px-0 py-3 text-right">{children}</TableCell>;
}
