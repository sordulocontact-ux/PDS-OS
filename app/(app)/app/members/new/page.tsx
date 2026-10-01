import { BackLink } from "@/components/shell/back-link";
import { PageContainer } from "@/components/shell/page-container";
import { PageHeader } from "@/components/shell/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";

import { InviteMemberForm } from "./invite-member-form";

// Account creation by the general director, with the position chosen up front.
export default async function NewMemberPage() {
  await requireAdmin();
  const t = fr.auth.newMember;

  return (
    <PageContainer className="max-w-2xl">
      <BackLink href={routes.members}>{t.back}</BackLink>
      <PageHeader title={t.title} description={t.subtitle} />
      <Card>
        <CardContent>
          <InviteMemberForm />
        </CardContent>
      </Card>
    </PageContainer>
  );
}
