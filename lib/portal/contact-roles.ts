import { legalSplits } from "@/lib/i18n/fr/legal-splits";
import { portal } from "@/lib/i18n/fr/portal";
import { roles } from "@/lib/i18n/fr/roles";

const fr = { legalSplits, roles, portal };

const PORTAL: Record<string, string> = fr.portal.roles;
const PRODUCTION: Record<string, string> = fr.roles.production;
const SPLIT: Record<string, string> = fr.legalSplits.roles;
// Said only when nothing more precise is known of the person.
const GENERIC = new Set(["form", "provider", "split"]);

/** The person's parts in the project, as the line above the title says
 * them (« Ingénieur du mix, Compositeur·rice »), from the keys of
 * get_contact_page: a Master role, « production:<role> », a split's role. */
export function contactRoleLine(roles: string[]): string | null {
  const precise = roles.some((r) => !GENERIC.has(r));
  const labels = roles
    .filter((r) => !precise || !GENERIC.has(r))
    .map((r) =>
      r.startsWith("production:")
        ? PRODUCTION[r.slice("production:".length)]
        : (PORTAL[r] ?? SPLIT[r] ?? r),
    )
    .filter((x): x is string => Boolean(x));
  return labels.length > 0 ? [...new Set(labels)].join(", ") : null;
}
