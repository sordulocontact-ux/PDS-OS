// Projet collectif, lot 15 (docs/pds-mic-plan.md § 3 bis point 7): the
// Distribution of a collective is held release by release — a title's
// release or the compilation —, the release named in the address
// (`?sortie=<id>`), never guessed. A simple project has one deposit, its
// release_id null: every helper here leaves it as it was. Client-safe.

/** The address's parameter that names the release of the Distribution. */
export const RELEASE_PARAM = "sortie";

/** The release a collective's Distribution is about (null: a simple
 * project's deposit, or a collective with none chosen). */
export type DistributionRelease = {
  id: string;
  // A title's release, or the compilation (the project's release).
  kind: "title" | "compilation";
  titleId: string | null;
  // « Marina », or the compilation's name.
  label: string;
  // Its own date (a title's release), the project's due date (the
  // compilation).
  date: string | null;
  // Archived by a change of mode, or its title abandoned: read only.
  readOnly: "archived" | "abandoned" | null;
};

/** A project read for the Distribution: for a collective, with the release
 * it is about (its masters are then that release's tracks). */
export type ScopedProject = {
  distributionRelease?: DistributionRelease | null;
};

export const releaseIdOf = (project: ScopedProject): string | null =>
  project.distributionRelease?.id ?? null;

/** The RPC argument: only for a collective's release, so a simple project
 * calls its functions as before. */
export const releaseArg = (releaseId: string | null | undefined) =>
  releaseId ? { p_release_id: releaseId } : {};

/** An address of the Distribution, kept on the same release. */
export function withRelease(
  href: string,
  releaseId: string | null | undefined,
) {
  if (!releaseId) return href;
  const [path, hash] = href.split("#");
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}${RELEASE_PARAM}=${releaseId}${hash ? `#${hash}` : ""}`;
}

type Filterable<Q> = {
  eq(column: "release_id", value: string): Q;
  is(column: "release_id", value: null): Q;
};

/** A read of a Distribution table, kept to one deposit: the release's, or
 * the simple project's (release_id null). */
export function inScope<Q extends Filterable<Q>>(
  query: Q,
  releaseId: string | null,
): Q {
  return releaseId
    ? query.eq("release_id", releaseId)
    : query.is("release_id", null);
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The release named in a page's address (`?sortie=`), if well formed. */
export function releaseParamOf(
  searchParams: Record<string, string | string[] | undefined>,
): string | null {
  const value = searchParams[RELEASE_PARAM];
  return typeof value === "string" && UUID.test(value) ? value : null;
}
