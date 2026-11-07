import "server-only";

import { tool } from "ai";
import { z } from "zod";

import { formatDay } from "@/lib/assistant/facts";
import { stepLines } from "@/lib/assistant/read/master";
import {
  capped,
  isReadResult,
  projectSource,
  readFailed,
  targetProject,
  type ReadResult,
} from "@/lib/assistant/read/target";
import { uniqueSources, type Source } from "@/lib/assistant/sources";
import type { Access } from "@/lib/auth/access";
import { requireApproved } from "@/lib/auth/dal";
import { routes } from "@/lib/auth/redirects";
import { loadAnomalies } from "@/lib/distribution/anomalies-queries";
import { platformLabel } from "@/lib/distribution/platforms";
import { loadPlatformsView } from "@/lib/distribution/platforms-queries";
import { loadTrackingView } from "@/lib/distribution/tracking-queries";
import { loadDistributionView } from "@/lib/distribution/view";
import { assistantReadWorkflows } from "@/lib/i18n/fr/assistant-read-workflows";
import { distribution } from "@/lib/i18n/fr/distribution";
import { loadShellJourneys } from "@/lib/overview/journeys";
import { getProject } from "@/lib/projects/queries";

const fr = { assistantReadWorkflows, distribution };
const t = fr.assistantReadWorkflows.distribution;
const MAX_ITEMS = 15;

const shorten = (text: string) => {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > 500 ? `${flat.slice(0, 500)}…` : flat;
};

/**
 * The Distribution of a project as its pages show it: steps, what the
 * Préparation still lacks (same checks as the screen), the dossier, the
 * deposit and The Orchard's answer, the platforms and the anomalies.
 */
export function distributionStatusTool(
  _access: Access,
  pagePath: string | null,
) {
  return tool({
    description:
      "La Distribution d'un projet : étapes (Préparation, Paramètres, Dossier de livraison, Dépôt dans The Orchard, Réponse, Plateformes, Clôture) et état, ce qui manque à la Préparation, la date de sortie prévue, le dossier soumis ou non, le dépôt déclaré ou non, la réponse de The Orchard, les plateformes en ligne avec leurs liens, et les anomalies. À appeler pour « où en est la distribution ? », « qu'est-ce qui manque pour déposer ? », « c'est en ligne ? ». Sans nom de projet : celui de la page ouverte.",
    inputSchema: z.object({
      project: z
        .string()
        .max(100)
        .optional()
        .describe("Titre du projet, même approximatif ; vide = page ouverte"),
    }),
    execute: async ({ project }): Promise<ReadResult> => {
      try {
        const target = await targetProject(project, pagePath);
        if (isReadResult(target)) return target;
        const { journeys } = await loadShellJourneys(target.project.id);
        const own = journeys.filter((j) => j.module === "distribution");
        const sources: Source[] = [projectSource(target.project)];
        if (own.length === 0)
          return {
            facts: [
              ...target.notes,
              fr.assistantReadWorkflows.notOpen(t.workflow),
            ],
            sources,
          };
        const facts = [
          ...target.notes,
          fr.assistantReadWorkflows.project(target.project.title),
        ];
        for (const journey of own) {
          const lines = stepLines(journey);
          facts.push(...lines.facts);
          sources.push(...lines.sources);
        }
        const [detail, access] = await Promise.all([
          getProject(target.project.id),
          requireApproved(),
        ]);
        if (!detail) return readFailed();
        const [view, tracking, platforms, anomalies] = await Promise.all([
          loadDistributionView(detail, access),
          loadTrackingView(detail, access),
          loadPlatformsView(detail, access),
          loadAnomalies(detail.id, access),
        ]);

        const release = view.sources.input.releaseDate;
        facts.push(
          release
            ? t.release(formatDay(release.date), release.source)
            : t.noRelease,
        );

        const prep = view.readiness;
        facts.push(
          prep.blockers.length === 0
            ? t.prep.allReady
            : t.prep.summary(prep.ready, prep.total),
        );
        for (const item of prep.blockers.slice(0, MAX_ITEMS)) {
          facts.push(t.prep.missing(item.label, item.subject, item.detail));
          sources.push({ label: item.label, href: item.href });
        }
        facts.push(...capped(prep.blockers.length, MAX_ITEMS));

        const d = t.dossier;
        const latest = view.versions[0] ?? null;
        facts.push(
          latest
            ? d.version(
                latest.number,
                d.statuses[latest.status] ?? latest.status,
              )
            : d.none,
        );
        if (latest?.note && latest.status !== "pending")
          facts.push(d.note(shorten(latest.note)));
        facts.push(
          view.validator ? d.validator(view.validator.name) : d.noValidator,
        );
        const stops = [
          ...view.gate.reasons,
          ...view.gate.derogable.map((x) => x.text),
        ];
        if (stops.length === 0 && !latest) facts.push(d.gateOpen);
        for (const text of stops) facts.push(d.gate(text));
        sources.push({
          label: "Dossier de livraison",
          href: routes.projectReleaseDossier(detail.id),
        });

        const live = tracking.declarations.filter((x) => !x.withdrawn);
        if (live.length === 0) facts.push(t.deposit.none);
        for (const x of live.slice(0, MAX_ITEMS)) {
          facts.push(
            t.deposit.line(
              t.deposit.kinds[x.kind] ?? x.kind,
              x.declaredOn ? formatDay(x.declaredOn) : null,
              x.proof || x.proofUrl ? t.deposit.proven : t.deposit.declared,
              x.orchardId ? t.deposit.orchardId(x.orchardId) : "",
            ),
          );
          if (x.note) facts.push(t.deposit.note(shorten(x.note)));
        }
        if (
          live.length > 0 &&
          !live.some((x) =>
            ["received", "corrections_requested", "accepted"].includes(x.kind),
          )
        )
          facts.push(t.deposit.noReply);
        sources.push({
          label: "Suivi",
          href: routes.projectReleaseTracking(detail.id),
        });

        const av = platforms.availability;
        facts.push(
          t.platforms.availability(
            t.platforms.states[av.state] ?? av.state,
            av.verified,
            av.reference,
          ),
        );
        if (platforms.platforms.length === 0) facts.push(t.platforms.none);
        for (const p of platforms.platforms) {
          facts.push(
            t.platforms.line(
              platformLabel(p),
              t.platforms.verifications[p.verification] ?? p.verification,
              p.url ? t.platforms.link(p.url) : t.platforms.noLink,
            ),
          );
        }
        sources.push({
          label: "Plateformes",
          href: routes.projectReleaseOnline(detail.id),
        });

        const a = fr.distribution.anomalies;
        if (anomalies.length === 0) facts.push(t.anomalies.none);
        for (const x of anomalies.slice(0, MAX_ITEMS)) {
          facts.push(
            t.anomalies.line(
              a.kinds[x.kind],
              a.severities[x.severity],
              a.states[x.state],
              shorten(x.description),
            ),
          );
          if (x.ownerName)
            facts.push(
              t.anomalies.owner(
                x.ownerName,
                x.dueOn ? formatDay(x.dueOn) : null,
              ),
            );
        }
        facts.push(...capped(anomalies.length, MAX_ITEMS));
        return { facts, sources: uniqueSources(sources) };
      } catch (error) {
        console.error("distributionStatus:", error);
        return readFailed();
      }
    },
  });
}
