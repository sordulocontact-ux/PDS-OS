import "server-only";

import { tool } from "ai";
import { z } from "zod";

import { personName } from "@/lib/projects/types";
import { matchByName } from "@/lib/assistant/fuzzy-name";
import {
  findArtistsTool,
  findMastersTool,
} from "@/lib/assistant/catalog-tools";
import { activityLine, formatDay, lateness } from "@/lib/assistant/facts";
import { projectStatus } from "@/lib/assistant/project-status";
import { proposeArtistTool } from "@/lib/assistant/propose/artist";
import { proposeContractTool } from "@/lib/assistant/propose/contract";
import { proposeContractTemplateTool } from "@/lib/assistant/propose/contract-template";
import { proposeFeedbackTool } from "@/lib/assistant/propose/feedback";
import { feedbackReviewTools } from "@/lib/assistant/propose/feedback-review";
import { proposeMasterTool } from "@/lib/assistant/propose/master";
import { proposeMeetingTool } from "@/lib/assistant/propose/meeting";
import { proposeNetworkContactTool } from "@/lib/assistant/propose/network-contact";
import { proposeProjectTool } from "@/lib/assistant/propose/project";
import {
  proposeBudgetLineTool,
  proposeTaskTool,
} from "@/lib/assistant/propose/project-items";
import { proposeTitleItemTool } from "@/lib/assistant/propose/title-item";
import { uniqueSources, type Source } from "@/lib/assistant/sources";
import { fillPageTestDataTool } from "@/lib/assistant/test-data/fill-tool";
import {
  createTestDataTool,
  isTestDataEnabled,
} from "@/lib/assistant/test-data/tool";
import { verbatimFrom } from "@/lib/assistant/verbatim";
import { can, type Access } from "@/lib/auth/access";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";
import { loadRecentActivity } from "@/lib/insights/activity";
import { loadMyTodo } from "@/lib/insights/todo";
import { handoverOf } from "@/lib/projects/handover";
import { listProjects } from "@/lib/projects/queries";
import { createClient } from "@/lib/supabase/server";

/**
 * The assistant's only reach into the world (docs/ASSISTANT.md § 3).
 * Run with the user's session: RLS decides what is visible. Nothing writes:
 * the propose_* functions return drafts that a person reviews and saves
 * (§ 3 bis). Every result carries `sources`, rendered under the answer.
 * `userTexts`: what the user typed, the only place numbers and dates of a
 * draft may come from. `pagePath`: the page PO was opened from, joined to a
 * feedback draft. The director's feedback tools exist only for read_feedback.
 * Outside production only, create_test_data and fill_page_test_data write
 * fake records, the open page by default (§ 3 ter).
 */
export function createAssistantTools(
  access: Access,
  userTexts: string[],
  pagePath: string | null = null,
) {
  const context = { access, verbatim: verbatimFrom(userTexts), pagePath };
  return {
    find_artists: findArtistsTool(),
    find_masters: findMastersTool(),
    propose_artist: proposeArtistTool(context),
    propose_master: proposeMasterTool(context),
    propose_title_item: proposeTitleItemTool(context),
    propose_project: proposeProjectTool(context),
    propose_contract_template: proposeContractTemplateTool(context),
    propose_contract: proposeContractTool(context),
    propose_network_contact: proposeNetworkContactTool(context),
    propose_task: proposeTaskTool(context),
    propose_meeting: proposeMeetingTool(context),
    propose_budget_line: proposeBudgetLineTool(context),
    propose_feedback: proposeFeedbackTool(context),
    ...(can(access, "read_feedback") ? feedbackReviewTools(context) : {}),
    ...(isTestDataEnabled
      ? {
          create_test_data: createTestDataTool(access, pagePath),
          fill_page_test_data: fillPageTestDataTool(access, pagePath),
        }
      : {}),

    find_projects: tool({
      description:
        "Liste les projets (sorties) visibles, avec artiste, type et étape actuelle. Recherche tolérante aux fautes si un texte est donné.",
      inputSchema: z.object({
        query: z
          .string()
          .max(100)
          .optional()
          .describe("Titre ou artiste, même approximatif"),
      }),
      execute: async ({ query }) => {
        const { projects } = await listProjects();
        let list = projects;
        if (query?.trim()) {
          const supabase = await createClient();
          const { data } = await supabase.rpc("search_projects", {
            p_query: query,
          });
          const order = new Map((data ?? []).map((r, i) => [r.id, i]));
          list = projects
            .filter((p) => order.has(p.id))
            .sort((a, b) => order.get(a.id)! - order.get(b.id)!);
        }
        const found = list.slice(0, 20);
        const waiting = new Set(
          handoverOf(projects, access).toAccept.map((p) => p.id),
        );
        return {
          projects: found.map((p) => ({
            projectId: p.id,
            title: p.title,
            artist: p.artistName,
            type: p.type,
            // pending = transmitted, not accepted yet; launched = accepted.
            status: p.status,
            waitingForYourAnswer: waiting.has(p.id),
            currentStage: p.currentStage
              ? `${p.currentStage.label} (${p.currentStage.state})`
              : null,
          })),
          sources: found.map((p): Source => ({
            label: p.title,
            href: routes.project(p.id),
          })),
        };
      },
    }),

    team_members: tool({
      description:
        "Les membres de l'équipe PDS OS (nom et poste), et pour un nom donné, la personne qu'il désigne (accents et fautes tolérés). Un prénom ou un nom de personne se cherche ici, jamais dans les projets.",
      inputSchema: z.object({
        name: z
          .string()
          .max(100)
          .optional()
          .describe("Nom ou prénom cité, même approximatif"),
      }),
      execute: async ({ name }) => {
        const supabase = await createClient();
        const { data, error } = await supabase
          .from("memberships")
          .select(
            "role, people!memberships_person_id_fkey(first_name, last_name)",
          )
          .eq("status", "approved");
        if (error)
          return { facts: [fr.assistant.readFailed], sources: [] as Source[] };
        const members = (data ?? []).flatMap((m) =>
          m.people
            ? [
                {
                  name: personName(m.people.first_name, m.people.last_name),
                  position:
                    fr.auth.members.roles[
                      m.role as keyof typeof fr.auth.members.roles
                    ] ?? m.role,
                },
              ]
            : [],
        );
        const wanted = name?.trim()
          ? matchByName(members, name, (m) => m.name)
          : null;
        const facts = name?.trim()
          ? wanted
            ? [
                `« ${name.trim()} » désigne ${wanted.name}, ${wanted.position.toLowerCase()}.`,
              ]
            : [
                `« ${name.trim()} » ne désigne aucun membre de l'équipe avec certitude.`,
              ]
          : members.map((m) => `${m.name} : ${m.position.toLowerCase()}.`);
        return { facts, sources: [] as Source[] };
      },
    }),

    project_status: tool({
      description:
        "État complet d'un projet : étapes, Brief, besoins, équipe, points ouverts, tâches (retards calculés), validation en attente, sortie. Appeler find_projects d'abord pour obtenir projectId.",
      inputSchema: z.object({ projectId: z.uuid() }),
      execute: async ({ projectId }) => projectStatus(projectId, access),
    }),

    my_todo: tool({
      description:
        "Ce qui attend l'utilisateur connecté : les projets qu'on lui a transmis et qu'il doit accepter, ses tâches et ses livrables à faire (retards calculés), les validations qui l'attendent, les propositions de PO à confirmer par projet.",
      inputSchema: z.object({}),
      execute: async () => {
        const [todo, { projects }] = await Promise.all([
          loadMyTodo(access),
          listProjects(),
        ]);
        // What waits for the person's answer comes first (UX test of
        // 09/10/2026: PO answered a new member without the project to accept).
        const { toAccept } = handoverOf(projects, access);
        const facts = [
          ...(todo.error ? [fr.assistant.readFailed] : []),
          ...toAccept.map(
            (p) =>
              `Projet « ${p.title} »${p.artistName ? ` (${p.artistName})` : ""} : il vous a été transmis et attend votre réponse (accepter, refuser ou demander une précision). C'est la première chose à faire.`,
          ),
          ...todo.deliverables.map(
            (d) =>
              `Livrable « ${d.title} » (${d.projectTitle}) : à concevoir, ${d.dueDate ? `échéance le ${formatDay(d.dueDate)}` : "sans échéance"}, ${lateness(d.overdue)}.`,
          ),
          ...todo.tasks.map(
            (t) =>
              `Tâche « ${t.title} » (${t.projectTitle}) : à faire, ${t.dueDate ? `échéance le ${formatDay(t.dueDate)}` : "sans échéance"}, ${lateness(t.overdue)}.`,
          ),
          ...todo.validations.map(
            (v) =>
              `Validation qui vous attend : ${v.stageLabel} de ${v.projectTitle}, demandée le ${formatDay(v.requestedAt)}.`,
          ),
          ...todo.proposals.map(
            (p) =>
              `${p.count} proposition(s) de PO à confirmer sur ${p.projectTitle}.`,
          ),
        ];
        return {
          facts: facts.length
            ? facts
            : [
                "Rien ne vous attend : aucun projet à accepter, aucune tâche, aucun livrable, aucune validation, aucune proposition.",
              ],
          sources: uniqueSources([
            ...toAccept.map((p) => ({
              label: `${p.title} · à accepter`,
              href: routes.project(p.id),
            })),
            ...todo.deliverables.map((d) => ({
              label: `${d.projectTitle} · ${d.title}`,
              href: d.href,
            })),
            ...todo.tasks.map((t) => ({
              label: `${t.projectTitle} · ${t.title}`,
              href: t.href,
            })),
            ...todo.validations.map((v) => ({
              label: `${v.projectTitle} · validation ${v.stageLabel}`,
              href: v.href,
            })),
            ...todo.proposals.map((p) => ({
              label: `${p.projectTitle} · propositions`,
              href: p.href,
            })),
          ]),
        };
      },
    }),

    recent_activity: tool({
      description:
        "Événements datés récents (calls, comptes rendus, Brief, tâches, points tranchés, étapes, validations, mise en ligne), pour répondre à « ça a avancé ? ».",
      inputSchema: z.object({
        projectId: z.uuid().optional(),
        days: z.number().int().min(1).max(90).default(7),
      }),
      execute: async ({ projectId, days }) => {
        const events = await loadRecentActivity({
          projectId,
          days,
          limit: 30,
        }).catch((error: unknown) => {
          console.error("recent_activity:", error);
          return null;
        });
        // A failed read is said as such, never as « nothing happened ».
        if (!events)
          return { days, facts: [fr.assistant.readFailed], sources: [] };
        return {
          days,
          facts: events.length
            ? events.map(activityLine)
            : [`Aucun événement enregistré sur les ${days} derniers jours.`],
          sources: uniqueSources(
            events.map((e) => ({
              label: `${e.projectTitle} · ${e.detail}`,
              href: e.href,
            })),
          ).slice(0, 8),
        };
      },
    }),

    search_calls: tool({
      description:
        "Cherche dans les comptes rendus et transcriptions des calls (recherche plein texte en français). Renvoie les passages, le call et le minutage.",
      inputSchema: z.object({
        query: z.string().min(2).max(200),
        projectId: z.uuid().optional(),
      }),
      execute: async ({ query, projectId }) => {
        const supabase = await createClient();
        const { data } = await supabase.rpc("search_calls", {
          p_query: query,
          p_project_id: projectId,
        });
        const results = data ?? [];
        return {
          results: results.map((r) => ({
            source: r.source,
            project: r.project_title,
            call: r.call_title,
            kind: r.kind,
            excerpt: r.excerpt,
            quote: r.quote,
            startSeconds: r.start_seconds,
          })),
          sources: uniqueSources(
            results.map((r) => ({
              label: `${r.project_title} · ${r.call_title}`,
              href: routes.projectCall(r.project_id, r.call_id),
            })),
          ),
        };
      },
    }),
  };
}

export type AssistantTools = ReturnType<typeof createAssistantTools>;
