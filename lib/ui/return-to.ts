// « Revenir au même projet et à la même étape » after a correction made on
// another page (PROJ-BUG-10): the way back travels in the URL (`?retour=`),
// and only a path of a project of the app is ever followed. Client-safe.

const PROJECT_PATH = /^\/app\/projects\/[0-9a-f-]{36}(\/[a-z0-9/-]*)?$/;

export const RETURN_PARAM = "retour";

/** The page `href`, which will offer to come back to `back`. */
export function withReturn(href: string, back: string): string {
  const separator = href.includes("?") ? "&" : "?";
  return `${href}${separator}${RETURN_PARAM}=${encodeURIComponent(back)}`;
}

/** The way back, if it is a project page of the app; null otherwise. */
export function safeReturn(value: string | null | undefined): string | null {
  return value && PROJECT_PATH.test(value) ? value : null;
}
