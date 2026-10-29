import type { Access } from "@/lib/auth/access";
import { loadHomeFeed } from "@/lib/home/feed";
import { shell } from "@/lib/i18n/fr/shell";

const fr = { shell };

/** Under the greeting: how many moves wait for the viewer, decisions
 * counted apart (« 3 actions vous attendent, dont une à valider »). The same
 * read as the feed below (cached per request). */
export async function HomeSummary({ access }: { access: Access }) {
  const { lead, also } = await loadHomeFeed(access);
  const mine = lead ? [lead, ...also] : also;
  return fr.shell.home.summary(
    mine.length,
    mine.filter((row) => row.kind === "validate").length,
  );
}
