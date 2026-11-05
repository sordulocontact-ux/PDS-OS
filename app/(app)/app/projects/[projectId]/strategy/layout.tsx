import { strategyJourney } from "@/lib/i18n/fr/strategy-journey";

/**
 * The strategy section: no frame of its own (each step page draws it), only the
 * tab's title — « Piégé · Module · PDS OS » through the project
 * layout's template (Sacha 05/11/2026).
 */
export const metadata = { title: strategyJourney.module };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
