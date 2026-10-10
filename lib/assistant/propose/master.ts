import "server-only";

import { tool } from "ai";
import { z } from "zod";

import type { DraftChange, MasterDraft } from "@/lib/assistant/drafts";
import { change, findNamed } from "@/lib/assistant/propose/match";
import {
  proposalResult,
  type ProposeContext,
} from "@/lib/assistant/propose/result";
import {
  parseSaidAudioState,
  parseSaidDuration,
  parseSaidIsrc,
  parseSaidVariant,
} from "@/lib/assistant/verbatim";
import { can } from "@/lib/auth/access";
import { routes } from "@/lib/auth/redirects";
import {
  getMaster,
  listArtistOptions,
  listMasterOptions,
} from "@/lib/catalog/queries";
import {
  audioStateOf,
  variantOf,
  variantText,
} from "@/lib/catalog/title-rules";
import {
  CREDIT_ROLES,
  formatCredits,
  formatIsrc,
  masterFormDefaults,
  masterLabel,
  type Credit,
} from "@/lib/catalog/types";
import { fr } from "@/lib/i18n/fr";

export function proposeMasterTool({ access, verbatim }: ProposeContext) {
  return tool({
    description:
      "Prépare la création d'un titre (un morceau du catalogue, de la maquette au master final), ou la modification d'un titre existant : nom, artistes crédités, état audio, variante, ISRC, durée. Seuls le nom et l'artiste principal sont obligatoires : n'invente jamais le reste. N'enregistre RIEN : l'utilisateur relit le formulaire pré-rempli et enregistre lui-même. Les artistes doivent déjà être au catalogue.",
    inputSchema: z.object({
      existingMaster: z
        .string()
        .max(200)
        .optional()
        .describe("Nom du titre existant à modifier ; absent pour en créer un"),
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
      audioState: z
        .string()
        .max(100)
        .optional()
        .describe(
          "Seulement si l'utilisateur dit où en est le morceau : ses mots exacts (« c'est une maquette », « la mise à plat », « le master final »)",
        ),
      variant: z
        .string()
        .max(100)
        .optional()
        .describe(
          "Seulement si l'utilisateur la nomme : ses mots exacts (« l'instru », « radio edit », « remix »)",
        ),
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
        const found = findNamed(
          await listMasterOptions(),
          input.existingMaster,
          (m) => masterLabel(m),
          warnings,
        );
        current = found ? await getMaster(found.id) : null;
        if (!current)
          return {
            facts: [t.notFound(t.what.master, input.existingMaster)],
            sources: [],
          };
      }

      let credits: Credit[] = current?.credits ?? [];
      const pendingCredits: Array<{ name: string; role: Credit["role"] }> = [];
      if (input.artists?.length) {
        const artists = await listArtistOptions();
        credits = input.artists.flatMap((a) => {
          const found = findNamed(artists, a.name, (x) => x.name, warnings);
          if (!found) {
            warnings.push(t.pendingArtist(a.name));
            pendingCredits.push({ name: a.name.trim(), role: a.role });
          }
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

      // Audio state and variant: named in the user's words, read by code.
      const stateQuote = verbatim.quote(input.audioState);
      const audioState = stateQuote ? parseSaidAudioState(stateQuote) : null;
      if (input.audioState && !audioState)
        warnings.push(t.notSaid(labels.audioState));
      const variantQuote = verbatim.quote(input.variant);
      const variant = variantQuote ? parseSaidVariant(variantQuote) : null;
      if (input.variant && !variant) warnings.push(t.notSaid(labels.variant));

      const base = current
        ? masterFormDefaults(current)
        : {
            title: "",
            audioState: "",
            variant: "",
            variantLabel: "",
            isrc: "",
            duration: "",
          };
      const values: MasterDraft["values"] = {
        title: input.title?.trim() || base.title,
        audioState: audioState ?? base.audioState,
        variant: variant ?? base.variant,
        variantLabel: variant && variant !== "other" ? "" : base.variantLabel,
        isrc: isrc ?? base.isrc,
        duration: duration ?? base.duration,
        credits,
        pendingCredits,
      };

      const changes: DraftChange[] = [];
      change(changes, labels.title, current?.title, values.title);
      change(
        changes,
        labels.artists,
        current ? formatCredits(current.credits) : null,
        [
          formatCredits(values.credits),
          ...pendingCredits.map((c) => t.toCreate(c.name)),
        ]
          .filter(Boolean)
          .join(", "),
      );
      const stateName = (value: string) => {
        const state = audioStateOf(value || null);
        return state ? fr.catalog.audioStates[state] : null;
      };
      change(
        changes,
        labels.audioState,
        stateName(base.audioState),
        stateName(values.audioState),
      );
      const variantName = (value: string, label: string) =>
        variantText({
          variant: variantOf(value || "original"),
          variantLabel: label || null,
        });
      change(
        changes,
        labels.variant,
        variantName(base.variant, base.variantLabel),
        variantName(values.variant, values.variantLabel),
      );
      change(
        changes,
        labels.isrc,
        current?.isrc ? formatIsrc(current.isrc) : null,
        values.isrc ? formatIsrc(values.isrc) : null,
      );
      change(changes, labels.duration, base.duration, values.duration);

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
