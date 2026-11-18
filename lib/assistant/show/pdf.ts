import "server-only";

import { tool } from "ai";
import { z } from "zod";

import { modelOutput } from "@/lib/assistant/show/model-output";

import type { FileDisplay } from "@/lib/assistant/display";
import { foldName, matchByName } from "@/lib/assistant/propose/match";
import {
  isReadResult,
  readFailed,
  targetProject,
  type ReadResult,
} from "@/lib/assistant/read/target";
import { listContracts } from "@/lib/contracts/queries";
import { assistantShow } from "@/lib/i18n/fr/assistant-show";
import { pdfFileName } from "@/lib/pdf/text-document";
import { createClient } from "@/lib/supabase/server";

const t = assistantShow.files;

const DOCUMENTS = [
  "texte",
  "master_brief",
  "distribution_dossier",
  "call_report",
  "contract",
] as const;
type Document = (typeof DOCUMENTS)[number];

// Each printed by its own route, with the viewer's session (RLS): the same
// PDF as the page's « Exporter en PDF ».
const ROUTES: Record<Exclude<Document, "texte">, (id: string) => string> = {
  master_brief: (id) => `/api/projects/${id}/master-brief`,
  distribution_dossier: (id) => `/api/projects/${id}/distribution-dossier`,
  call_report: (id) => `/api/calls/${id}/report`,
  contract: (id) => `/api/contracts/${id}/document`,
};

const shown = (
  display: FileDisplay,
): ReadResult & { display: FileDisplay } => ({
  facts: [t.ready(display.label)],
  sources: [],
  display,
});

const fileOf = (
  document: Exclude<Document, "texte">,
  id: string,
  name: string,
): FileDisplay => {
  const label = `${t.documents[document]} · ${name}`;
  return {
    kind: "file",
    format: "pdf",
    label,
    detail: t.pdfDetail,
    fileName: pdfFileName(label),
    href: ROUTES[document](id),
  };
};

/** The call of a project whose report was closed, by title or the latest. */
async function reportedCall(
  projectId: string,
  call: string | undefined,
): Promise<{ id: string; title: string } | null> {
  const supabase = await createClient();
  const { data: calls } = await supabase
    .from("calls")
    .select("id, title, occurred_at")
    .eq("project_id", projectId)
    .order("occurred_at", { ascending: false });
  const ids = (calls ?? []).map((c) => c.id);
  if (ids.length === 0) return null;
  const { data: closures } = await supabase
    .from("call_closures")
    .select("call_id")
    .in("call_id", ids);
  const closed = new Set((closures ?? []).map((c) => c.call_id));
  const reported = (calls ?? []).filter((c) => closed.has(c.id));
  if (!call?.trim()) return reported[0] ?? null;
  return matchByName(reported, call, (c) => c.title) ?? null;
}

/**
 * « Mets ça en PDF », « envoie-moi le Brief Mix en PDF » (wave 1, docs/
 * ASSISTANT.md § 3 sexies). A document of the app is printed by its own
 * route; any other text (a mail, a note, a summary PO just wrote) is laid
 * out by lib/pdf/text-document.ts. Nothing is printed here: the answer
 * shows a card whose « Télécharger » asks for the file.
 */
export function makePdfTool(pagePath: string | null) {
  return tool({
    description:
      "Prépare un PDF à télécharger sous la réponse. document = « texte » pour mettre en PDF un texte (un mail, une note, un résumé, une réponse que tu viens d'écrire, un texte collé par l'utilisateur) : donne title et body, le texte complet, en Markdown simple (# titres, listes « - », tableaux « | », **gras**) ; recopie les chiffres et les dates tels qu'ils figurent dans la conversation, n'en invente aucun. Sinon un document de l'application : master_brief = Brief Mix/Master d'un projet, distribution_dossier = dossier de distribution d'un projet, call_report = compte rendu d'un call d'un projet (le plus récent, ou celui nommé dans call), contract = un contrat (nommé dans contract).",
    inputSchema: z.object({
      document: z.enum(DOCUMENTS),
      title: z
        .string()
        .max(160)
        .optional()
        .describe("Pour texte : le titre du document"),
      body: z
        .string()
        .max(30000)
        .optional()
        .describe("Pour texte : le texte complet à mettre en page"),
      project: z
        .string()
        .max(100)
        .optional()
        .describe(
          "Pour master_brief, distribution_dossier, call_report : nom du projet ; absent = projet de la page ouverte",
        ),
      call: z
        .string()
        .max(100)
        .optional()
        .describe("Pour call_report : titre du call ; absent = le plus récent"),
      contract: z
        .string()
        .max(100)
        .optional()
        .describe("Pour contract : titre du contrat ou nom d'une partie"),
    }),
    toModelOutput: modelOutput,
    execute: async (input): Promise<ReadResult> => {
      try {
        if (input.document === "texte") {
          const title = input.title?.trim() || t.textTitle;
          const body = input.body?.trim() ?? "";
          if (!body) return { facts: [t.emptyText], sources: [] };
          return shown({
            kind: "file",
            format: "pdf",
            label: title,
            detail: t.pdfDetail,
            fileName: pdfFileName(title),
            href: "/api/assistant/pdf",
            text: { title, body },
          });
        }
        if (input.document === "contract") {
          const rows = await listContracts();
          if (!rows) return readFailed();
          const wanted = input.contract?.trim();
          if (!wanted) return { facts: [t.noContract], sources: [] };
          const found =
            matchByName(rows, wanted, (c) => c.title) ??
            rows.find((c) =>
              foldName([c.title, ...c.parties].join(" ")).includes(
                foldName(wanted),
              ),
            );
          if (!found)
            return {
              facts: [assistantShow.charts.notFound(wanted)],
              sources: [],
              gap: "missing",
            };
          return shown(fileOf("contract", found.id, found.title));
        }
        const target = await targetProject(input.project, pagePath);
        if (isReadResult(target)) return target;
        const { project } = target;
        if (input.document === "call_report") {
          const call = await reportedCall(project.id, input.call);
          if (!call) return { facts: [t.noCall], sources: [], gap: "missing" };
          return shown(
            fileOf("call_report", call.id, `${call.title} · ${project.title}`),
          );
        }
        return shown(fileOf(input.document, project.id, project.title));
      } catch (error) {
        console.error("make_pdf:", error);
        return readFailed();
      }
    },
  });
}
