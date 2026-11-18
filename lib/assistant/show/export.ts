import "server-only";

import { tool } from "ai";
import { z } from "zod";

import { modelOutput } from "@/lib/assistant/show/model-output";

import {
  EXPORT_LISTS,
  listCsv,
  mayExport,
} from "@/lib/assistant/exports/lists";
import { readFailed, type ReadResult } from "@/lib/assistant/read/target";
import type { Access } from "@/lib/auth/access";
import { assistantShow } from "@/lib/i18n/fr/assistant-show";
import { parisPlace } from "@/lib/utils/calendar-period";
import { csvFileName } from "@/lib/utils/csv";

const t = assistantShow.files;

/**
 * « Exporte tous les titres », « je veux la liste des contacts en Excel »
 * (wave 1, docs/ASSISTANT.md § 3 sexies): a CSV of a whole list, which
 * Excel and Numbers open. The list is read now to count its lines; the
 * file itself is made again by /api/assistant/export when « Télécharger »
 * is pressed, with the same session.
 */
export function exportListTool(access: Access) {
  return tool({
    description:
      "Prépare un fichier CSV (s'ouvre dans Excel ou Numbers) d'une liste entière, à télécharger sous la réponse : titres = titres du catalogue (artistes, état audio, ISRC, durée) ; artistes ; projets (type, étape actuelle, responsable, échéance) ; contacts = Réseau ; contrats ; fichiers = bibliothèque ; et pour la Finance (direction et Finance seulement) depenses, factures, encaissements, banque, historique. À appeler pour « exporte… », « la liste de… en Excel / CSV / tableur », « télécharger tous les… ».",
    inputSchema: z.object({ list: z.enum(EXPORT_LISTS) }),
    toModelOutput: modelOutput,
    execute: async ({ list }): Promise<ReadResult> => {
      if (!mayExport(access, list)) return { facts: [t.hidden], sources: [] };
      try {
        const today = parisPlace(new Date()).day;
        const made = await listCsv(list, today);
        if (!made) return readFailed();
        if (made.count === 0)
          return { facts: [t.csvEmpty], sources: [], gap: "missing" };
        const label = t.lists[list];
        return {
          facts: [t.ready(label)],
          sources: [],
          display: {
            kind: "file",
            format: "csv",
            label,
            detail: t.csvDetail(made.count),
            fileName: csvFileName(label, today),
            href: `/api/assistant/export?list=${list}`,
          },
        };
      } catch (error) {
        console.error("export_list:", error);
        return readFailed();
      }
    },
  });
}
