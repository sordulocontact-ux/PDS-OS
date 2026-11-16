import { IconUsers2 } from "nucleo-sharp-essential";
import { IconUserPlus } from "@/components/icons";
import Link from "next/link";

import { FormMessage } from "@/components/auth/form-message";
import { SectionFrame } from "@/components/shell/section-frame";
import { buttonVariants, ButtonRoll } from "@/components/ui/button";
import { DataTableViews } from "@/components/ui/data-table";
import { requireAdmin } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { listMemberships } from "@/lib/members/queries";
import {
  MEMBERSHIP_STATUSES,
  isMembershipStatus,
  type MembershipStatus,
} from "@/lib/members/types";
import { viewHref } from "@/lib/ui/view-href";
import { cn } from "@/lib/utils";

import { MembersTable } from "../members-table";

export const metadata = { title: `${fr.auth.members.title} · ${fr.app.name}` };

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

  const action = (
    <Link
      href={routes.membersNew}
      className={cn(buttonVariants({ size: "lg" }), "gap-2")}
    >
      <ButtonRoll>
        <IconUserPlus className="size-4" aria-hidden />
        {t.create}
      </ButtonRoll>
    </Link>
  );

  return (
    <SectionFrame
      title={t.title}
      description={t.subtitle}
      action={action}
      toolsAction={!error}
    >
      {error ? (
        <FormMessage kind="error">{t.loadError}</FormMessage>
      ) : (
        <DataTableViews
          label={t.segmentsLabel}
          pageAction={action}
          views={MEMBERSHIP_STATUSES.map((status) => ({
            href: viewHref(routes.members, { status }),
            label: t.segments[status],
            count: countOf(status),
            current: status === segment,
          }))}
        >
          {visible.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-card py-12 text-center">
              <IconUsers2
                className="size-5 text-muted-foreground"
                aria-hidden
              />
              <p className="text-sm text-muted-foreground">
                {t.empty[segment]}
              </p>
            </div>
          ) : (
            <MembersTable rows={visible} selfPersonId={access.personId} />
          )}
        </DataTableViews>
      )}
    </SectionFrame>
  );
}
