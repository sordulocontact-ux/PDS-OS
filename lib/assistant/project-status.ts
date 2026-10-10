import "server-only";

import type { Access } from "@/lib/auth/access";
import { fr } from "@/lib/i18n/fr";
import { projectKindLabel } from "@/lib/projects/labels";
import { progressLabel } from "@/lib/projects/progress";
import { routes } from "@/lib/auth/redirects";
import {
  familyLabel,
  formatDay,
  lateness,
  reviewLabel,
  stageState,
} from "@/lib/assistant/facts";
import { type Source } from "@/lib/assistant/sources";
import { assessFraming } from "@/lib/framing/assess";
import { DIMENSIONS } from "@/lib/framing/dimensions";
import { loadFramingKnowledge } from "@/lib/framing/knowledge";
import { loadFraming } from "@/lib/framing/queries";
import { isOverdue, todayInParis } from "@/lib/insights/dates";
import { getProject } from "@/lib/projects/queries";
import { getProjectRelease } from "@/lib/release/queries";
import { createClient } from "@/lib/supabase/server";

/** Facts about one project, assembled from the existing page queries. */
export async function projectStatus(projectId: string, access: Access) {
  const project = await getProject(projectId);
  if (!project) return { found: false as const };

  const [framing, knowledge, release] = await Promise.all([
    loadFraming(projectId, access),
    loadFramingKnowledge(projectId, access),
    createClient().then((supabase) => getProjectRelease(supabase, projectId)),
  ]);
  const today = todayInParis();
  const people = new Map(
    (framing?.members ?? []).map((m) => [m.personId, m.name]),
  );

  const sources: Source[] = [
    { label: project.title, href: routes.project(projectId) },
    {
      label: `${project.title} · Cadrage`,
      href: routes.projectFraming(projectId),
    },
    {
      label: `${project.title} · Sortie`,
      href: routes.projectRelease(projectId),
    },
  ];

  const facts: string[] = [];
  facts.push(
    `Projet « ${project.title} »${project.artistName ? ` de ${project.artistName}` : ""} (${projectKindLabel({ type: project.type, musicFormat: project.musicFormat, contentFormatName: project.contentFormat?.name ?? null })})${project.ownerName ? `, piloté par ${project.ownerName}` : ""}.`,
  );
  facts.push(
    project.stages.length === 0
      ? `Projet pas encore lancé (${fr.transmission.statuses[project.status]}).`
      : project.currentStage
        ? `Où en est le projet : ${progressLabel(project.currentStage)} (${stageState(project.currentStage.state)}).`
        : "Projet terminé.",
  );
  // A project not launched yet is presented by what was known when it was
  // transmitted (its initial context is data, quoted as written).
  if (project.stages.length === 0) {
    if (project.initialContext)
      facts.push(`Contexte initial : « ${project.initialContext} ».`);
    if (project.dueDate)
      facts.push(`Échéance du projet : ${formatDay(project.dueDate)}.`);
  }
  // In the words of the workflows (UX test of 09/10/2026: seven stages
  // beside four workflows); a stage not decided yet (Défense) is not said.
  for (const stage of project.stages) {
    if (stage.state !== "not_started" && stage.key !== "defense")
      facts.push(`${progressLabel(stage)} : ${stageState(stage.state)}.`);
  }
  // The team as the project knows it (UX test of 09/10/2026: PO did not
  // know « Nora » was the creative director).
  if (project.ownerName)
    facts.push(`Chef de projet responsable : ${project.ownerName}.`);
  for (const creative of knowledge?.creatives ?? [])
    facts.push(`Directeur créatif du projet : ${creative.name}.`);
  if (framing?.pendingValidation) {
    const asked = framing.pendingValidation.requestedAt;
    facts.push(
      `Validation du Cadrage demandée${asked ? ` le ${formatDay(asked)}` : ""} à ${framing.pendingValidation.validatorName}, en attente de sa décision.`,
    );
  }
  // The Cadrage as its page shows it (assessFraming), never the legacy free
  // fields: « Temporalité : pas encore renseigné » was given as the cause of
  // a Brief that could not be sent (UX test of 09/10/2026).
  if (knowledge) {
    const assessment = assessFraming(knowledge);
    for (const dimension of DIMENSIONS) {
      const d = assessment.dimensions.find((x) => x.dimension === dimension);
      if (!d) continue;
      facts.push(
        `Cadrage — ${fr.framingIntel.dimensions[dimension]} : ${d.counts.known} connue(s), ${d.counts.to_confirm} à confirmer, ${d.counts.missing} manquante(s).`,
      );
    }
    facts.push(
      assessment.ready
        ? "Brief : toutes les informations nécessaires sont là, il peut être créé ou envoyé."
        : `Brief : ${assessment.blocking.length} information(s) nécessaire(s) à confirmer ou à compléter avant de le créer.`,
    );
    const validators = framing?.validators ?? [];
    if (validators.length !== 1)
      facts.push(
        `Envoi en validation impossible : ${fr.framing.errors[validators.length === 0 ? "no_validator" : "multiple_validators"]}`,
      );
  }
  for (const need of framing?.needs ?? []) {
    facts.push(
      `Besoin « ${need.label} » (${familyLabel(need.family)}) : ${need.state === "committed" ? "engagé" : "identifié"}, ${reviewLabel(need.review_status)}.`,
    );
  }
  for (const member of framing?.team ?? []) {
    facts.push(
      `Équipe : ${member.display_name}${member.role ? ` (${member.role})` : ""}, ${reviewLabel(member.review_status)}.`,
    );
  }
  for (const point of framing?.openPoints ?? []) {
    if (point.status === "open")
      facts.push(`Point ouvert (décision non prise) : « ${point.question} ».`);
  }
  for (const task of framing?.tasks ?? []) {
    const late =
      task.status === "todo" &&
      task.due_date !== null &&
      isOverdue(task.due_date, today);
    facts.push(
      `Tâche « ${task.title} » : ${task.status === "done" ? "faite" : "à faire"}, responsable ${people.get(task.assignee_person_id) ?? "inconnu"}, ${task.due_date ? `échéance le ${formatDay(task.due_date)}` : "sans échéance"}${task.status === "todo" ? `, ${lateness(late)}` : ""}.`,
    );
  }
  const r = release?.release;
  if (!r) facts.push("Aucune sortie enregistrée (ISRC, date) pour ce projet.");
  else {
    const platforms = (release?.links ?? [])
      .filter((l) => l.source !== "manual")
      .map((l) => l.platform);
    facts.push(
      `Sortie « ${r.title} »${r.isrc ? `, ISRC ${r.isrc}` : ", sans ISRC"}${r.planned_release_date ? `, prévue le ${formatDay(r.planned_release_date)}` : ""}.`,
    );
    facts.push(
      r.online_detected_at
        ? `En ligne depuis le ${formatDay(r.online_detected_at)} sur ${platforms.length} plateforme(s) : ${platforms.join(", ")}.`
        : "Pas encore détectée en ligne.",
    );
  }

  return { found: true as const, facts, sources };
}
