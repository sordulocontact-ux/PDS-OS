"use client";

import { IconCircleInfo } from "nucleo-sharp-essential";

import { DialogButton } from "@/components/ui/dialog-button";
import { projectShell } from "@/lib/i18n/fr/project-shell";

const fr = { projectShell };

/**
 * « Informations » of the overview, a quiet secondary action (retour
 * d'Akili du 05/11/2026): what was entered at creation, its manager and,
 * for whoever may change it, the cover — read in the modal, rendered by the
 * page.
 */
export function ProjectInfoButton({ children }: { children: React.ReactNode }) {
  const t = fr.projectShell.overview;
  return (
    <DialogButton
      label={t.info}
      icon={IconCircleInfo}
      title={t.infoTitle}
      description={t.infoDescription}
    >
      {children}
    </DialogButton>
  );
}
