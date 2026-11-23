import { InfoButton } from "@/components/ui/info-button";
import { projectShell } from "@/lib/i18n/fr/project-shell";

const fr = { projectShell };

/**
 * « Informations » of the overview (retour d'Akili du 05/11/2026): what was
 * entered at creation, its manager and, for whoever may change it, the
 * cover — read in the modal, rendered by the page.
 */
export function ProjectInfoButton({ children }: { children: React.ReactNode }) {
  const t = fr.projectShell.overview;
  return (
    <InfoButton
      label={t.info}
      title={t.infoTitle}
      description={t.infoDescription}
    >
      {children}
    </InfoButton>
  );
}
