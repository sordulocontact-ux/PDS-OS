"use client";

import { FormMessage } from "@/components/auth/form-message";
import { useCanEditProject } from "@/components/projects/edit-access";
import { fr } from "@/lib/i18n/fr";

/** Tells a viewer without edit rights why the write controls are missing. */
export function ReadOnlyNotice({ className }: { className?: string }) {
  const canEdit = useCanEditProject();
  if (canEdit) return null;
  return (
    <FormMessage kind="info" className={className}>
      {fr.shell.project.readOnly}
    </FormMessage>
  );
}
