import "server-only";

import { tool } from "ai";
import { z } from "zod";

import { explainAccess } from "@/lib/assistant/explain-access";
import {
  findTopics,
  GUIDE_TOPICS,
  linksOf,
  topicFacts,
} from "@/lib/assistant/guide";
import { findNotions } from "@/lib/assistant/guide/notions";
import { loadPermissionHolders } from "@/lib/assistant/permission-holders";
import { uniqueSources } from "@/lib/assistant/sources";
import type { Access } from "@/lib/auth/access";
import { assistantGuide } from "@/lib/i18n/fr/assistant-guide";

const fr = { assistantGuide };

/**
 * PO on the app itself (docs/ASSISTANT.md § 3 quater): the guide to PDS OS
 * and the reasons behind a right. Read-only, with the viewer's session.
 */
export function guideTools(access: Access, pagePath: string | null) {
  return {
    app_guide: tool({
      description:
        "Le guide de PDS OS : à quoi sert une partie de l'application, où elle se trouve, ce qu'on y fait, qui peut y agir, et les questions fréquentes. Pour toute question sur l'application elle-même ou sur PO (« où sont les contrats ? », « comment je crée un projet ? », « mes conversations sont-elles enregistrées ? », « qu'est-ce que tu sais faire ? »).",
      inputSchema: z.object({
        topic: z
          .string()
          .max(100)
          .describe(
            "Clé d'un sujet de la carte de PDS OS (ex. contracts, po), ou quelques mots",
          ),
      }),
      execute: async ({ topic }) => {
        const found = findTopics(topic);
        if (found.length === 0)
          return {
            facts: [
              fr.assistantGuide.notFound(
                topic,
                GUIDE_TOPICS.map((t) => t.key).join(", "),
              ),
            ],
            sources: [],
            gap: "missing" as const,
          };
        const holders = await loadPermissionHolders();
        const parts = found.map((t) =>
          topicFacts(t, access, holders, pagePath),
        );
        return {
          facts: parts.flatMap((p) => p.facts),
          sources: uniqueSources(parts.flatMap((p) => p.sources)),
        };
      },
    }),

    explain_notion: tool({
      description:
        "À appeler avant d'expliquer une notion du métier de la musique (ISRC, ISWC, UPC, droits master et édition, ℗, split, SACEM, SCPP, SPPF, ADAMI, SPEDIDAM, featuring, sample, mix et mastering, distributeur, contrat d'artiste ou licence…). Renvoie l'étiquette « connaissance générale, à vérifier » et l'endroit de PDS OS où la notion se gère ; l'explication elle-même vient de tes connaissances générales.",
      inputSchema: z.object({
        notion: z
          .string()
          .max(100)
          .describe("La notion, avec les mots de l'utilisateur"),
      }),
      execute: async ({ notion }) => {
        const t = fr.assistantGuide.notion;
        const found = findNotions(notion);
        if (found.length === 0) return { facts: [t.unknown], sources: [] };
        const topics = found.flatMap((n) =>
          GUIDE_TOPICS.filter((g) => g.key === n.topic),
        );
        return {
          facts: found.flatMap((n) => [t.label(n.name), t.place(n.place)]),
          sources: uniqueSources(topics.flatMap((g) => linksOf(g, pagePath))),
        };
      },
    }),

    explain_access: tool({
      description:
        "Pourquoi l'utilisateur peut ou ne peut pas agir sur la page ouverte (sans paramètre) : son poste et ce qu'il permet, le responsable du projet et son état, l'étape faite ou verrouillée, l'état du contrat et ce qu'il y peut, et qui peut agir à sa place. Pour « pourquoi je ne peux pas modifier / valider / voir ça ? ».",
      inputSchema: z.object({}),
      execute: async () => explainAccess(access, pagePath),
    }),
  };
}
