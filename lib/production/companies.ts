import "server-only";

import { fr } from "@/lib/i18n/fr";
import type { NetworkOption } from "@/lib/production/sheet";
import { createClient } from "@/lib/supabase/server";

const t = fr.productionProducer.company;

/** A production company of the Réseau, with why it fits (computed by
 * code from what PDS already produced with it, else its own note). */
export type CompanyOption = {
  id: string;
  name: string;
  reason: string;
  // Proposed by PO: it produced for the same artist, else the most.
  suggested: boolean;
};

const firstSentence = (text: string) => {
  const line = text.split(/\n/)[0].trim();
  const cut = line.split(/(?<=[.!?])\s/)[0];
  return cut.length > 90 ? `${cut.slice(0, 89)}…` : cut;
};

/**
 * « Quelle société ? » (proto companyField): the Réseau's production
 * companies, the one proposed first with its reason — it already produced
 * for this artist, else it produced the most for PDS —, then the others by
 * what PDS did with them. Read with the user's session; never a guess.
 */
export async function companyOptions(
  projectId: string,
  contacts: NetworkOption[],
  current: string | null,
): Promise<CompanyOption[]> {
  const companies = contacts.filter(
    (c) => c.roles.includes("production_company") || c.id === current,
  );
  if (companies.length === 0) return [];
  const ids = companies.map((c) => c.id);
  const supabase = await createClient();
  const [project, sheets, notes] = await Promise.all([
    supabase
      .from("projects")
      .select("artist_id")
      .eq("id", projectId)
      .maybeSingle(),
    supabase
      .from("production_sheets")
      .select(
        "company_contact_id, project_id, opened_at, strategy_deliverables(title), projects(artist_id, artists(name))",
      )
      .in("company_contact_id", ids)
      .neq("project_id", projectId)
      .order("opened_at", { ascending: false }),
    supabase.from("network_contacts").select("id, notes").in("id", ids),
  ]);
  if (sheets.error) console.error("companyOptions:", sheets.error.message);
  const artistId = project.data?.artist_id ?? null;
  const done = sheets.data ?? [];
  const noteOf = new Map((notes.data ?? []).map((n) => [n.id, n.notes]));

  const rows = companies.map((c) => {
    const mine = done.filter((s) => s.company_contact_id === c.id);
    const sameArtist = artistId
      ? mine.find((s) => s.projects?.artist_id === artistId)
      : undefined;
    const note = noteOf.get(c.id) ?? null;
    const reason = sameArtist
      ? t.reasons.artist(
          sameArtist.strategy_deliverables?.title ?? "—",
          sameArtist.projects?.artists?.name ?? "—",
        )
      : mine.length > 0
        ? t.reasons.count(mine.length)
        : note
          ? firstSentence(note)
          : t.reasons.never;
    return {
      id: c.id,
      name: c.name,
      reason: t.network(reason),
      count: mine.length,
      sameArtist: Boolean(sameArtist),
    };
  });
  const best =
    rows.find((r) => r.sameArtist) ??
    [...rows].sort((a, b) => b.count - a.count).find((r) => r.count > 0) ??
    null;
  return rows
    .sort(
      (a, b) =>
        Number(b === best) - Number(a === best) ||
        b.count - a.count ||
        a.name.localeCompare(b.name, "fr"),
    )
    .map(({ id, name, reason }) => ({
      id,
      name,
      reason,
      suggested: best?.id === id,
    }));
}
