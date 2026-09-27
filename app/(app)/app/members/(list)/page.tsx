import { IconUsers2 } from "nucleo-sharp-essential";
import { IconUserPlus } from "@/components/icons";
import Link from "next/link";

import { FormMessage } from "@/components/auth/form-message";
import { PageContainer } from "@/components/shell/page-container";
import { PageHeader } from "@/components/shell/page-header";
import { buttonVariants } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { listMemberships } from "@/lib/members/queries";
import {
  MEMBERSHIP_STATUSES,
  isMembershipStatus,
  type MembershipStatus,
} from "@/lib/members/types";
import { cn } from "@/lib/utils";

import { MembersTable } from "../members-table";

// Team screen: accounts created ahead, access requests and members, with
// the decisions taken there. General director only.
export default async function MembersPage({
  searchParams,
}: PageProps<"/app/members">) {
  const access = await requireAdmin();
  const t = fr.auth.members;
  const params = await searchParams;
  const segment: MembershipStatus = isMembershipStatus(params.status)
    ? params.status
    : "approved";

  const { rows, error } = await listMemberships(access.organizationId ?? "");
  const visible = rows.filter((row) => row.status === segment);
  const countOf = (status: MembershipStatus) =>
    rows.filter((row) => row.status === status).length;

  return (
    <PageContainer>
      <PageHeader
        title={t.title}
        description={t.subtitle}
        action={
          <Link
            href={routes.membersNew}
            className={cn(buttonVariants({ size: "lg" }), "gap-2")}
          >
            <IconUserPlus className="size-4" aria-hidden />
            {t.create}
          </Link>
        }
      />

      <nav aria-label={t.segmentsLabel} className="flex flex-wrap gap-1.5">
        {MEMBERSHIP_STATUSES.map((status) => {
          const active = status === segment;
          return (
            <Link
              key={status}
              href={`${routes.members}?status=${status}`}
              aria-current={active ? "page" : undefined}
              className={cn(
                buttonVariants({
                  variant: active ? "secondary" : "ghost",
                  size: "lg",
                }),
                "gap-2",
              )}
            >
              {t.segments[status]}
              <span className="text-xs text-muted-foreground tabular-nums">
                {countOf(status)}
              </span>
            </Link>
          );
        })}
      </nav>

      {error ? (
        <FormMessage kind="error">{t.loadError}</FormMessage>
      ) : visible.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-12 text-center">
          <IconUsers2 className="size-5 text-muted-foreground" aria-hidden />
          <p className="text-sm text-muted-foreground">{t.empty[segment]}</p>
        </div>
      ) : (
        <MembersTable rows={visible} selfPersonId={access.personId} />
      )}
    </PageContainer>
  );
}
