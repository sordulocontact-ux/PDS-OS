// A collective's title carried from one workflow to the next (Sacha,
// 28/11/2026: « quand je suis sur un titre dans le Master et que je vais
// sur Juridique, je reste sur ce titre »). The Master, the Juridique and the
// Distribution are worked title by title; inside one title (a step keeping
// it in its address, or the title's page), the project's navigation opens
// the other two on the same title. From a list or a page of the whole
// project, it opens their list. The title travels in the address only,
// never in a hidden memory: going back and a link sent stay right. Each
// module's entry resolves it (lib/projects/title-carry.ts). Client-safe, pure.

/** The workflows worked title by title, keyed like the navigation. */
export const CARRY_MODULES = ["master", "legal", "distribution"] as const;
export type CarryModule = (typeof CARRY_MODULES)[number];

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Where the viewer stands inside one title: the page they are on and the
 * address's part that names the title (`titre=` a project title or its
 * master, `sortie=` a release, which the entries map back to its title). */
export type CarriedTitle = {
  from: CarryModule | "tracks";
  query: string;
};

/** The title the page shows, read from its address; null: a list, a page
 * of the whole project (the Juridique's « Projet »), or not a module worked
 * by title. */
export function carriedTitleOf(
  projectId: string,
  pathname: string,
  params: Pick<URLSearchParams, "get">,
): CarriedTitle | null {
  const base = `/app/projects/${projectId}/`;
  if (!pathname.startsWith(base)) return null;
  const [first, second, third] = pathname.slice(base.length).split("/");
  // The title's page (« Titres › Néons »).
  if (first === "tracks")
    return second && UUID.test(second)
      ? { from: "tracks", query: `titre=${second}` }
      : null;
  const from: CarryModule | null =
    first === "master"
      ? "master"
      : first === "legal"
        ? "legal"
        : first === "release"
          ? "distribution"
          : null;
  if (!from) return null;
  // A collective's title steps of the Juridique name it in their path.
  if (
    from === "legal" &&
    (second === "attach" || second === "title-contracts") &&
    third &&
    UUID.test(third)
  )
    return { from, query: `titre=${third}` };
  const titre = params.get("titre");
  if (titre && UUID.test(titre)) return { from, query: `titre=${titre}` };
  const sortie = params.get("sortie");
  if (sortie && UUID.test(sortie)) return { from, query: `sortie=${sortie}` };
  return null;
}

/** An entry of the navigation, on the title carried when it is another
 * workflow worked by title; the workflow the viewer is in keeps its own
 * entry (its list), as its crumb does. */
export function carryHref(
  key: string,
  href: string,
  carried: CarriedTitle | null,
): string {
  if (!carried || carried.from === key) return href;
  if (!(CARRY_MODULES as readonly string[]).includes(key)) return href;
  return `${href.split(/[?#]/)[0]}?${carried.query}`;
}
