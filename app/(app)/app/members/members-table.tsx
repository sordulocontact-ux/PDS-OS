import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import { membershipTone } from "@/lib/ui/state-tones";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableMedia,
  DataTableRow,
  DataTableText,
  EMPTY_CELL,
} from "@/components/ui/data-table";
import { signupUrl } from "@/lib/auth/site-url";
import { fr } from "@/lib/i18n/fr";
import { cn } from "@/lib/utils";
import type { MembershipRow } from "@/lib/members/types";

import { MemberRowActions } from "./member-row-actions";

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

export function MembersTable({
  rows,
  selfPersonId,
}: {
  rows: MembershipRow[];
  selfPersonId: string | null;
}) {
  const t = fr.auth.members;

  return (
    <DataTable>
      <DataTableHeader>
        <DataTableHead icon="person">{t.columns.person}</DataTableHead>
        <DataTableHead icon="role" hideBelow="sm">
          {t.columns.role}
        </DataTableHead>
        <DataTableHead icon="status">{t.columns.status}</DataTableHead>
        <DataTableHead icon="decision" hideBelow="md">
          {t.columns.decision}
        </DataTableHead>
        <DataTableHead icon="note" hideBelow="xl">
          {t.columns.note}
        </DataTableHead>
        <DataTableHead icon="ai" hideBelow="lg">
          {fr.aiUsage.team.column}
        </DataTableHead>
        <DataTableHead fill align="end">
          {t.columns.actions}
        </DataTableHead>
      </DataTableHeader>
      <DataTableBody>
        {rows.map((row) => {
          const isSelf = row.person.id === selfPersonId;
          const fullName = [row.person.firstName, row.person.lastName]
            .filter(Boolean)
            .join(" ");
          return (
            <DataTableRow key={row.id}>
              <DataTableCell>
                <DataTableMedia
                  title={
                    <span className="truncate">
                      {fullName}
                      {isSelf && (
                        <span className="ml-1.5 text-xs font-medium text-muted-foreground">
                          ({t.you})
                        </span>
                      )}
                    </span>
                  }
                  subtitle={row.person.email}
                />
              </DataTableCell>
              <DataTableCell hideBelow="sm">
                {row.role ? (
                  t.roles[row.role]
                ) : (
                  <span className="text-muted-foreground">{t.noRole}</span>
                )}
              </DataTableCell>
              <DataTableCell>
                <StatusBadge tone={membershipTone[row.status]}>
                  {t.statuses[row.status]}
                </StatusBadge>
              </DataTableCell>
              <DataTableCell hideBelow="md">
                {row.status === "invited" && row.decidedAt
                  ? `${t.invitedAt} ${dateFormatter.format(new Date(row.decidedAt))}`
                  : row.status !== "pending" && row.decidedAt
                    ? dateFormatter.format(new Date(row.decidedAt))
                    : `${t.requestedAt} ${dateFormatter.format(new Date(row.requestedAt))}`}
              </DataTableCell>
              <DataTableCell hideBelow="xl">
                <DataTableText>{row.decisionNote || EMPTY_CELL}</DataTableText>
              </DataTableCell>
              <DataTableCell hideBelow="lg">
                <div className="flex w-24 flex-col gap-1.5">
                  <span
                    className={cn(
                      "tabular-nums",
                      row.ai.used >= row.ai.limit && "text-error",
                    )}
                  >
                    {fr.aiUsage.team.count(row.ai.used, row.ai.limit)}
                  </span>
                  <ProgressBar
                    value={row.ai.used}
                    max={row.ai.limit}
                    label={fr.aiUsage.team.barLabel(row.ai.used, row.ai.limit)}
                    tone={row.ai.used >= row.ai.limit ? "error" : "ink"}
                  />
                </div>
              </DataTableCell>
              <DataTableCell fill align="end">
                <MemberRowActions
                  membership={row}
                  isSelf={isSelf}
                  signupLink={
                    row.status === "invited" && row.person.email
                      ? signupUrl(row.person.email)
                      : null
                  }
                />
              </DataTableCell>
            </DataTableRow>
          );
        })}
      </DataTableBody>
    </DataTable>
  );
}
