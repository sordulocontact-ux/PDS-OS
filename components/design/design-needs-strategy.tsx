import Link from "next/link";
import { IconDrawCompass } from "nucleo-sharp-essential";

import { EmptyState } from "@/components/shell/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { viewHref } from "@/lib/ui/view-href";

// Shown while the Strategy is not validated: the Conception designs what the
// Strategy committed to, so the way forward is back to the Strategy. The
// creative team may already deposit its leads in the project's Fichiers.
export function DesignNeedsStrategy({
  projectId,
  canEdit,
  creative = false,
}: {
  projectId: string;
  canEdit: boolean;
  creative?: boolean;
}) {
  const t = fr.design.needsStrategy;
  return (
    <EmptyState
      icon={IconDrawCompass}
      title={t.title}
      body={
        creative
          ? `${t.bodyReadOnly} ${fr.design.earlyDeposit}`
          : canEdit
            ? t.body
            : t.bodyReadOnly
      }
      action={
        creative ? (
          <EarlyDepositLink projectId={projectId} />
        ) : (
          <Link
            href={routes.projectStrategy(projectId)}
            className={buttonVariants({ size: "lg" })}
          >
            {t.toStrategy}
          </Link>
        )
      }
    />
  );
}

/** « Déposer dans Fichiers »: the project's library, on its Visuels view. */
export function EarlyDepositLink({
  projectId,
  size = "lg",
}: {
  projectId: string;
  size?: "lg" | "sm";
}) {
  return (
    <Link
      href={viewHref(routes.projectFiles(projectId), { category: "visual" })}
      className={buttonVariants({
        size,
        variant: size === "sm" ? "outline" : "default",
      })}
    >
      {fr.design.toFiles}
    </Link>
  );
}
