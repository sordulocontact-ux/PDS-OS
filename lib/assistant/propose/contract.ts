import "server-only";

import { tool } from "ai";
import { z } from "zod";

import type { ContractDraft } from "@/lib/assistant/draft-records";
import type { DraftChange } from "@/lib/assistant/drafts";
import { formatDay } from "@/lib/assistant/facts";
import { change, findNamed } from "@/lib/assistant/propose/match";
import {
  proposalResult,
  type ProposeContext,
} from "@/lib/assistant/propose/result";
import { parseSaidDate } from "@/lib/assistant/verbatim";
import { can } from "@/lib/auth/access";
import { routes } from "@/lib/auth/redirects";
import {
  getContract,
  listContracts,
  loadContractFormOptions,
} from "@/lib/contracts/queries";
import { CONTRACT_TYPES } from "@/lib/contracts/types";
import { fr } from "@/lib/i18n/fr";

const said = (what: string) =>
  z
    .string()
    .max(40)
    .optional()
    .describe(
      `${what}, recopiée exactement telle que l'utilisateur l'a écrite`,
    );

/**
 * propose_contract (manage_contracts): a contract created or edited, in the
 * contract form. Its status only moves through its page (advance_contract):
 * PO never submits, validates, sends or signs.
 */
export function proposeContractTool({ access, verbatim }: ProposeContext) {
  return tool({
    description:
      "Prépare la création d'un contrat (module Contrats), ou la modification d'un contrat existant : titre, type, responsable, projet, artiste, échéance, dates de début et de fin, notes. Ne change jamais son statut (soumettre, valider, envoyer, signer se font sur sa page). N'enregistre RIEN : l'utilisateur relit le formulaire pré-rempli et enregistre lui-même.",
    inputSchema: z.object({
      existingContract: z
        .string()
        .max(200)
        .optional()
        .describe(
          "Titre du contrat existant à modifier ; absent pour en créer un",
        ),
      title: z.string().max(200).optional(),
      type: z.enum(CONTRACT_TYPES).optional(),
      owner: z
        .string()
        .max(100)
        .optional()
        .describe("Nom de la personne qui suit le contrat"),
      project: z
        .string()
        .max(200)
        .optional()
        .describe("Titre du projet concerné"),
      artist: z.string().max(200).optional().describe("Artiste concerné"),
      dueOn: said("Échéance avec l'année"),
      startsOn: said("Date de début avec l'année"),
      endsOn: said("Date de fin avec l'année"),
      notes: z.string().max(4000).optional(),
    }),
    execute: async (input) => {
      const t = fr.assistantRecords;
      if (!access.organizationId || !can(access, "manage_contracts"))
        return { facts: [t.forbiddenContracts], sources: [] };

      const labels = fr.contracts.form;
      const warnings: string[] = [];
      const options = await loadContractFormOptions(access);
      let current = null;
      if (input.existingContract) {
        const found = findNamed(
          (await listContracts()) ?? [],
          input.existingContract,
          (c) => c.title,
          warnings,
        );
        current = found ? await getContract(found.id, access) : null;
        if (!current)
          return {
            facts: [
              fr.assistant.drafts.notFound(
                t.what.contract,
                input.existingContract,
              ),
            ],
            sources: [],
          };
        if (!current.can.edit)
          return {
            facts: [t.contractLocked(current.title)],
            sources: [
              { label: current.title, href: routes.contract(current.id) },
            ],
          };
      }

      const pick = <T>(
        items: readonly T[],
        name: string | undefined,
        key: (item: T) => string,
        unknown: (name: string) => string,
      ): T | null => {
        if (!name) return null;
        const found = findNamed(items, name, key, warnings);
        if (!found) warnings.push(unknown(name));
        return found;
      };
      const owner = pick(
        options.owners,
        input.owner,
        (o) => o.name,
        t.unknownMember,
      );
      const project = pick(
        options.projects,
        input.project,
        (p) => p.title,
        t.unknownProject,
      );
      const artist = pick(
        options.artists,
        input.artist,
        (a) => a.name,
        fr.assistant.drafts.unknownArtist,
      );

      const date = (value: string | undefined, label: string) => {
        const quote = verbatim.quote(value);
        const parsed = quote ? parseSaidDate(quote) : null;
        if (value && !parsed) warnings.push(fr.assistant.drafts.notSaid(label));
        return parsed;
      };
      const dueOn = date(input.dueOn, labels.dueOn);
      const startsOn = date(input.startsOn, labels.startsOn);
      const endsOn = date(input.endsOn, labels.endsOn);

      const values: ContractDraft["values"] = {
        title: input.title?.trim() || current?.title || "",
        type: input.type ?? current?.type ?? "artist",
        ownerPersonId: owner?.personId ?? current?.ownerPersonId ?? null,
        projectId: project?.id ?? current?.projectId ?? null,
        artistId: artist?.id ?? current?.artistId ?? null,
        dueOn: dueOn ?? current?.dueOn ?? null,
        startsOn: startsOn ?? current?.startsOn ?? null,
        endsOn: endsOn ?? current?.endsOn ?? null,
        notes: input.notes?.trim() || current?.notes || null,
      };

      const changes: DraftChange[] = [];
      const day = (value: string | null | undefined) =>
        value ? formatDay(value) : null;
      change(changes, labels.title, current?.title, values.title);
      if (input.type || !current)
        change(
          changes,
          labels.type,
          current ? fr.contracts.types[current.type] : null,
          fr.contracts.types[values.type],
        );
      change(changes, labels.owner, current?.ownerName, owner?.name);
      change(changes, labels.project, current?.projectTitle, project?.title);
      change(changes, labels.artist, current?.artistName, artist?.name);
      change(changes, labels.dueOn, day(current?.dueOn), day(dueOn));
      change(changes, labels.startsOn, day(current?.startsOn), day(startsOn));
      change(changes, labels.endsOn, day(current?.endsOn), day(endsOn));
      change(changes, labels.notes, current?.notes, input.notes?.trim());

      return proposalResult({
        draft: { kind: "contract", contractId: current?.id ?? null, values },
        title: current
          ? t.titles.updateContract(current.title)
          : t.titles.createContract(values.title),
        changes,
        warnings,
        source: current
          ? { label: current.title, href: routes.contract(current.id) }
          : null,
      });
    },
  });
}
