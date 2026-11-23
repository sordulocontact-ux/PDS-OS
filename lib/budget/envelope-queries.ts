import "server-only";

import {
  envelopeView,
  usageOf,
  type ArtistEnvelope,
  type EnvelopeView,
} from "@/lib/budget/envelope";
import { selectBudgetLines, toBudgetLines } from "@/lib/budget/rows";
import {
  isBudgetFamily,
  type BudgetFamily,
  type BudgetLine,
} from "@/lib/budget/types";
import { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export type ArtistBudgetData = {
  error: boolean;
  current: (ArtistEnvelope & { view: EnvelopeView }) | null;
  // Closed envelopes, newest first, each with what it consumed.
  closed: (ArtistEnvelope & { spentCents: number })[];
  // The artist's direct spends and the lines of its projects the reader may
  // read (a project's own rule), newest first.
  lines: BudgetLine[];
};

async function usage(supabase: Supabase, budgetId: string) {
  const { data, error } = await supabase.rpc("artist_budget_usage", {
    p_budget_id: budgetId,
  });
  if (error) console.error("artist_budget_usage:", error.message);
  return (data ?? []).map(usageOf);
}

/**
 * Everything of an artist's Budget tab (BUD 2), read with the user's
 * session: RLS and the functions give it to whoever reads the artists'
 * budgets only.
 */
export async function loadArtistBudget(
  artistId: string,
): Promise<ArtistBudgetData> {
  const supabase = await createClient();
  const [envelopesRes, directRes, projectsRes] = await Promise.all([
    supabase
      .from("artist_budgets")
      .select(
        "id, amount_cents, starts_on, ends_on, closed_at, posts:artist_budget_posts(family, amount_cents)",
      )
      .eq("artist_id", artistId)
      .order("starts_on", { ascending: false }),
    selectBudgetLines(supabase).eq("artist_id", artistId),
    supabase.rpc("artist_project_ids", { p_artist_id: artistId }),
  ]);
  const projectIds = projectsRes.data ?? [];
  const projectRes = projectIds.length
    ? await selectBudgetLines(supabase).in("project_id", projectIds)
    : { data: [], error: null };
  const error = [envelopesRes, directRes, projectRes].find(
    (r) => r.error,
  )?.error;
  if (error) console.error("loadArtistBudget:", error.message);

  const envelopes = (envelopesRes.data ?? []).map((row): ArtistEnvelope => ({
    id: row.id,
    amountCents: row.amount_cents,
    startsOn: row.starts_on,
    endsOn: row.ends_on,
    closedAt: row.closed_at,
    posts: Object.fromEntries(
      row.posts.flatMap((p) =>
        isBudgetFamily(p.family) ? [[p.family, p.amount_cents]] : [],
      ),
    ) as Partial<Record<BudgetFamily, number>>,
  }));
  const open = envelopes.find((e) => e.closedAt === null) ?? null;
  const closed = envelopes.filter((e) => e.closedAt !== null);
  const [openUsage, ...closedUsage] = await Promise.all([
    open ? usage(supabase, open.id) : Promise.resolve([]),
    ...closed.map((e) => usage(supabase, e.id)),
  ]);
  const lines = await toBudgetLines(supabase, [
    ...(directRes.data ?? []),
    ...(projectRes.data ?? []),
  ]);
  lines.sort((a, b) => b.spentOn.localeCompare(a.spentOn));

  return {
    error: Boolean(error),
    current: open ? { ...open, view: envelopeView(open, openUsage) } : null,
    closed: closed.map((e, i) => ({
      ...e,
      spentCents: closedUsage[i].reduce((t, u) => t + u.spentCents, 0),
    })),
    lines,
  };
}

/** The part of its artist's open envelope a project takes (its Budget). */
export type ProjectEnvelopeShare = {
  artistId: string;
  artistName: string;
  amountCents: number;
  projectSpentCents: number;
  totalSpentCents: number;
};

export async function loadProjectEnvelopeShare(
  projectId: string,
): Promise<ProjectEnvelopeShare | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("project_artist_budget_share", { p_project_id: projectId })
    .maybeSingle();
  if (error) console.error("project_artist_budget_share:", error.message);
  return data
    ? {
        artistId: data.artist_id,
        artistName: data.artist_name,
        amountCents: data.amount_cents,
        projectSpentCents: data.project_spent_cents,
        totalSpentCents: data.total_spent_cents,
      }
    : null;
}

/** The artist a Dépenses filter names (artist names are unique in the
 * organization), for its envelope above the list; null when unknown. */
export async function artistIdByName(name: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("artists")
    .select("id")
    .eq("name", name)
    .is("archived_at", null)
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}
