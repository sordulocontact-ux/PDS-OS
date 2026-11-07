import "server-only";

import { tool } from "ai";
import { z } from "zod";

import { formatDay } from "@/lib/assistant/facts";
import {
  capped,
  isReadResult,
  projectSource,
  readFailed,
  targetProject,
  type ReadResult,
} from "@/lib/assistant/read/target";
import type { Source } from "@/lib/assistant/sources";
import { can, type Access } from "@/lib/auth/access";
import { routes } from "@/lib/auth/redirects";
import { assistantReadLegal } from "@/lib/i18n/fr/assistant-read-legal";
import { legalJourneyContext } from "@/lib/legal/journey-context";
import { isClosed, type ClearanceStatus } from "@/lib/legal/clearance/matrix";
import { todayInParis } from "@/lib/contracts/types";
import { isWorkflowLaunched } from "@/lib/plan/queries";
import { actionHref } from "@/lib/ui/journey";

const fr = { assistantReadLegal };
const t = fr.assistantReadLegal.legal;

const MAX_FACTS = 25;
const MAX_ITEMS = 20;

const readinessText = (verdict: "no" | "risk" | "ok", blocking: number) =>
  verdict === "no" ? t.readiness.no(blocking) : t.readiness[verdict];

type Context = Awaited<ReturnType<typeof legalJourneyContext>>;

/** The journey's steps and where each stands, as the Juridique page shows. */
function stepFacts(ctx: Context): string[] {
  return ctx.steps.flatMap((step) => {
    const line = t.step(step.title, t.states[step.status] ?? step.status);
    return step.actor
      ? [line, t.stepActor(step.actor.name, step.actor.todo)]
      : [line];
  });
}

/** What the État des lieux still lacks (to confirm or missing), by section. */
function inventoryFacts(ctx: Context, canSeeSplits: boolean): string[] {
  const { inventory } = ctx;
  const open = inventory.sections.flatMap((section) => {
    const name = t.sections[section.key] ?? section.key;
    if (section.failed) return [t.sectionFailed(name)];
    return section.facts
      .filter((f) => f.status !== "known")
      .map((f) => {
        const where = f.group?.title ? ` — ${f.group.title}` : "";
        const detail = f.detail ? ` (${f.detail})` : "";
        return t.fact(name, `${f.label}${where}`, f.statusLabel, detail);
      });
  });
  return [
    t.inventory(
      inventory.counts.known,
      inventory.counts.to_confirm,
      inventory.counts.missing,
    ),
    ...open.slice(0, MAX_FACTS),
    ...capped(open.length, Math.min(open.length, MAX_FACTS)),
    ...(canSeeSplits ? [] : [t.splitsHidden]),
  ];
}

/** Borrowings and samples, their state and who answers for them. */
function clearanceFacts(ctx: Context): string[] {
  const { items } = ctx.clearances;
  if (items.length === 0) return [t.clearanceNone];
  return items.slice(0, MAX_ITEMS).map((c) => {
    const status = c.status as ClearanceStatus;
    const state = t.clearanceStates[status] ?? status;
    const who = c.responsibleName ? t.responsible(c.responsibleName) : "";
    // A settled borrowing waits for nothing: say it plainly.
    return isClosed(status)
      ? t.clearanceClosed(c.work, c.element, state)
      : t.clearance(c.work, c.element, state, who);
  });
}

/** The plan's démarches with their responsible and due date. */
function planFacts(ctx: Context): string[] {
  if (ctx.tracking.state !== "tracking") return [t.planNotLaunched];
  const today = todayInParis(new Date());
  const items = ctx.tracking.items.filter((i) => i.current !== "obsolete");
  return items
    .slice(0, MAX_ITEMS)
    .map((i) =>
      t.planItem(
        i.label,
        t.planStates[i.current] ?? i.current,
        i.responsibleName ? t.planWho(i.responsibleName) : t.planNoWho,
        i.dueOn ? t.planDue(formatDay(i.dueOn), i.dueOn < today) : "",
      ),
    );
}

export function legalStatusTool(access: Access, pagePath: string | null) {
  return tool({
    description:
      "Lit le Juridique d'un projet (celui nommé, sinon celui de la page ouverte) : étapes du parcours et leur état, ce qui manque à l'État des lieux (connu / à confirmer / manquant), répartitions, emprunts et samples et leur autorisation, démarche SACEM par titre, démarches du plan d'action avec responsable et échéance, et ce qui bloque la sortie. À appeler pour « où en est le Juridique ? », « qu'est-ce qui manque côté droits ? », « le sample est-il autorisé ? », « qui s'occupe de la SACEM ? ».",
    inputSchema: z.object({
      project: z
        .string()
        .max(100)
        .optional()
        .describe("Nom du projet ; absent pour le projet de la page ouverte"),
    }),
    execute: async ({ project }): Promise<ReadResult> => {
      if (!can(access, "manage_legal"))
        return { facts: [t.noRight], sources: [] };
      const target = await targetProject(project, pagePath);
      if (isReadResult(target)) return target;
      const { project: found, notes } = target;
      const sources: Source[] = [
        projectSource(found),
        {
          label: `${found.title} · Juridique`,
          href: routes.projectLegal(found.id),
        },
      ];
      try {
        if (!(await isWorkflowLaunched(found.id, "legal")))
          return { facts: [...notes, t.notLaunched(found.title)], sources };
        const ctx = await legalJourneyContext(found.id);
        const readiness = ctx.readiness;
        return {
          facts: [
            ...notes,
            t.head(found.title),
            ...stepFacts(ctx),
            ...inventoryFacts(ctx, can(access, "manage_catalog")),
            ...clearanceFacts(ctx),
            ...ctx.formalities.map((f) =>
              t.sacem(
                f.title,
                t.sacemStates[f.formality?.status ?? "none"] ?? "—",
              ),
            ),
            ...planFacts(ctx),
            ...(readiness
              ? [
                  `${t.readinessLabel} : ${readinessText(readiness.verdict, readiness.blocking.length)}`,
                  ...readiness.blocking.map((b) =>
                    t.blocking(b.label, b.reason),
                  ),
                ]
              : []),
          ],
          sources: [
            ...sources,
            ...ctx.steps
              .filter((s) => s.status !== "done" && s.status !== "obsolete")
              .slice(0, 5)
              .map((s) => ({
                label: `${found.title} · ${s.title}`,
                href: actionHref(s),
              })),
          ],
        };
      } catch {
        return readFailed();
      }
    },
  });
}
