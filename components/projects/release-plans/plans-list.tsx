"use client";

import Link from "next/link";

import { IconDisc } from "@/components/icons";
import { EmptyState } from "@/components/shell/empty-state";
import { buttonVariants } from "@/components/ui/button";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableGroupRow,
  DataTableHead,
  DataTableHeader,
  DataTableLink,
  DataTableRow,
} from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { routes } from "@/lib/auth/redirects";
import { titleReleasePlans } from "@/lib/i18n/fr/title-release-plans";
import { planStatusTone } from "@/lib/projects/title-plan/tones";
import type { TitlePlanRow } from "@/lib/projects/title-plan/queries";
import { formatShortDate } from "@/lib/release/format";
import { cn } from "@/lib/utils";

const fr = { titleReleasePlans };
const t = fr.titleReleasePlans;

const caption =
  "text-[length:var(--type-caption)] leading-[var(--type-caption-lh)] text-[color:var(--text-tertiary)]";

// A project's content is 1180 px at most: three columns beside the title.
const COLUMN = { date: "w-32", status: "w-44", version: "w-24" } as const;

/**
 * The Plans de sortie of a collective (lot 14): one per title, the live ones
 * then the abandoned ones (archived with them). Each row opens its plan:
 * its target date (the title's release), its status, its latest version,
 * and whether an action changed since. On a phone: the title and the
 * status, the rest under the title.
 */
export function TitlePlansList({
  projectId,
  rows,
}: {
  projectId: string;
  rows: TitlePlanRow[];
}) {
  if (rows.length === 0)
    return (
      <EmptyState
        icon={IconDisc}
        title={t.list.empty.title}
        body={t.list.empty.body}
        action={
          <Link
            href={routes.projectTitles(projectId)}
            className={buttonVariants({ variant: "outline" })}
          >
            {t.list.empty.action}
          </Link>
        }
      />
    );
  const live = rows.filter((r) => !r.abandoned);
  const abandoned = rows.filter((r) => r.abandoned);
  const columns = 4;
  return (
    <DataTable>
      <DataTableHeader>
        <DataTableHead fill>{t.list.columns.title}</DataTableHead>
        <DataTableHead hideBelow="lg" className={COLUMN.date}>
          {t.list.columns.date}
        </DataTableHead>
        <DataTableHead hideBelow="sm" className={COLUMN.status}>
          {t.list.columns.status}
        </DataTableHead>
        <DataTableHead hideBelow="lg" className={COLUMN.version}>
          {t.list.columns.version}
        </DataTableHead>
      </DataTableHeader>
      <DataTableBody>
        {abandoned.length > 0 && live.length > 0 && (
          <DataTableGroupRow columns={columns}>
            <GroupLabel>{t.list.groups.live}</GroupLabel>
          </DataTableGroupRow>
        )}
        {live.map((row) => (
          <PlanRow key={row.titleId} projectId={projectId} row={row} />
        ))}
        {abandoned.length > 0 && (
          <DataTableGroupRow columns={columns}>
            <GroupLabel>{t.list.groups.abandoned}</GroupLabel>
          </DataTableGroupRow>
        )}
        {abandoned.map((row) => (
          <PlanRow key={row.titleId} projectId={projectId} row={row} />
        ))}
      </DataTableBody>
    </DataTable>
  );
}

function GroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[length:var(--type-body-md)] font-semibold">
      {children}
    </span>
  );
}

function PlanRow({ projectId, row }: { projectId: string; row: TitlePlanRow }) {
  const date = row.date ? formatShortDate(row.date) : t.sections.release.noDate;
  const version = row.version ? t.list.version(row.version) : t.list.noVersion;
  const badge = (
    <StatusBadge tone={planStatusTone[row.status]} size="sm">
      {t.statuses[row.status]}
    </StatusBadge>
  );
  return (
    <DataTableRow>
      <DataTableCell fill className="whitespace-normal">
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <DataTableLink
              href={routes.projectReleasePlan(projectId, row.titleId)}
            >
              <span
                className={cn(
                  "break-words",
                  row.abandoned && "text-[color:var(--text-secondary)]",
                )}
              >
                {row.label}
              </span>
            </DataTableLink>
            <span className="sm:hidden">{badge}</span>
          </span>
          <span className="flex flex-wrap gap-x-3 gap-y-0.5 lg:hidden">
            <span className={caption}>
              {`${t.list.columns.date} : `}
              <span className="text-[color:var(--text-secondary)]">{date}</span>
            </span>
            <span className={caption}>
              {`${t.list.columns.version} : `}
              <span className="text-[color:var(--text-secondary)]">
                {version}
              </span>
            </span>
          </span>
          {row.changed && (
            <span
              className={cn(caption, "text-[color:var(--tone-warning-fg)]")}
            >
              {t.list.changed}
            </span>
          )}
        </span>
      </DataTableCell>
      <DataTableCell hideBelow="lg" className={COLUMN.date}>
        <span className={cn(!row.date && "text-[color:var(--text-tertiary)]")}>
          {date}
        </span>
      </DataTableCell>
      <DataTableCell hideBelow="sm" className={COLUMN.status}>
        {badge}
      </DataTableCell>
      <DataTableCell hideBelow="lg" className={COLUMN.version}>
        <span
          className={cn(
            "tabular-nums",
            !row.version && "text-[color:var(--text-tertiary)]",
          )}
        >
          {version}
        </span>
      </DataTableCell>
    </DataTableRow>
  );
}
