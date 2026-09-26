import Link from "next/link";
import { IconMicrophone } from "nucleo-sharp-essential";

import { EmptyState } from "@/components/shell/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";

// Shown while the project has no call report: the framing starts from a call,
// so the only action is to go and plan or record one.
export function FramingNeedsCall({
  projectId,
  canEdit,
}: {
  projectId: string;
  canEdit: boolean;
}) {
  const t = fr.framing.needsCall;
  return (
    <EmptyState
      icon={IconMicrophone}
      title={t.title}
      body={canEdit ? t.body : t.bodyReadOnly}
      action={
        canEdit && (
          <Link
            href={routes.projectCalls(projectId)}
            className={buttonVariants({ size: "lg" })}
          >
            {t.toCalls}
          </Link>
        )
      }
    />
  );
}
