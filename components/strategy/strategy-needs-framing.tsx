import Link from "next/link";
import { IconClipboardCheck } from "nucleo-sharp-essential";

import { EmptyState } from "@/components/shell/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";

// Shown while the framing stage is not validated: the strategy is built on
// the validated Brief, so the only way forward is back to the Cadrage.
export function StrategyNeedsFraming({
  projectId,
  canEdit,
}: {
  projectId: string;
  canEdit: boolean;
}) {
  const t = fr.strategy.needsFraming;
  return (
    <EmptyState
      icon={IconClipboardCheck}
      title={t.title}
      body={canEdit ? t.body : t.bodyReadOnly}
      action={
        <Link
          href={routes.projectFraming(projectId)}
          className={buttonVariants({ size: "lg" })}
        >
          {t.toFraming}
        </Link>
      }
    />
  );
}
