import type { OrganizationRole } from "@/lib/auth/redirects";

/**
 * The pre-production test accounts: the people of the proto « Projet complet »
 * (docs/protos/projet.html). Two project managers, so « only the owner
 * writes » can be felt, and the two business positions (Deals, Dépenses, an
 * artist's « Business » tab). The seed creates the first four
 * (supabase/preprod/seed.sql), supabase/preprod/showcase-business.sql the
 * last two; the pre-production bar signs in as them.
 */
export const PREPROD_ACCOUNTS = [
  {
    key: "dg",
    email: "claire.morel@preprod.pds",
    firstName: "Claire",
    lastName: "Morel",
    role: "general_director",
  },
  {
    key: "cp",
    email: "lina.haddad@preprod.pds",
    firstName: "Lina",
    lastName: "Haddad",
    role: "project_manager",
  },
  {
    key: "cp2",
    email: "tom.mercier@preprod.pds",
    firstName: "Tom",
    lastName: "Mercier",
    role: "project_manager",
  },
  {
    key: "da",
    email: "nadia.benali@preprod.pds",
    firstName: "Nadia",
    lastName: "Benali",
    role: "creative_director",
  },
  {
    key: "bm",
    email: "malik.durand@preprod.pds",
    firstName: "Malik",
    lastName: "Durand",
    role: "business_manager",
  },
  {
    key: "biz",
    email: "elise.fabre@preprod.pds",
    firstName: "Élise",
    lastName: "Fabre",
    role: "business",
  },
] as const satisfies readonly {
  key: string;
  email: string;
  firstName: string;
  lastName: string;
  role: OrganizationRole;
}[];

export type PreprodAccount = (typeof PREPROD_ACCOUNTS)[number];

export function preprodAccount(key: string): PreprodAccount | null {
  return PREPROD_ACCOUNTS.find((account) => account.key === key) ?? null;
}
