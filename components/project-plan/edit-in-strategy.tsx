import Link from "next/link";

import { Button } from "@/components/ui/button";
import { routes } from "@/lib/auth/redirects";
import { projectPlan } from "@/lib/i18n/fr/project-plan";

const fr = { projectPlan };

// These pages only read the plan: it is written in the Strategy, by the
// project's owner (the database enforces it). Shown to the owner only.
export function EditInStrategy({
  projectId,
  canEdit,
}: {
  projectId: string;
  canEdit: boolean;
}) {
  if (!canEdit) return null;
  return (
    <Button
      variant="outline"
      size="sm"
      nativeButton={false}
      render={<Link href={routes.projectStrategy(projectId)} />}
    >
      {fr.projectPlan.editInStrategy}
    </Button>
  );
}
