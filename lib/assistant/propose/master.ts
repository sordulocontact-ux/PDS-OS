import "server-only";

import { tool } from "ai";
import { z } from "zod";

import type { DraftChange, MasterDraft } from "@/lib/assistant/drafts";
import { change, matchByName } from "@/lib/assistant/propose/match";
import {
  proposalResult,
  type ProposeContext,
} from "@/lib/assistant/propose/result";
import { parseSaidDuration, parseSaidIsrc } from "@/lib/assistant/verbatim";
import { can } from "@/lib/auth/access";
import { routes } from "@/lib/auth/redirects";
import {
  getMaster,
  listArtistOptions,
  listMasterOptions,
} from "@/lib/catalog/queries";
import {
  CREDIT_ROLES,
  formatCredits,
  formatDuration,
  formatIsrc,
  masterLabel,
  type Credit,
} from "@/lib/catalog/types";
import { fr } from "@/lib/i18n/fr";

export function proposeMasterTool({ access, verbatim }: ProposeContext) {
  return tool({
    description:
      "Prépare la création d'un master (enregistrement), ou la modification d'un master existant : titre, artistes crédités, version, ISRC, durée. N'enregistre RIEN : l'utilisateur relit le formulaire pré-rempli et enregistre lui-même. Les artistes doivent déjà être au catalogue.",
    inputSchema: z.object({
      existingMaster: z
        .string()
        .max(200)
        .optional()
        .describe(
          "Titre du master existant à modifier ; absent pour en créer un",
        ),
      title: z.string().max(200).optional(),
      artists: z
        .array(
          z.object({
            name: z.string().min(1).max(200),
            role: z.enum(CREDIT_ROLES).default("main"),
          }),
        )
        .max(20)
        .optional()
        .describe("Artistes crédités dans l'ordre ; featuring pour un invité"),
      version: z.string().max(100).optional().describe("« radio edit »…"),
      isrc: z
        .string()
        .max(20)
        .optional()
        .describe("Recopié exactement tel que l'utilisateur l'a écrit"),
      duration: z
        .string()
        .max(10)
        .optional()
        .describe("Recopiée exactement telle que l'utilisateur l'a écrite"),
    }),
    execute: async (input) => {
      const t = fr.assistant.drafts;
      if (!access.organizationId || !can(access, "manage_catalog"))
        return { facts: [t.forbiddenCatalog], sources: [] };

      const labels = fr.catalog.masterForm.fields;
      const warnings: string[] = [];
      let current = null;
      if (input.existingMaster) {
        const found = matchByName(
          await listMasterOptions(),
          input.existingMaster,
          (m) => masterLabel(m),
        );
        current = found ? await getMaster(found.id) : null;
        if (!current)
          return {
            facts: [t.notFound(t.what.master, input.existingMaster)],
            sources: [],
          };
      }

      let credits: Credit[] = current?.credits ?? [];
      if (input.artists?.length) {
        const artists = await listArtistOptions();
        credits = input.artists.flatMap((a) => {
          const found = matchByName(artists, a.name, (x) => x.name);
          if (!found) warnings.push(t.unknownArtist(a.name));
          return found
            ? [{ artistId: found.id, name: found.name, role: a.role }]
            : [];
        });
        credits = credits.filter(
          (c, i) => credits.findIndex((x) => x.artistId === c.artistId) === i,
        );
      }

      const isrcQuote = verbatim.quote(input.isrc);
      const isrc = isrcQuote ? parseSaidIsrc(isrcQuote) : null;
      if (input.isrc && !isrc) warnings.push(t.notSaid(labels.isrc));
      const durationQuote = verbatim.quote(input.duration);
      const duration = durationQuote ? parseSaidDuration(durationQuote) : null;
      if (input.duration && !duration)
        warnings.push(t.notSaid(labels.duration));

      const currentDuration =
        current?.durationSeconds != null
          ? formatDuration(current.durationSeconds)
          : "";
      const values: MasterDraft["values"] = {
        title: input.title?.trim() || current?.title || "",
        version: input.version?.trim() || current?.version || "",
        isrc: isrc ?? current?.isrc ?? "",
        duration: duration ?? currentDuration,
        credits,
      };

      const changes: DraftChange[] = [];
      change(changes, labels.title, current?.title, values.title);
      change(
        changes,
        labels.artists,
        current ? formatCredits(current.credits) : null,
        formatCredits(values.credits),
      );
      change(changes, labels.version, current?.version, values.version);
      change(
        changes,
        labels.isrc,
        current?.isrc ? formatIsrc(current.isrc) : null,
        values.isrc ? formatIsrc(values.isrc) : null,
      );
      change(changes, labels.duration, currentDuration, values.duration);

      return proposalResult({
        draft: { kind: "master", masterId: current?.id ?? null, values },
        title: current
          ? t.titles.updateMaster(masterLabel(current))
          : t.titles.createMaster(values.title),
        changes,
        warnings,
        source: current
          ? { label: masterLabel(current), href: routes.master(current.id) }
          : null,
      });
    },
  });
}
