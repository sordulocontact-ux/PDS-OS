import { SectionFrame } from "@/components/shell/section-frame";
import { Card, CardContent } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";

import { InviteMemberForm } from "./invite-member-form";

export const metadata = {
  title: `${fr.auth.newMember.title} · ${fr.app.name}`,
};

// Account creation by the general director, with the position chosen up front.
export default async function NewMemberPage() {
  await requireAdmin();
  const t = fr.auth.newMember;

  return (
    <SectionFrame
      className="max-w-2xl"
      list={false}
      parent={{ label: fr.shell.nav.members, href: routes.members }}
      title={t.title}
    >
      <Card>
        <CardContent>
          <InviteMemberForm />
        </CardContent>
      </Card>
    </SectionFrame>
  );
}
