import "server-only";

import { tool } from "ai";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { pageRecord } from "@/lib/assistant/page-context";
import type { Source } from "@/lib/assistant/sources";
import { mastersFor } from "@/lib/assistant/test-data/fake";
import { insertTemplate } from "@/lib/assistant/test-data/fake-template";
import {
  insertArtist,
  insertMasters,
  insertProject,
  pickManager,
  type Named,
} from "@/lib/assistant/test-data/writes";
import { can, type Access } from "@/lib/auth/access";
import { routes } from "@/lib/auth/redirects";
import { getArtist } from "@/lib/catalog/artist-queries";
import { getMaster } from "@/lib/catalog/queries";
import { fr } from "@/lib/i18n/fr";
import { CREATABLE_PROJECT_TYPES, MUSIC_FORMATS } from "@/lib/projects/types";
import { createClient } from "@/lib/supabase/server";

/**
 * Development only (docs/ASSISTANT.md § 3 ter): PO writes fake records at
 * once, without the review form, to test the app quickly. Every value is drawn
 * by code (`fake.ts`); the model only chooses what to create. By default the
 * open page is used: a title made on an artist's page is credited to that
 * artist, a project made on a title's page carries that title. Never offered
 * in production.
 */
export const isTestDataEnabled = process.env.NODE_ENV !== "production";

/** The artist and the title of the open page, read with the user's session. */
async function pageCatalog(pagePath: string | null) {
  const page = pageRecord(pagePath);
  if (page?.kind === "artist") {
    const artist = await getArtist(page.id);
    return {
      artist: artist && { id: artist.id, name: artist.name },
      master: null,
    };
  }
  if (page?.kind === "master") {
    const master = await getMaster(page.id);
    const main = master?.credits.find((c) => c.role === "main");
    return {
      artist: main ? { id: main.artistId, name: main.name } : null,
      master: master && { id: master.id, name: master.title },
    };
  }
  return { artist: null, master: null };
}

export function createTestDataTool(access: Access, pagePath: string | null) {
  return tool({
    description:
      "MODE DÉVELOPPEMENT. Crée tout de suite, sans formulaire, de NOUVEAUX éléments de test fictifs : artiste, titre, projet (musical : avec ses titres ; contenu ponctuel) ou modèle de contrat (contractTemplate : texte fictif écrit par l'application, à valider par le directeur général). Par défaut sur la page ouverte : un titre créé depuis la fiche d'un artiste lui est crédité, un projet créé depuis la fiche d'un titre porte ce titre. Noms, dates et montants tirés par l'application. Pour compléter la page ouverte elle-même, utiliser fill_page_test_data.",
    inputSchema: z.object({
      kind: z.enum(["artist", "master", "project", "contractTemplate"]),
      count: z.number().int().min(1).max(5).default(1),
      projectType: z
        .enum(CREATABLE_PROJECT_TYPES)
        .optional()
        .describe("Projet : music_release (défaut) ou content"),
      musicFormat: z
        .enum(MUSIC_FORMATS)
        .optional()
        .describe("Projet musical : single (défaut), ep, album…"),
    }),
    execute: async ({ kind, count, projectType, musicFormat }) => {
      const t = fr.assistant.testData;
      const organizationId = access.organizationId;
      if (kind === "contractTemplate") return createTemplates(access, count);
      const type = projectType ?? "music_release";
      const needsCatalog = kind !== "project" || type === "music_release";
      if (
        !organizationId ||
        (needsCatalog && !can(access, "manage_catalog")) ||
        (kind === "project" && !can(access, "create_projects"))
      )
        return { facts: [t.forbidden], sources: [] };

      const manager = kind === "project" ? await pickManager(access) : null;
      if (kind === "project" && !manager)
        return { facts: [t.noManager], sources: [] };

      const supabase = await createClient();
      const page = kind === "artist" ? null : await pageCatalog(pagePath);
      const format = musicFormat ?? "single";
      // A single made on a title's page carries that title, created once.
      const pageSingle =
        kind === "project" && type === "music_release" && format === "single"
          ? (page?.master ?? null)
          : null;
      const facts: string[] = [];
      const sources: Source[] = [];

      for (let i = 0; i < (pageSingle ? 1 : count); i++) {
        let artist: Named | null = null;
        if (needsCatalog && !pageSingle) {
          artist =
            page?.artist ?? (await insertArtist(supabase, organizationId));
          if (!artist) {
            facts.push(t.failed(t.what.artist));
            break;
          }
          if (!page?.artist) {
            facts.push(t.artistCreated(artist.name));
            sources.push({
              label: artist.name,
              href: routes.artist(artist.id),
            });
          }
        }
        if (kind === "artist") continue;

        let masters: Named[] = pageSingle ? [pageSingle] : [];
        if (artist) {
          const made = await insertMasters(
            supabase,
            organizationId,
            artist,
            kind === "master" ? 1 : mastersFor(format),
          );
          if (!made) {
            facts.push(t.failed(t.what.master));
            break;
          }
          masters = made;
          for (const m of made) {
            facts.push(t.masterCreated(m.name, artist.name));
            if (kind === "master")
              sources.push({ label: m.name, href: routes.master(m.id) });
          }
        }
        if (kind === "master" || !manager) continue;

        const project = await insertProject(supabase, {
          organizationId,
          type,
          format,
          masters,
          manager,
        });
        if (!project) {
          facts.push(t.failed(t.what.project));
          break;
        }
        facts.push(t.projectCreated(project.title, project.kind, manager.name));
        sources.push({
          label: project.title,
          href: routes.project(project.id),
        });
      }

      if (sources.length) revalidatePath(routes.app, "layout");
      return { facts, sources };
    },
  });
}

/** Fake contract templates: fixed texts written by code (fake-template.ts). */
async function createTemplates(access: Access, count: number) {
  const t = fr.assistant.testData;
  if (!access.organizationId || !can(access, "manage_legal"))
    return { facts: [t.forbidden], sources: [] };
  const supabase = await createClient();
  const facts: string[] = [];
  for (let i = 0; i < count; i++) {
    const made = await insertTemplate(supabase, access.organizationId, i);
    if (!made) {
      facts.push(t.failed(t.what.template));
      break;
    }
    facts.push(t.templateCreated(made.name));
  }
  if (facts.length) revalidatePath(routes.contractTemplates);
  return {
    facts,
    sources: [
      {
        label: fr.assistantRecords.templatesLink,
        href: routes.contractTemplates,
      },
    ],
  };
}
