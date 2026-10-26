/**
 * « Aller à » of the pre-production bar: one seeded project per moment
 * (supabase/preprod/seed.sql), found by its title, and the page where the
 * moment is felt. Labels: fr.preprod.moments, which say who acts.
 */
export const PREPROD_MOMENTS = [
  { key: "accept", title: "Velours", path: "" },
  { key: "framing", title: "Néons", path: "/framing" },
  { key: "brief", title: "Marée basse", path: "/framing" },
  { key: "plan", title: "Ciel ouvert", path: "/framing" },
  { key: "launched", title: "Minuit pile", path: "/strategy" },
] as const;
