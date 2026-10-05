import "server-only";

import { tool } from "ai";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { pageRecord } from "@/lib/assistant/page-context";
import { fillArtist } from "@/lib/assistant/test-data/fill-artist";
import { fillMaster } from "@/lib/assistant/test-data/fill-master";
import { fillProject } from "@/lib/assistant/test-data/fill-project";
import { can, type Access } from "@/lib/auth/access";
import { routes } from "@/lib/auth/redirects";
import { getArtist } from "@/lib/catalog/artist-queries";
import { getMaster } from "@/lib/catalog/queries";
import { fr } from "@/lib/i18n/fr";
import { getProject } from "@/lib/projects/queries";
import { createClient } from "@/lib/supabase/server";

/**
 * Development only (docs/ASSISTANT.md § 3 ter): completes the page PO was
 * opened from. The page comes from the path sent by the client and resolved
 * here, never from the model: it cannot point the tool at another record.
 */

/** Sentences of what was filled, left alone, or failed: written by code. */
function report<K extends string>(
  what: string,
  steps: Partial<Record<K, boolean | null>>,
  labels: Record<K, string>,
): string[] {
  const t = fr.assistant.testData;
  const keys = Object.keys(steps) as K[];
  const list = (value: boolean | null) =>
    keys
      .filter((k) => steps[k] === value)
      .map((k) => labels[k])
      .join(", ");
  const filled = list(true);
  const untouched = list(null);
  const failed = list(false);
  return [
    filled ? t.filled(what, filled) : t.nothingToFill(what),
    ...(filled && untouched ? [t.untouched(untouched)] : []),
    ...(failed ? [t.notFilled(failed)] : []),
  ];
}

export function fillPageTestDataTool(access: Access, pagePath: string | null) {
  return tool({
    description:
      "MODE DÉVELOPPEMENT. Complète la page ouverte avec des données fictives, dans toutes ses sections encore vides (rien n'est remplacé). Fiche d'un titre : ISRC, sessions et pistes, contributeurs, splits, droits (ISWC, ℗), déclarations SACEM…, une version, un projet, fichiers audio et pochette. Fiche d'un artiste : identité, biographie, contacts, titres. Page d'un projet (vue d'ensemble, Master, Juridique…) : chacun de ses titres comme sa fiche, puis les ingénieurs de mix et de mastering ajoutés au Réseau et reliés. L'application sait quelle page est ouverte : aucun paramètre.",
    inputSchema: z.object({}),
    execute: async () => {
      const t = fr.assistant.testData;
      const page = pageRecord(pagePath);
      const organizationId = access.organizationId;
      if (!page) return { facts: [t.noPage], sources: [] };
      if (!organizationId || !can(access, "manage_catalog"))
        return { facts: [t.forbidden], sources: [] };

      const supabase = await createClient();
      if (page.kind === "project") {
        const project = await getProject(page.id);
        if (!project) return { facts: [t.noPage], sources: [] };
        if (!project.masters.length)
          return { facts: [t.noTitles(project.title)], sources: [] };
        const steps = await fillProject(supabase, access, project);
        revalidatePath(routes.app, "layout");
        return {
          facts: [
            ...report(
              t.theProject(project.title, project.masters.length),
              steps,
              { ...t.masterSections, ...t.projectSections },
            ),
            t.distribution,
          ],
          sources: [{ label: project.title, href: routes.project(project.id) }],
        };
      }
      if (page.kind === "master") {
        const master = await getMaster(page.id);
        if (!master) return { facts: [t.noPage], sources: [] };
        const steps = await fillMaster(supabase, access, master);
        revalidatePath(routes.app, "layout");
        return {
          facts: [
            ...report(t.theMaster(master.title), steps, t.masterSections),
            t.distribution,
          ],
          sources: [{ label: master.title, href: routes.master(master.id) }],
        };
      }

      const artist = await getArtist(page.id);
      if (!artist) return { facts: [t.noPage], sources: [] };
      const steps = await fillArtist(supabase, organizationId, artist);
      revalidatePath(routes.app, "layout");
      return {
        facts: report(t.theArtist(artist.name), steps, t.artistSections),
        sources: [{ label: artist.name, href: routes.artist(artist.id) }],
      };
    },
  });
}
