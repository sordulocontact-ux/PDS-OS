import Link from "next/link";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

// DataTable: the list design of the Masters page, shared by every list page.
// A single hairline under the header, airy rows without rules, fixed columns
// of 192 px (20 px gap) and a last column taking the rest. Built on the
// shadcn Table primitives.

type Hide = "sm" | "md" | "lg";

// Literal classes: Tailwind only generates what it reads in full.
const hideBelow: Record<Hide, string> = {
  sm: "hidden sm:table-cell",
  md: "hidden md:table-cell",
  lg: "hidden lg:table-cell",
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
  return <Table>{children}</Table>;
}

export function DataTableHeader({ children }: { children: React.ReactNode }) {
  return (
    <TableHeader>
      <TableRow className="border-[color:var(--border-hairline)] hover:bg-transparent">
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
        "h-auto px-0 pr-5 pb-2 text-[length:var(--type-body-md)] font-medium text-[color:var(--text-secondary)]",
        column(columnProps),
        className,
      )}
    >
      {children}
    </TableHead>
  );
}

// 18 px between the header rule and the first row, 16 px between rows.
export function DataTableBody({ children }: { children: React.ReactNode }) {
  return (
    <TableBody className="[&>tr:first-child>td]:pt-[18px]">
      {children}
    </TableBody>
  );
}

// `relative`: a DataTableLink inside covers the whole row.
export function DataTableRow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <TableRow className={cn("relative border-0 hover:bg-transparent", className)}>
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
        "px-0 py-2 pr-5 text-[length:var(--type-body-md)] font-medium",
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
// Without `href` (an archived row has no page) the text stays plain.
export function DataTableLink({
  href,
  children,
}: {
  href: string | null;
  children: React.ReactNode;
}) {
  if (href === null) return <span className="truncate">{children}</span>;
  return (
    <Link
      href={href}
      className="truncate outline-none after:absolute after:inset-0 hover:underline focus-visible:underline"
    >
      {children}
    </Link>
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
    <TableHead className="h-auto w-8 px-0 pb-2">
      <span className="sr-only">{label}</span>
    </TableHead>
  );
}

export function DataTableActionsCell({
  children,
}: {
  children: React.ReactNode;
}) {
  return <TableCell className="w-8 px-0 py-2 text-right">{children}</TableCell>;
}
