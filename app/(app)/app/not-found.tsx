import { IconMagnifier } from "nucleo-sharp-essential";
import Link from "next/link";

import { EmptyState } from "@/components/shell/empty-state";
import { PageContainer } from "@/components/shell/page-container";
import { buttonVariants } from "@/components/ui/button";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";

const t = fr.errors.notFound;

// A page that does not exist, or no longer visible (a project refused, a
// record deleted): said in French inside the app, with a way out.
export default function AppNotFound() {
  return (
    <PageContainer>
      <EmptyState
        icon={IconMagnifier}
        title={t.title}
        body={t.body}
        action={
          <div className="flex flex-wrap gap-2">
            <Link href={routes.app} className={buttonVariants()}>
              {t.home}
            </Link>
            <Link
              href={routes.projects}
              className={buttonVariants({ variant: "outline" })}
            >
              {t.projects}
            </Link>
          </div>
        }
      />
    </PageContainer>
  );
}
