/**
 * Facts phrased by code, in French, for the model to relay. The model is weak
 * at interpreting raw states (it confused "Brief field proposed" with "stage
 * not validated"); giving it ready-made sentences leaves it nothing to infer.
 * This text is model context; activity labels are shared with the UI.
 */

import { assistant } from "@/lib/i18n/fr/assistant";

const fr = { assistant };

const STAGE_STATE: Record<string, string> = {
  not_started: "pas commencée",
  in_progress: "en cours",
  awaiting_validation: "en attente de validation",
  validated: "validée",
};
const FIELD: Record<string, string> = {
  objective: "Objectif",
  timing: "Temporalité",
  frame: "Cadre",
};
const FAMILY: Record<string, string> = {
  creation_content: "création & contenus",
  promotion_distribution: "promotion & diffusion",
  experiences_activations: "expériences & activations",
  // Postes of a budget line (MKT-S1-11, joined by the artist's kinds of
  // spend on 09/11/2026).
  content_production: "production de contenus",
  photo_video: "photo et vidéo",
  image: "image",
  advertising: "publicité & promotion",
  events: "événements & activations",
  studio: "studio",
  services: "prestations",
  coaching: "coaching",
  equipment: "matériel",
  transport: "transport",
  lodging: "hébergement",
  per_diem: "per diem",
  food: "restauration",
  food_delivery: "livraison de repas",
  misc: "frais divers",
  other: "autre",
};
const REVIEW: Record<string, string> = {
  proposed: "proposé par PO, à confirmer",
  confirmed: "confirmé",
  rejected: "rejeté",
};
const ACTIVITY = fr.assistant.activityKinds;

const dateFr = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Europe/Paris",
});
export const formatDay = (value: string) =>
  dateFr.format(new Date(value.length === 10 ? `${value}T12:00:00Z` : value));

export const stageState = (state: string) => STAGE_STATE[state] ?? state;
export const fieldLabel = (key: string) => FIELD[key] ?? key;
export const familyLabel = (family: string) => FAMILY[family] ?? family;
export const reviewLabel = (review: string) => REVIEW[review] ?? review;

/** One dated line per event: "25 septembre 2026 — Lueur — Brief rejeté : Cadre". */
export function activityLine(event: {
  at: string;
  kind: string;
  projectTitle: string;
  detail: string;
}): string {
  return `${formatDay(event.at)} — ${event.projectTitle} — ${ACTIVITY[event.kind] ?? event.kind} : ${event.detail}`;
}

/** Explicit both ways: the model must never judge a date against its own idea of today. */
export const lateness = (late: boolean) =>
  late ? "EN RETARD" : "dans les temps";
