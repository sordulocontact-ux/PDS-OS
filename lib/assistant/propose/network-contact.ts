import "server-only";

import { tool } from "ai";
import { z } from "zod";

import type { NetworkContactDraft } from "@/lib/assistant/draft-records";
import type { DraftChange } from "@/lib/assistant/drafts";
import { change, findNamed } from "@/lib/assistant/propose/match";
import {
  proposalResult,
  type ProposeContext,
} from "@/lib/assistant/propose/result";
import {
  parseSaidEmail,
  parseSaidPhone,
  parseSaidUrl,
} from "@/lib/assistant/verbatim";
import { can } from "@/lib/auth/access";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import {
  getNetworkContact,
  listNetworkContacts,
  loadNetworkFormOptions,
} from "@/lib/network/queries";
import { NETWORK_KINDS, NETWORK_ROLES, rolesText } from "@/lib/network/types";

const said = (what: string) =>
  z
    .string()
    .max(500)
    .optional()
    .describe(`${what}, recopié exactement tel que l'utilisateur l'a écrit`);

/**
 * propose_network_contact (manage_network): a person or an organization of
 * the Réseau, created or edited in the contact form. Coordinates are kept
 * only when typed by the user (lib/assistant/verbatim.ts).
 */
export function proposeNetworkContactTool({
  access,
  verbatim,
}: ProposeContext) {
  return tool({
    description:
      "Prépare l'ajout d'une personne ou d'une structure au Réseau (ingé son, beatmaker, photographe, label, média, prestataire…), ou la modification d'un contact existant : nom, type, rôles, structure d'appartenance, artiste du catalogue, e-mail, téléphone, site, ville, notes. N'enregistre RIEN : l'utilisateur relit le formulaire pré-rempli et enregistre lui-même.",
    inputSchema: z.object({
      existingContact: z
        .string()
        .max(200)
        .optional()
        .describe(
          "Nom du contact existant à modifier ; absent pour en créer un",
        ),
      kind: z.enum(NETWORK_KINDS).optional(),
      name: z.string().max(200).optional(),
      roles: z.array(z.enum(NETWORK_ROLES)).max(8).optional(),
      organization: z
        .string()
        .max(200)
        .optional()
        .describe("Structure du Réseau à laquelle la personne appartient"),
      artist: z
        .string()
        .max(200)
        .optional()
        .describe("Artiste du catalogue que ce contact représente"),
      email: said("E-mail"),
      phone: said("Téléphone"),
      website: said("Site web"),
      city: z.string().max(120).optional(),
      notes: z.string().max(2000).optional(),
    }),
    execute: async (input) => {
      const t = fr.assistantRecords;
      if (!access.organizationId || !can(access, "manage_network"))
        return { facts: [t.forbiddenNetwork], sources: [] };

      const labels = fr.network.form;
      const warnings: string[] = [];
      let current = null;
      if (input.existingContact) {
        const found = findNamed(
          (await listNetworkContacts(false)) ?? [],
          input.existingContact,
          (c) => c.name,
          warnings,
        );
        current = found ? await getNetworkContact(found.id) : null;
        if (!current || current.archived)
          return {
            facts: [
              fr.assistant.drafts.notFound(
                t.what.contact,
                input.existingContact,
              ),
            ],
            sources: [],
          };
      }

      const options = await loadNetworkFormOptions();
      const organization = input.organization
        ? findNamed(
            options.organizations,
            input.organization,
            (o) => o.name,
            warnings,
          )
        : null;
      if (input.organization && !organization)
        warnings.push(t.unknownOrganization(input.organization));
      const artist = input.artist
        ? findNamed(options.artists, input.artist, (a) => a.name, warnings)
        : null;
      if (input.artist && !artist)
        warnings.push(fr.assistant.drafts.unknownArtist(input.artist));

      const coordinate = (
        value: string | undefined,
        parse: (quote: string) => string | null,
        label: string,
      ) => {
        const quote = verbatim.quote(value);
        const parsed = quote ? parse(quote) : null;
        if (value && !parsed) warnings.push(fr.assistant.drafts.notSaid(label));
        return parsed;
      };
      const email = coordinate(input.email, parseSaidEmail, labels.email);
      const phone = coordinate(input.phone, parseSaidPhone, labels.phone);
      const website = coordinate(input.website, parseSaidUrl, labels.website);
      // Name copied whole, notes and city only as written (UX test of
      // 09/10/2026: « (UX-C) » read as something else).
      const kept = (raw: string | undefined, label: string) => {
        if (!raw?.trim()) return null;
        const quote = verbatim.quote(raw);
        if (!quote) warnings.push(fr.assistant.drafts.notSaid(label));
        return quote;
      };
      const nameQuote = kept(input.name, labels.name);
      const after = nameQuote ? verbatim.parenthesisAfter(nameQuote) : null;
      if (nameQuote && after)
        warnings.push(fr.assistant.drafts.nameFollowedBy(nameQuote, after));
      const city = kept(input.city, labels.city);
      const notes = kept(input.notes, labels.notes);

      const roles = input.roles?.length
        ? [...new Set(input.roles)]
        : (current?.roles ?? []);
      if (roles.length === 0) warnings.push(t.rolesToChoose);
      const values: NetworkContactDraft["values"] = {
        kind: input.kind ?? current?.kind ?? "person",
        name: nameQuote || current?.name || "",
        roles,
        parentId: organization?.id ?? current?.parentId ?? null,
        artistId: artist?.id ?? current?.artistId ?? null,
        email: email ?? current?.email ?? null,
        phone: phone ?? current?.phone ?? null,
        website: website ?? current?.website ?? null,
        city: city || current?.city || null,
        notes: notes || current?.notes || null,
      };

      const changes: DraftChange[] = [];
      change(changes, labels.name, current?.name, values.name);
      change(
        changes,
        labels.kind,
        current ? fr.network.kinds[current.kind] : null,
        fr.network.kinds[values.kind],
      );
      change(
        changes,
        labels.roles,
        current ? rolesText(current.roles) : null,
        rolesText(values.roles),
      );
      change(changes, labels.parent, current?.parentName, organization?.name);
      change(changes, labels.artist, current?.artistName, artist?.name);
      change(changes, labels.email, current?.email, email);
      change(changes, labels.phone, current?.phone, phone);
      change(changes, labels.website, current?.website, website);
      change(changes, labels.city, current?.city, city);
      change(changes, labels.notes, current?.notes, notes);

      return proposalResult({
        draft: {
          kind: "networkContact",
          contactId: current?.id ?? null,
          values,
        },
        title: current
          ? t.titles.updateContact(current.name)
          : t.titles.createContact(values.name),
        changes,
        warnings,
        source: current
          ? { label: current.name, href: routes.networkContact(current.id) }
          : null,
      });
    },
  });
}
