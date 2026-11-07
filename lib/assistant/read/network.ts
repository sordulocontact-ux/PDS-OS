import "server-only";

import { tool } from "ai";
import { z } from "zod";

import { foldName, rankByName } from "@/lib/assistant/propose/match";
import {
  capped,
  readFailed,
  type ReadResult,
} from "@/lib/assistant/read/target";
import type { Source } from "@/lib/assistant/sources";
import { routes } from "@/lib/auth/redirects";
import { contracts as contractsFr } from "@/lib/i18n/fr/contracts";
import { assistantReadLegal } from "@/lib/i18n/fr/assistant-read-legal";
import { isAwaited, loadContactProjects } from "@/lib/network/contact-projects";
import { getNetworkContact, listNetworkContacts } from "@/lib/network/queries";
import {
  NETWORK_ROLES,
  rolesText,
  type NetworkContactRow,
} from "@/lib/network/types";

const fr = { assistantReadLegal, contracts: contractsFr };
const t = fr.assistantReadLegal.network;

const MAX_LISTED = 15;
// Past this many matches, no per-contact reading (projects, contracts).
const MAX_DETAILED = 3;

function contactFacts(c: NetworkContactRow): string[] {
  return [
    t.line(c.name, t.kind[c.kind], rolesText(c.roles)),
    ...(c.parentName ? [t.structure(c.parentName)] : []),
    c.email ? t.email(c.email) : t.noEmail,
    c.phone ? t.phone(c.phone) : t.noPhone,
    ...(c.city ? [t.city(c.city)] : []),
  ];
}

/** Projects and contracts of one contact, from the loaders of its page. */
async function detailFacts(id: string): Promise<string[]> {
  const [detail, projects] = await Promise.all([
    getNetworkContact(id),
    loadContactProjects(id),
  ]);
  const states: Record<string, string> = fr.contracts.states;
  return [
    ...(detail && detail.members.length > 0
      ? [t.members(detail.members.map((m) => m.name).join(", "))]
      : []),
    ...(detail?.contracts ?? []).map((k) =>
      t.contract(
        k.title,
        states[k.status] ?? k.status,
        k.role ? t.contractRole(k.role) : "",
      ),
    ),
    ...projects.flatMap((p) => {
      const awaited = p.items.filter(isAwaited).length;
      return [
        t.project(p.title, p.artist ?? ""),
        ...(awaited > 0 ? [t.awaited(p.title, awaited)] : []),
      ];
    }),
  ];
}

export function networkTool() {
  return tool({
    description:
      "Cherche dans le Réseau (contacts de l'équipe : personnes et organisations) par nom (fautes tolérées), métier ou activité, ville : nom, rôles, structure, e-mail, téléphone, ville ; pour un à trois contacts précis, aussi leurs projets et contrats. À appeler pour « qui est notre ingé son habituel ? », « le mail du manager de X ? », « on a un avocat ? ».",
    inputSchema: z.object({
      name: z.string().max(100).optional().describe("Nom, même approximatif"),
      role: z
        .enum(NETWORK_ROLES)
        .optional()
        .describe("Métier ou activité (engineer = ingé son, manager…)"),
      city: z.string().max(100).optional().describe("Ville"),
    }),
    execute: async ({ name, role, city }): Promise<ReadResult> => {
      try {
        const all = await listNetworkContacts(false);
        if (!all) return readFailed();
        let list = all;
        if (role) list = list.filter((c) => c.roles.includes(role));
        if (city?.trim()) {
          const wanted = foldName(city);
          list = list.filter((c) => foldName(c.city ?? "").includes(wanted));
        }
        if (name?.trim())
          list = rankByName(list, name, (c) => c.name).map((r) => r.item);
        if (list.length === 0) return { facts: [t.none], sources: [] };

        const shown = list.slice(0, MAX_LISTED);
        const extra =
          shown.length <= MAX_DETAILED
            ? await Promise.all(shown.map((c) => detailFacts(c.id)))
            : shown.map((): string[] => []);
        const facts = [
          t.count(list.length),
          ...capped(list.length, shown.length),
          // One fact per contact: its sentences stay together.
          ...shown.map((c, i) => [...contactFacts(c), ...extra[i]].join(" ")),
        ];
        const sources: Source[] = shown.map((c) => ({
          label: c.name,
          href: routes.networkContact(c.id),
        }));
        return { facts, sources };
      } catch {
        return readFailed();
      }
    },
  });
}
