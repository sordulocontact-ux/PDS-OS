"use client";

import { usePathname } from "next/navigation";

import { FormMessage } from "@/components/auth/form-message";
import { useCanEditProject } from "@/components/projects/edit-access";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";

/**
 * Tells a viewer without edit rights why the write controls are missing,
 * naming the owner who writes (ticket « Architecture globale » § 9). On
 * the Conception, the creative team still deposits versions: said so.
 */
export function ReadOnlyNotice({
  projectId,
  ownerName,
  className,
}: {
  projectId: string;
  ownerName: string | null;
  className?: string;
}) {
  const canEdit = useCanEditProject();
  const pathname = usePathname();
  if (canEdit) return null;
  const onDesign = pathname.startsWith(routes.projectDesign(projectId));
  return (
    <FormMessage kind="info" className={className}>
      {onDesign
        ? fr.shell.project.readOnlyDesign
        : fr.shell.project.readOnly(ownerName)}
    </FormMessage>
  );
}
