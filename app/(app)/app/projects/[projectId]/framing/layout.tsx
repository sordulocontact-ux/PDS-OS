import { framingJourney } from "@/lib/i18n/fr/framing-journey";

/**
 * The framing section: no frame of its own (each step page draws it), only the
 * tab's title — « Piégé · Module · PDS OS » through the project
 * layout's template (Sacha 05/11/2026).
 */
export const metadata = { title: framingJourney.module };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
