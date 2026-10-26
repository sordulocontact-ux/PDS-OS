import { PreprodBar } from "@/components/preprod/preprod-bar";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { PREPROD_ACCOUNTS } from "@/lib/preprod/accounts";
import { isPreprod } from "@/lib/preprod/config";
import { PREPROD_MOMENTS } from "@/lib/preprod/moments";
import { createClient } from "@/lib/supabase/server";

/**
 * Server side of the pre-production bar: nothing at all outside the
 * pre-production. The moments' projects are read with the visitor's session,
 * so « Aller à » lists only what this account may open (RLS).
 */
export async function PreprodSlot({ email }: { email: string | null }) {
  if (!isPreprod()) return null;
  const supabase = await createClient();
  const { data: projects } = await supabase
    .from("projects")
    .select("id, title")
    .in(
      "title",
      PREPROD_MOMENTS.map((moment) => moment.title),
    );
  const moments = PREPROD_MOMENTS.flatMap((moment) => {
    const project = projects?.find((p) => p.title === moment.title);
    return project
      ? [
          {
            label: fr.preprod.moments[moment.key],
            href: `${routes.projects}/${project.id}${moment.path}`,
          },
        ]
      : [];
  });
  const accounts = PREPROD_ACCOUNTS.map((account) => ({
    key: account.key,
    name: `${account.firstName} ${account.lastName}`,
    role: fr.auth.members.roles[account.role],
  }));
  const currentKey =
    PREPROD_ACCOUNTS.find((account) => account.email === email)?.key ?? null;
  return (
    <PreprodBar accounts={accounts} currentKey={currentKey} moments={moments} />
  );
}
