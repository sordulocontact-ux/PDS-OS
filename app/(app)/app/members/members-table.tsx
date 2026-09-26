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
} from "@/components/ui/data-table";
import { signupUrl } from "@/lib/auth/site-url";
import { fr } from "@/lib/i18n/fr";
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
        <DataTableHead>{t.columns.person}</DataTableHead>
        <DataTableHead hideBelow="sm">{t.columns.role}</DataTableHead>
        <DataTableHead>{t.columns.status}</DataTableHead>
        <DataTableHead hideBelow="md">{t.columns.decision}</DataTableHead>
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
                <div className="flex flex-col">
                  <span>
                    {row.status === "invited" && row.decidedAt
                      ? `${t.invitedAt} ${dateFormatter.format(new Date(row.decidedAt))}`
                      : row.status !== "pending" && row.decidedAt
                        ? dateFormatter.format(new Date(row.decidedAt))
                        : `${t.requestedAt} ${dateFormatter.format(new Date(row.requestedAt))}`}
                  </span>
                  {row.decisionNote && (
                    <span className="max-w-xs truncate text-xs text-muted-foreground">
                      {row.decisionNote}
                    </span>
                  )}
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
