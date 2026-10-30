import "server-only";

import { tool } from "ai";
import { z } from "zod";

import type { ContractTemplateDraft } from "@/lib/assistant/draft-records";
import type { DraftChange } from "@/lib/assistant/drafts";
import { change, findNamed } from "@/lib/assistant/propose/match";
import {
  proposalResult,
  type ProposeContext,
} from "@/lib/assistant/propose/result";
import { can } from "@/lib/auth/access";
import { routes } from "@/lib/auth/redirects";
import { CONTRACT_TYPES } from "@/lib/contracts/types";
import { fr } from "@/lib/i18n/fr";
import { unknownPlaceholders } from "@/lib/legal/contracts/fields";
import { listTemplateSeries } from "@/lib/legal/contracts/templates";
import { FORM_ROLES, type FormRole } from "@/lib/legal/forms/definition";

/**
 * propose_contract_template (manage_legal): a new template, or a new version
 * of one — a template is never edited (ticket Juridique 03). « Aucun modèle
 * juridique nouveau ni aucune clause n'est inventé » : the text is kept only
 * when it is word for word in the user's messages, else the person pastes it.
 */
export function proposeContractTemplateTool({
  access,
  verbatim,
}: ProposeContext) {
  return tool({
    description:
      "Prépare un nouveau modèle de contrat, ou une nouvelle version d'un modèle existant (un modèle ne se modifie jamais : une correction = une version) : nom, type de contrat, rôles concernés, usage, texte. Le texte n'est repris que s'il a été collé par l'utilisateur : n'écris JAMAIS de clause ni de texte de contrat toi-même. N'enregistre RIEN : l'utilisateur relit le formulaire pré-rempli, colle ou corrige le texte, et enregistre.",
    inputSchema: z.object({
      existingTemplate: z
        .string()
        .max(200)
        .optional()
        .describe(
          "Nom du modèle existant dont on fait une nouvelle version ; absent pour un nouveau modèle",
        ),
      name: z.string().max(200).optional(),
      type: z.enum(CONTRACT_TYPES).optional(),
      roles: z
        .array(z.enum(FORM_ROLES))
        .max(FORM_ROLES.length)
        .optional()
        .describe("Rôles des personnes à qui ce modèle s'adresse"),
      usage: z
        .string()
        .max(500)
        .optional()
        .describe("Quand utiliser ce modèle, dans les mots de l'utilisateur"),
      body: z
        .string()
        .max(200_000)
        .optional()
        .describe(
          "Texte du modèle, seulement s'il a été collé par l'utilisateur, recopié tel quel",
        ),
    }),
    execute: async (input) => {
      const t = fr.assistantRecords;
      if (!access.organizationId || !can(access, "manage_legal"))
        return { facts: [t.forbiddenLegal], sources: [] };

      const labels = fr.legalContracts.templates.form;
      const warnings: string[] = [];
      let current = null;
      if (input.existingTemplate) {
        current = findNamed(
          await listTemplateSeries(access),
          input.existingTemplate,
          (s) => s.name,
          warnings,
        );
        if (!current)
          return {
            facts: [
              fr.assistant.drafts.notFound(
                t.what.template,
                input.existingTemplate,
              ),
            ],
            sources: [],
          };
      }

      // The text: only what the user pasted, never the model's own words.
      const body = verbatim.quote(input.body);
      if (input.body && !body) warnings.push(t.templateBodyNotPasted);
      if (!body && !current) warnings.push(t.templateBodyToPaste);
      const unknown = body ? unknownPlaceholders(body) : [];
      if (unknown.length > 0)
        warnings.push(t.templateUnknownFields(unknown.join(", ")));

      const values: ContractTemplateDraft["values"] = {
        name: input.name?.trim() || null,
        type: input.type ?? null,
        roles: input.roles?.length ? [...new Set(input.roles)] : null,
        usage: input.usage?.trim() || null,
        body,
      };

      const changes: DraftChange[] = [];
      change(changes, labels.name, current?.name, values.name);
      change(
        changes,
        labels.type,
        current ? fr.contracts.types[current.type] : null,
        values.type ? fr.contracts.types[values.type] : null,
      );
      const roleNames = (roles: readonly FormRole[] | null | undefined) =>
        roles?.length
          ? roles.map((r) => fr.legalForms.roles[r]).join(", ")
          : null;
      change(
        changes,
        labels.roles,
        roleNames(current?.roles),
        roleNames(values.roles),
      );
      change(changes, labels.usage, current?.usage, values.usage);
      if (body)
        changes.push({
          label: labels.body,
          before: null,
          after: t.pastedText(body.length),
        });

      return proposalResult({
        draft: {
          kind: "contractTemplate",
          seriesId: current?.seriesId ?? null,
          values,
        },
        title: current
          ? t.titles.templateVersion(current.name, current.version + 1)
          : t.titles.createTemplate(values.name ?? ""),
        changes,
        warnings,
        source: { label: t.templatesLink, href: routes.contractTemplateList },
      });
    },
  });
}
