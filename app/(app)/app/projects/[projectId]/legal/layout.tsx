import { shell } from "@/lib/i18n/fr/shell";

// The tab says the project and the module (Sacha 05/11/2026): « Piégé ·
// Module · PDS OS » through the project layout's template.
export const metadata = { title: shell.project.sidebar.legal };

// The Juridique waits for the Plan du Projet (docs/ARCHITECTURE.md § 6 ter):
// the lock is decided by the page (legalLock, [[...step]]/page.tsx), which
// knows its route: a collective's « Participations et contrats » (lot 12 of
// docs/pds-mic-plan.md) is reachable before the Juridique is launched, the
// direction's waivers living there.
export default function LegalLayout({
  children,
}: LayoutProps<"/app/projects/[projectId]/legal">) {
  return children;
}
