import "server-only";

import { tool } from "ai";
import { z } from "zod";

import { foldName, rankByName } from "@/lib/assistant/fuzzy-name";
import { readFailed, type ReadResult } from "@/lib/assistant/read/target";
import type { Source } from "@/lib/assistant/sources";
import { routes } from "@/lib/auth/redirects";
import { listMasters } from "@/lib/catalog/queries";
import { masterLabel } from "@/lib/catalog/types";
import { listContracts } from "@/lib/contracts/queries";
import { assistantRead } from "@/lib/i18n/fr/assistant-read";
import { listTemplates } from "@/lib/legal/contracts/templates";
import { listNetworkContacts } from "@/lib/network/queries";
import { listProjects } from "@/lib/projects/queries";
import { createClient } from "@/lib/supabase/server";

const fr = { assistantRead };

type Kind = keyof typeof assistantRead.search.kinds;
type Hit = { kind: Kind; name: string; place: string; href: string };

const PER_KIND = 3;
const MAX_HITS = 12;

/** Names containing the words first, then names that sound like them. */
function best<T>(items: readonly T[], query: string, key: (item: T) => string) {
  const wanted = foldName(query);
  const contains = items.filter((item) => foldName(key(item)).includes(wanted));
  const sounds = rankByName(items, query, key)
    .map((r) => r.item)
    .filter((item) => !contains.includes(item));
  return [...contains, ...sounds].slice(0, PER_KIND);
}

/** Every kind of record the viewer may see, read with their session. */
async function hitsFor(query: string): Promise<Hit[]> {
  const t = fr.assistantRead.search;
  const supabase = await createClient();
  const [projects, artists, masters, contracts, contacts, templates, calls] =
    await Promise.all([
      listProjects().then((r) => r.projects),
      supabase
        .from("artists")
        .select("id, name")
        .is("archived_at", null)
        .then((r) => r.data ?? []),
      listMasters().then((r) => r.masters),
      listContracts().then((r) => r ?? []),
      listNetworkContacts(false).then((r) => r ?? []),
      listTemplates(),
      supabase
        .from("calls")
        .select("id, title, project_id")
        .order("occurred_at", { ascending: false })
        .limit(300)
        .then((r) => r.data ?? []),
    ]);
  return [
    ...best(projects, query, (p) => p.title).map((p) => ({
      kind: "project" as const,
      name: p.title,
      place: t.places.project(p.title),
      href: routes.project(p.id),
    })),
    ...best(artists, query, (a) => a.name).map((a) => ({
      kind: "artist" as const,
      name: a.name,
      place: t.places.artist(a.name),
      href: routes.artist(a.id),
    })),
    ...best(masters, query, masterLabel).map((m) => ({
      kind: "master" as const,
      name: masterLabel(m),
      place: t.places.master(masterLabel(m), m.artists),
      href: routes.master(m.id),
    })),
    ...best(
      contracts,
      query,
      (c) => `${c.title} ${c.projectTitle ?? ""} ${c.artistName ?? ""}`,
    ).map((c) => ({
      kind: "contract" as const,
      name: c.title,
      place: t.places.contract(c.title, c.projectTitle),
      href: routes.contract(c.id),
    })),
    ...best(contacts, query, (c) => c.name).map((c) => ({
      kind: "contact" as const,
      name: c.name,
      place: t.places.contact(c.name),
      href: routes.networkContact(c.id),
    })),
    ...best(templates, query, (m) => m.name).map((m) => ({
      kind: "template" as const,
      name: m.name,
      place: t.places.template(m.name),
      href: routes.contractTemplate(m.seriesId),
    })),
    ...best(calls, query, (c) => c.title).map((c) => ({
      kind: "call" as const,
      name: c.title,
      place: t.places.call(c.title),
      href: c.project_id
        ? routes.projectCall(c.project_id, c.id)
        : routes.call(c.id),
    })),
  ];
}

/**
 * search_everything (audit of PO § 2.4): « where is… ? » across projects,
 * artists, titles, contracts, contract templates, the Réseau and calls,
 * with the viewer's session. Each hit says where it lives and links there.
 */
export function searchEverythingTool() {
  return tool({
    description:
      "Cherche un nom dans toute l'application (projets, artistes, titres, contrats, modèles de contrat, contacts du Réseau, calls et réunions) et dit où se trouve chaque résultat, avec son lien. Pour « où est… ? », « où je trouve… ? », « emmène-moi à… », ou quand tu ne sais pas de quel type est un nom. Les fichiers se cherchent avec files.",
    inputSchema: z.object({
      query: z
        .string()
        .min(2)
        .max(100)
        .describe("Le nom cherché, même approximatif (sans « contrat de »)"),
    }),
    execute: async ({ query }): Promise<ReadResult> => {
      const t = fr.assistantRead.search;
      const hits = await hitsFor(query).catch((error: unknown) => {
        console.error("search_everything:", error);
        return null;
      });
      if (!hits) return readFailed();
      if (hits.length === 0)
        return { facts: [t.nothing(query)], sources: [], gap: "missing" };
      const shown = hits.slice(0, MAX_HITS);
      return {
        facts: [
          ...shown.map((h) => t.hit(t.kinds[h.kind], h.place)),
          ...(hits.length > shown.length
            ? [fr.assistantRead.capped(shown.length, hits.length)]
            : []),
        ],
        sources: shown.map((h): Source => ({ label: h.place, href: h.href })),
      };
    },
  });
}
