"use client";

import { usePathname } from "next/navigation";

import { FormMessage } from "@/components/auth/form-message";
import { useCanEditProject } from "@/components/projects/edit-access";
import { routes } from "@/lib/auth/redirects";
import { shell } from "@/lib/i18n/fr/shell";

const fr = { shell };

// The sections without a journey, where nothing else says who writes.
const PLAIN_SECTIONS = [
  "budget",
  "team",
  "calls",
  "planning",
  "deliverables",
  "files",
];

/**
 * Tells a viewer without edit rights why the write controls are missing,
 * only on the project's sections without a journey (Budget, Équipe, Calls,
 * Planning, Livrables, Fichiers). The workflows, Travail, Validations and
 * Activité show no banner, as in the proto: their « Maintenant » and steps
 * already say who acts, and the direction or the creative director often has
 * a decision to make there (recette 19/10/2026; UX test of 09/10: « la DG
 * voit Lecture seule au-dessus de boutons qu'elle peut utiliser »).
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
  const section = pathname
    .slice(routes.project(projectId).length + 1)
    .split("/")[0];
  if (!PLAIN_SECTIONS.includes(section)) return null;
  return (
    <FormMessage kind="info" className={className}>
      {fr.shell.project.readOnly}
    </FormMessage>
  );
}
