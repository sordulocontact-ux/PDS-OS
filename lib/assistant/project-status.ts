import "server-only";

import type { Access } from "@/lib/auth/access";
import { fr } from "@/lib/i18n/fr";
import { routes } from "@/lib/auth/redirects";
import {
  familyLabel,
  fieldLabel,
  formatDay,
  lateness,
  reviewLabel,
  stageState,
} from "@/lib/assistant/facts";
import { type Source } from "@/lib/assistant/sources";
import { loadFraming } from "@/lib/framing/queries";
import { isOverdue, todayInParis } from "@/lib/insights/dates";
import { getProject } from "@/lib/projects/queries";
import { getProjectRelease } from "@/lib/release/queries";
import { createClient } from "@/lib/supabase/server";

/** Facts about one project, assembled from the existing page queries. */
export async function projectStatus(projectId: string, access: Access) {
  const project = await getProject(projectId);
  if (!project) return { found: false as const };

  const [framing, release] = await Promise.all([
    loadFraming(projectId, access),
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
    `Projet « ${project.title} »${project.artistName ? ` de ${project.artistName}` : ""} (${fr.shell.projectTypes[project.type]})${project.ownerName ? `, piloté par ${project.ownerName}` : ""}.`,
  );
  facts.push(
    project.stages.length === 0
      ? `Projet pas encore lancé, aucune étape (${fr.transmission.statuses[project.status]}).`
      : project.currentStage
        ? `Étape actuelle : ${project.currentStage.label} (${stageState(project.currentStage.state)}).`
        : "Toutes les étapes sont validées.",
  );
  for (const stage of project.stages) {
    if (stage.state !== "not_started")
      facts.push(`Étape ${stage.label} : ${stageState(stage.state)}.`);
  }
  if (framing?.pendingValidation) {
    facts.push(
      `Validation du Cadrage demandée à ${framing.pendingValidation.validatorName}, en attente de sa décision.`,
    );
  }
  for (const field of framing?.fields ?? []) {
    facts.push(
      field.value
        ? `Brief — ${fieldLabel(field.key)} : ${field.status === "proposed" ? "proposé par PO, à confirmer" : "confirmé"} — « ${field.value} ».`
        : `Brief — ${fieldLabel(field.key)} : pas encore renseigné.`,
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
    const late = task.status === "todo" && isOverdue(task.due_date, today);
    facts.push(
      `Tâche « ${task.title} » : ${task.status === "done" ? "faite" : "à faire"}, responsable ${people.get(task.assignee_person_id) ?? "inconnu"}, échéance le ${formatDay(task.due_date)}${task.status === "todo" ? `, ${lateness(late)}` : ""}.`,
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
