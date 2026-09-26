import { StatusBadge } from "@/components/ui/status-badge";
import { membershipTone } from "@/lib/ui/state-tones";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t.columns.person}</TableHead>
          <TableHead>{t.columns.role}</TableHead>
          <TableHead>{t.columns.status}</TableHead>
          <TableHead>{t.columns.decision}</TableHead>
          <TableHead className="text-right">{t.columns.actions}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => {
          const isSelf = row.person.id === selfPersonId;
          const fullName = [row.person.firstName, row.person.lastName]
            .filter(Boolean)
            .join(" ");
          return (
            <TableRow key={row.id} className="align-top">
              <TableCell>
                <div className="flex flex-col">
                  <span className="font-medium">
                    {fullName}
                    {isSelf && (
                      <span className="ml-1.5 text-xs font-medium text-muted-foreground">
                        ({t.you})
                      </span>
                    )}
                  </span>
                  <span className="text-muted-foreground">
                    {row.person.email}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                {row.role ? (
                  t.roles[row.role]
                ) : (
                  <span className="text-muted-foreground">{t.noRole}</span>
                )}
              </TableCell>
              <TableCell>
                <StatusBadge tone={membershipTone[row.status]}>
                  {t.statuses[row.status]}
                </StatusBadge>
              </TableCell>
              <TableCell>
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
              </TableCell>
              <TableCell className="text-right">
                <MemberRowActions
                  membership={row}
                  isSelf={isSelf}
                  signupLink={
                    row.status === "invited" && row.person.email
                      ? signupUrl(row.person.email)
                      : null
                  }
                />
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
