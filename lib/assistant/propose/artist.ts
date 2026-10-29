import "server-only";

import { tool } from "ai";
import { z } from "zod";

import type {
  ArtistDraft,
  ContactDraft,
  DraftChange,
} from "@/lib/assistant/drafts";
import {
  change,
  countryCodeOf,
  findNamed,
} from "@/lib/assistant/propose/match";
import {
  proposalResult,
  type ProposeContext,
} from "@/lib/assistant/propose/result";
import { can } from "@/lib/auth/access";
import { routes } from "@/lib/auth/redirects";
import { getArtist } from "@/lib/catalog/artist-queries";
import { CONTACT_ROLES } from "@/lib/catalog/contacts";
import { countryName } from "@/lib/catalog/countries";
import { listArtistOptions } from "@/lib/catalog/queries";
import { ARTIST_RELATIONS } from "@/lib/catalog/types";
import { fr } from "@/lib/i18n/fr";
import { parseSaidEmail, parseSaidPhone } from "@/lib/assistant/verbatim";

const said = z
  .string()
  .max(320)
  .optional()
  .describe("Recopié exactement tel que l'utilisateur l'a écrit");

export function proposeArtistTool({ access, verbatim }: ProposeContext) {
  return tool({
    description:
      "Prépare la création d'un artiste, ou la modification / le complément de la fiche d'un artiste existant (nom, relation avec PDS, nom civil, pays, biographie, notes, contacts). N'enregistre RIEN : l'utilisateur relit le formulaire pré-rempli et enregistre lui-même. Ne remplis que ce que l'utilisateur a dit. Pour un nouvel artiste, le formulaire s'ouvre sur une recherche Deezer déjà lancée sur le nom : l'utilisateur y choisit le profil (ou colle le lien de sa page Deezer), et l'application reprend d'elle-même sa photo, son lien et ses fans.",
    inputSchema: z.object({
      existingArtist: z
        .string()
        .max(200)
        .optional()
        .describe(
          "Nom de l'artiste déjà au catalogue à modifier ; absent pour créer un artiste",
        ),
      name: z
        .string()
        .max(200)
        .optional()
        .describe(
          "Nom d'artiste exactement tel qu'écrit, parenthèses et suffixes compris ; n'en déduis rien",
        ),
      relation: z
        .enum(ARTIST_RELATIONS)
        .optional()
        .describe(
          "Relation avec PDS, seulement si l'utilisateur l'a dite : signed = signé au roster PDS, collaboration = projet ponctuel (un PDS Mic…) hors roster",
        ),
      legalName: z
        .string()
        .max(200)
        .optional()
        .describe("Nom civil, recopié exactement s'il a été écrit"),
      country: z
        .string()
        .max(60)
        .optional()
        .describe("Pays, recopié exactement s'il a été écrit ; jamais supposé"),
      bio: z
        .string()
        .max(5000)
        .optional()
        .describe("Biographie, recopiée exactement si elle a été écrite"),
      notes: z
        .string()
        .max(5000)
        .optional()
        .describe(
          "Notes, recopiées exactement si elles ont été écrites ; jamais une interprétation",
        ),
      contacts: z
        .array(
          z.object({
            role: z.enum(CONTACT_ROLES),
            name: z.string().min(1).max(200),
            email: said,
            phone: said,
          }),
        )
        .max(5)
        .optional(),
    }),
    execute: async (input) => {
      const t = fr.assistant.drafts;
      if (!access.organizationId || !can(access, "manage_catalog"))
        return { facts: [t.forbiddenCatalog], sources: [] };

      const labels = fr.catalog.profileForm;
      const relations = fr.catalog.relation.labels;
      const warnings: string[] = [];
      let current = null;
      if (input.existingArtist) {
        const found = findNamed(
          await listArtistOptions(),
          input.existingArtist,
          (a) => a.name,
          warnings,
        );
        current = found ? await getArtist(found.id) : null;
        if (!current)
          return {
            facts: [t.notFound(t.what.artist, input.existingArtist)],
            sources: [],
          };
      }

      // Only what the user wrote: a country, a civil name, a bio or notes
      // supposed by PO are left out (UX test of 09/10/2026: « France »,
      // « label UX-D » invented).
      const kept = (raw: string | undefined, label: string) => {
        if (!raw?.trim()) return null;
        const quote = verbatim.quote(raw);
        if (!quote) warnings.push(t.notSaid(label));
        return quote;
      };
      const nameQuote = kept(input.name, labels.name);
      const after = nameQuote ? verbatim.parenthesisAfter(nameQuote) : null;
      if (nameQuote && after) warnings.push(t.nameFollowedBy(nameQuote, after));
      const legalName = kept(input.legalName, labels.legalName);
      const bio = kept(input.bio, labels.bio);
      const notes = kept(input.notes, labels.notes);
      const countryQuote = kept(input.country, labels.country);

      let countryCode = current?.countryCode ?? null;
      if (countryQuote) {
        const code = countryCodeOf(countryQuote);
        if (code) countryCode = code;
        else warnings.push(t.unknownCountry(countryQuote));
      }

      const contacts: ContactDraft[] = (input.contacts ?? []).map((c) => {
        const contact = { role: c.role, name: c.name.trim() };
        const email = c.email ? verbatim.quote(c.email) : null;
        const phone = c.phone ? verbatim.quote(c.phone) : null;
        if (c.email && !(email && parseSaidEmail(email)))
          warnings.push(
            t.notSaid(`${fr.catalog.contacts.form.email} de ${contact.name}`),
          );
        if (c.phone && !(phone && parseSaidPhone(phone)))
          warnings.push(
            t.notSaid(`${fr.catalog.contacts.form.phone} de ${contact.name}`),
          );
        return {
          ...contact,
          email: email ? parseSaidEmail(email) : null,
          phone: phone ? parseSaidPhone(phone) : null,
        };
      });

      const values: ArtistDraft["values"] = {
        name: nameQuote || current?.name || "",
        relation: input.relation ?? current?.relation ?? null,
        legalName: legalName || current?.legalName || null,
        countryCode,
        bio: bio || current?.bio || null,
        notes: notes || current?.notes || null,
      };

      const changes: DraftChange[] = [];
      change(changes, labels.name, current?.name, values.name);
      change(
        changes,
        fr.catalog.relation.legend,
        current ? relations[current.relation] : null,
        values.relation ? relations[values.relation] : null,
      );
      change(changes, labels.legalName, current?.legalName, values.legalName);
      change(
        changes,
        labels.country,
        countryName(current?.countryCode ?? null),
        countryName(values.countryCode),
      );
      change(changes, labels.bio, current?.bio, values.bio);
      change(changes, labels.notes, current?.notes, values.notes);
      for (const c of contacts) {
        const detail = [c.name, c.email, c.phone].filter(Boolean).join(" · ");
        change(
          changes,
          t.labels.contact(fr.catalog.contacts.roles[c.role]),
          null,
          detail,
        );
      }

      return proposalResult({
        draft: {
          kind: "artist",
          artistId: current?.id ?? null,
          values,
          contacts,
        },
        title: current
          ? t.titles.updateArtist(current.name)
          : t.titles.createArtist(values.name),
        changes,
        warnings,
        source: current
          ? { label: current.name, href: routes.artist(current.id) }
          : null,
      });
    },
  });
}
