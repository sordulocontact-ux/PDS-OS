import type { OrganizationRole } from "@/lib/auth/redirects";

/**
 * The pre-production test accounts: the people of the proto « Projet complet »
 * (docs/protos/projet.html). Two project managers, so « only the owner
 * writes » can be felt. The seed creates them (scripts/preprod-seed.mjs) and
 * the pre-production bar signs in as them: one list for both sides.
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
