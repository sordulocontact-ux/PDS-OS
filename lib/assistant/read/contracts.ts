import "server-only";

import { tool } from "ai";
import { z } from "zod";

import { formatDay } from "@/lib/assistant/facts";
import { pageRecord } from "@/lib/assistant/page-context";
import { foldName, matchByName } from "@/lib/assistant/propose/match";
import {
  capped,
  isReadResult,
  projectSource,
  readFailed,
  targetProject,
  type ReadResult,
} from "@/lib/assistant/read/target";
import type { Source } from "@/lib/assistant/sources";
import { routes } from "@/lib/auth/redirects";
import type { Access } from "@/lib/auth/access";
import { getContract, listContracts } from "@/lib/contracts/queries";
import type { ContractDetail, ContractRow } from "@/lib/contracts/types";
import { contracts as contractsFr } from "@/lib/i18n/fr/contracts";
import { assistantReadLegal } from "@/lib/i18n/fr/assistant-read-legal";

const fr = { assistantReadLegal, contracts: contractsFr };
const t = fr.assistantReadLegal.contracts;

// Detailed contracts are read one by one (their rights): keep it short.
const MAX_DETAILED = 12;

const STATES = [
  "draft",
  "in_review",
  "approved",
  "sent",
  "signed",
  "expired",
  "terminated",
  "to_sign",
] as const;

/** The contract's facts, written by code from the page's own loader. */
function contractFacts(row: ContractRow, detail: ContractDetail | null) {
  const state = fr.contracts.states[row.state];
  const facts = [
    t.line(row.title, fr.contracts.types[row.type], state),
    t.owner(row.ownerName || "—"),
  ];
  const parties = detail
    ? detail.partyList.map((p) => (p.role ? `${p.name} (${p.role})` : p.name))
    : row.parties;
  facts.push(parties.length > 0 ? t.parties(parties.join(", ")) : t.noParty);
  if (row.projectTitle) facts.push(t.project(row.projectTitle));
  if (row.artistName) facts.push(t.artist(row.artistName));
  if (row.dueOn) facts.push(t.due(formatDay(row.dueOn), row.due));
  if (row.endsOn) facts.push(t.ends(formatDay(row.endsOn)));
  if (detail?.signedOn) facts.push(t.signedOn(formatDay(detail.signedOn)));
  if (detail?.reviewerName) facts.push(t.reviewer(detail.reviewerName));
  if (detail) {
    const actions = Object.entries(detail.can)
      .filter(([, allowed]) => allowed)
      .map(([key]) => t.actions[key])
      .filter(Boolean);
    facts.push(actions.length > 0 ? t.youCan(actions.join(", ")) : t.youCannot);
  }
  return facts;
}

export function contractsTool(access: Access, pagePath: string | null) {
  return tool({
    description:
      "Lit les contrats visibles : titre, type, état, responsable, parties, projet, artiste, échéance (dépassée ou non, calculé par l'application) et ce que l'utilisateur peut y faire. À appeler pour « quels contrats attendent une signature ? », « le contrat de Nova est à quel statut ? », « qui est responsable de ce contrat ? ». Tous les filtres sont facultatifs.",
    inputSchema: z.object({
      project: z.string().max(100).optional().describe("Nom du projet"),
      onOpenProject: z
        .boolean()
        .optional()
        .describe(
          "true pour limiter aux contrats du projet de la page ouverte",
        ),
      artist: z.string().max(100).optional().describe("Nom de l'artiste"),
      query: z
        .string()
        .max(100)
        .optional()
        .describe("Mot du titre du contrat ou nom d'une partie"),
      state: z
        .enum(STATES)
        .optional()
        .describe(
          "État : draft = en préparation, in_review = à valider, approved = validé à signer, sent = envoyé, signed, expired, terminated ; to_sign = validé ou envoyé, en attente de signature",
        ),
    }),
    execute: async (input): Promise<ReadResult> => {
      const rows = await listContracts();
      if (!rows) return { facts: [t.unreadable], sources: [] };
      const notes: string[] = [];
      let list = rows;

      const wantsProject =
        input.project?.trim() ||
        (input.onOpenProject && pageRecord(pagePath)?.kind === "project");
      let source: Source | null = null;
      if (wantsProject) {
        const target = await targetProject(input.project, pagePath);
        if (isReadResult(target)) return target;
        notes.push(...target.notes);
        source = projectSource(target.project);
        list = list.filter((c) => c.projectTitle === target.project.title);
      }
      if (input.artist?.trim()) {
        const names = [...new Set(rows.flatMap((c) => c.artistName ?? []))];
        const name = matchByName(names, input.artist, (n) => n);
        if (!name)
          return {
            facts: [t.artistNotFound(input.artist.trim())],
            sources: [],
          };
        list = list.filter((c) => c.artistName === name);
      }
      if (input.query?.trim()) {
        const wanted = foldName(input.query);
        list = list.filter((c) =>
          foldName([c.title, ...c.parties].join(" ")).includes(wanted),
        );
      }
      if (input.state)
        list = list.filter((c) =>
          input.state === "to_sign"
            ? c.state === "approved" || c.state === "sent"
            : c.state === input.state,
        );
      if (list.length === 0) return { facts: [...notes, t.none], sources: [] };

      const shown = list.slice(0, MAX_DETAILED);
      const details = await Promise.all(
        shown.map((c) => getContract(c.id, access).catch(() => null)),
      );
      if (details.every((d) => d === null) && shown.length > 0)
        return readFailed();
      return {
        facts: [
          ...notes,
          t.count(list.length),
          ...capped(list.length, shown.length),
          // One fact per contract: its sentences stay together.
          ...shown.map((c, i) => contractFacts(c, details[i]).join(" ")),
        ],
        sources: [
          ...(source ? [source] : []),
          ...shown.map((c) => ({
            label: c.title,
            href: routes.contract(c.id),
          })),
        ],
      };
    },
  });
}
