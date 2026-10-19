// How a private-link view authenticates (lot 11, shell.md E10 § 3): the key
// it hands to its loaders and Server Actions is either the object's own
// token (its page /m, /f, /s, /i, /p, links already sent) or the person's
// token with the object's id (their page by project, /c). The database
// checks both the same way: the second through the overloads of
// 20261019110201, which refuse an object of another contact or project.

const TOKEN = /^[0-9a-f]{64}$/;
const PAIR =
  /^([0-9a-f]{64})~([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/;

/** A view's key: `<token>` or `<person's token>~<object id>`. */
export const LINK_KEY =
  /^[0-9a-f]{64}(~[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})?$/;

/** The key of an object seen from the person's page. */
export const contactItemKey = (contactToken: string, itemId: string) =>
  `${contactToken}~${itemId}`;

type KeyArgs =
  { p_token: string } | { p_contact_token: string; p_item_id: string };

/** The RPC arguments that name the link: spread them before the others. */
export function linkKeyArgs(key: string): KeyArgs {
  const pair = PAIR.exec(key);
  return pair
    ? { p_contact_token: pair[1], p_item_id: pair[2] }
    : { p_token: TOKEN.test(key) ? key : "" };
}

// The page a key is read on: the object's own, or the person's.
type ObjectPage = "m" | "f" | "s" | "i" | "p";

/** The path to revalidate after a gesture made through this key. */
export function linkKeyPath(page: ObjectPage, key: string): string {
  const pair = PAIR.exec(key);
  return pair ? `/c/${pair[1]}` : `/${page}/${key}`;
}
