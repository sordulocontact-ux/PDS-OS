"use server";

import { can } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { deals as dealsFr } from "@/lib/i18n/fr/deals";
import { shell } from "@/lib/i18n/fr/shell";
import { createClient } from "@/lib/supabase/server";
import { NAV_ITEMS, navItemAllowed } from "@/lib/ui/nav-items";
import { formatShortDay } from "@/lib/utils/day";
import { SEARCH_GROUPS, type SearchHit, type SearchResult } from "./types";

const PER_GROUP = 6;
const MAX_LENGTH = 80;

// One page of results per group, each read with the user's session: the
// database (RLS) decides what they see, never this code.
type Rows<T> = PromiseLike<{ data: T[] | null; error: unknown }>;

async function lookup<T>(
  query: Rows<T>,
  hit: (row: T) => SearchHit,
): Promise<{ hits: SearchHit[]; error: boolean }> {
  const { data, error } = await query;
  return { hits: (data ?? []).map(hit), error: Boolean(error) };
}

/**
 * The app's ⌘K: the pages the reader may open (nothing typed, or matching
 * the text) and, once something is typed, the records whose name matches.
 */
export async function appSearch(input: string): Promise<SearchResult> {
  const access = await requireApproved();
  const text = input.trim().slice(0, MAX_LENGTH);
  const needle = text.toLowerCase();

  const pages: SearchHit[] = NAV_ITEMS.filter(
    (item) =>
      !item.disabled &&
      (!item.adminOnly || can(access, "administer")) &&
      navItemAllowed(item, access.permissions) &&
      item.label.toLowerCase().includes(needle),
  ).map((item) => ({
    id: `page:${item.href}`,
    group: "page",
    label: item.label,
    detail: "",
    href: item.href,
  }));
  if (!text) return { hits: pages, error: false };

  const like = `%${text.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
  // Inside .or(), PostgREST reads commas, parentheses and quotes as its own
  // syntax: the value goes in double quotes, its own quotes escaped.
  const orLike = `"${like.replace(/["\\]/g, (c) => `\\${c}`)}"`;
  const db = await createClient();
  const found = await Promise.all([
    lookup(
      db
        .from("projects")
        .select("id, title")
        .ilike("title", like)
        .is("archived_at", null)
        .limit(PER_GROUP),
      (r) => ({
        id: `project:${r.id}`,
        group: "project",
        label: r.title,
        detail: "",
        href: routes.project(r.id),
      }),
    ),
    lookup(
      db
        .from("artists")
        .select("id, name")
        .ilike("name", like)
        .is("archived_at", null)
        .limit(PER_GROUP),
      (r) => ({
        id: `artist:${r.id}`,
        group: "artist",
        label: r.name,
        detail: "",
        href: routes.artist(r.id),
      }),
    ),
    lookup(
      db
        .from("masters")
        .select("id, title")
        .ilike("title", like)
        .is("archived_at", null)
        .limit(PER_GROUP),
      (r) => ({
        id: `master:${r.id}`,
        group: "master",
        label: r.title,
        detail: "",
        href: routes.master(r.id),
      }),
    ),
    lookup(
      db
        .from("network_contacts")
        .select("id, name")
        .ilike("name", like)
        .is("archived_at", null)
        .limit(PER_GROUP),
      (r) => ({
        id: `contact:${r.id}`,
        group: "contact",
        label: r.name,
        detail: "",
        href: routes.networkContact(r.id),
      }),
    ),
    lookup(
      db
        .from("contracts")
        .select("id, title")
        .ilike("title", like)
        .limit(PER_GROUP),
      (r) => ({
        id: `contract:${r.id}`,
        group: "contract",
        label: r.title,
        detail: "",
        href: routes.contract(r.id),
      }),
    ),
    lookup(
      db
        .from("deals")
        .select("id, kind, artist:artists!deals_artist_same_org!inner(name)")
        .ilike("artist.name", like)
        .limit(PER_GROUP),
      (r) => ({
        id: `deal:${r.id}`,
        group: "deal",
        label: r.artist?.name ?? dealsFr.title,
        detail: dealsFr.kinds[r.kind as keyof typeof dealsFr.kinds] ?? "",
        href: routes.deal(r.id),
      }),
    ),
    lookup(
      db
        .from("calls")
        .select("id, title")
        .ilike("title", like)
        .order("occurred_at", { ascending: false })
        .limit(PER_GROUP),
      (r) => ({
        id: `call:${r.id}`,
        group: "call",
        label: r.title,
        detail: "",
        href: routes.call(r.id),
      }),
    ),
    lookup(
      db
        .from("master_sessions")
        .select("id, studio, engineer, session_date")
        .or(`studio.ilike.${orLike},engineer.ilike.${orLike}`)
        .order("session_date", { ascending: false })
        .limit(PER_GROUP),
      (r) => ({
        id: `session:${r.id}`,
        group: "session",
        label: r.studio || r.engineer || shell.appSearch.session,
        detail: r.session_date ? formatShortDay(r.session_date) : "",
        href: routes.session(r.id),
      }),
    ),
  ]);

  const all = [pages.slice(0, PER_GROUP), ...found.map((f) => f.hits)].flat();
  const hits = SEARCH_GROUPS.flatMap((g) => all.filter((h) => h.group === g));
  return { hits, error: found.some((f) => f.error) };
}
