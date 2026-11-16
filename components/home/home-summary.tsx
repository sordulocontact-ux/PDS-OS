import { ViewLink } from "@/components/ui/view-link";
import { can, type Access } from "@/lib/auth/access";
import { routes } from "@/lib/auth/redirects";
import { loadHomeFeed } from "@/lib/home/feed";
import { shell } from "@/lib/i18n/fr/shell";
import { createClient } from "@/lib/supabase/server";

const fr = { shell };

/** How many urgent Finance alerts wait (finance_urgent_count, UX test of
 * 15/11/2026): 0 for whoever does not read Finance, or when it fails. */
async function financeUrgent(access: Access): Promise<number> {
  if (!can(access, "read_finance")) return 0;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("finance_urgent_count");
  if (error) console.error("financeUrgent:", error.message);
  return typeof data === "number" ? data : 0;
}

/** Under the greeting: how many moves wait for the viewer, decisions
 * counted apart (« 3 actions vous attendent, dont une à valider »), then,
 * for whoever reads Finance, its urgent alerts as a link. The same read as
 * the feed below (cached per request). */
export async function HomeSummary({ access }: { access: Access }) {
  const [{ lead, also }, urgent] = await Promise.all([
    loadHomeFeed(access),
    financeUrgent(access),
  ]);
  const mine = lead ? [lead, ...also] : also;
  const text = fr.shell.home.summary(
    mine.length,
    mine.filter((row) => row.kind === "validate").length,
  );
  if (urgent === 0) return text;
  const alerts = (
    <ViewLink
      href={routes.financeAlerts}
      className="text-[color:var(--tone-danger-fg)] underline underline-offset-4"
    >
      {fr.shell.home.financeUrgent(urgent, mine.length === 0)}
    </ViewLink>
  );
  // Nothing else waits: the alerts alone, never « Rien ne vous attend ».
  if (mine.length === 0) return alerts;
  return (
    <>
      {text} · {alerts}
    </>
  );
}
