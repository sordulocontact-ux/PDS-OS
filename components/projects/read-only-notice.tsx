"use client";

import { usePathname } from "next/navigation";

import { FormMessage } from "@/components/auth/form-message";
import { useCanEditProject } from "@/components/projects/edit-access";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";

/**
 * Tells a viewer without edit rights why the write controls are missing. On
 * the Conception, the creative team still deposits versions: said so. On
 * the Juridique, nothing is shown: the journey already says who acts.
 */
export function ReadOnlyNotice({
  projectId,
  className,
}: {
  projectId: string;
  className?: string;
}) {
  const canEdit = useCanEditProject();
  const pathname = usePathname();
  if (canEdit) return null;
  // The Juridique journey already says who acts: no banner there.
  if (pathname.startsWith(routes.projectLegal(projectId))) return null;
  const onDesign = pathname.startsWith(routes.projectDesign(projectId));
  return (
    <FormMessage kind="info" className={className}>
      {onDesign ? fr.shell.project.readOnlyDesign : fr.shell.project.readOnly}
    </FormMessage>
  );
}
