import Link from "next/link";
import { IconDrawCompass } from "nucleo-sharp-essential";

import { EmptyState } from "@/components/shell/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";

// Shown while the Strategy is not validated: the Conception designs what the
// Strategy committed to, so the only way forward is back to the Strategy.
export function DesignNeedsStrategy({
  projectId,
  canEdit,
}: {
  projectId: string;
  canEdit: boolean;
}) {
  const t = fr.design.needsStrategy;
  return (
    <EmptyState
      icon={IconDrawCompass}
      title={t.title}
      body={canEdit ? t.body : t.bodyReadOnly}
      action={
        <Link
          href={routes.projectStrategy(projectId)}
          className={buttonVariants({ size: "lg" })}
        >
          {t.toStrategy}
        </Link>
      }
    />
  );
}
