import "server-only";

import { tool } from "ai";
import { z } from "zod";

import { formatDay } from "@/lib/assistant/facts";
import { foldName } from "@/lib/assistant/fuzzy-name";
import {
  capped,
  readFailed,
  type ReadResult,
} from "@/lib/assistant/read/target";
import { routes } from "@/lib/auth/redirects";
import { assistantReadPilot } from "@/lib/i18n/fr/assistant-read-pilot";
import {
  LIBRARY_SOURCES,
  listLibraryFiles,
  type LibraryFile,
} from "@/lib/library/queries";

const fr = { assistantReadPilot };
const MAX_FILES = 15;

type Filters = {
  query?: string;
  owner?: string;
  category?: string;
  source?: (typeof LIBRARY_SOURCES)[number];
};

const has = (text: string, wanted?: string) =>
  !wanted || foldName(text).includes(foldName(wanted));

/** The /app/files library, filtered by words the code compares itself. */
export async function readFiles(f: Filters): Promise<ReadResult> {
  const t = fr.assistantReadPilot.files;
  const library = await listLibraryFiles();
  if (library.error) return readFailed();
  const matching = library.files.filter(
    (file: LibraryFile) =>
      (!f.source || file.source === f.source) &&
      has(file.ownerLabel, f.owner) &&
      has(file.categoryLabel, f.category) &&
      (!f.query ||
        has(
          `${file.fileName} ${file.description ?? ""} ${file.ownerLabel}`,
          f.query,
        )),
  );
  const shown = matching.slice(0, MAX_FILES);
  return {
    facts: [
      shown.length === 0 ? t.empty : t.count(shown.length, matching.length),
      ...shown.map((file) =>
        t.line(
          file.fileName,
          file.categoryLabel,
          `${t.sources[file.source]} ${file.ownerLabel}`,
          file.version,
          file.versionCount,
          formatDay(file.createdAt),
        ),
      ),
      ...capped(matching.length, MAX_FILES),
      ...(library.truncated ? [t.truncated] : []),
    ],
    sources: [
      ...shown.map((file) => ({
        label: `${file.ownerLabel} · Fichiers`,
        href: file.ownerHref,
      })),
      { label: "Fichiers", href: routes.files },
    ],
  };
}

export function filesTool() {
  return tool({
    description:
      "Cherche dans la bibliothèque de fichiers de l'application (page Fichiers) : nom, catégorie, rattachement (artiste, titre, projet ou contrat), version, date, et le lien vers l'onglet Fichiers de la fiche concernée. À appeler pour « les stems de Néons ? », « le dernier export du moodboard ? ». Les fichiers sont déjà classés du plus récent au plus ancien.",
    inputSchema: z.object({
      query: z
        .string()
        .max(100)
        .optional()
        .describe("Mot du nom ou de la description du fichier"),
      owner: z
        .string()
        .max(100)
        .optional()
        .describe(
          "Nom de l'artiste, du titre, du projet ou du contrat de rattachement",
        ),
      category: z
        .string()
        .max(60)
        .optional()
        .describe("Catégorie, par ex. stems, moodboard, pochette"),
      source: z
        .enum(LIBRARY_SOURCES)
        .optional()
        .describe("artist, master (titre), project ou contract"),
    }),
    execute: async (input) => {
      try {
        return await readFiles(input);
      } catch (error) {
        console.error("readFiles:", error);
        return readFailed();
      }
    },
  });
}
