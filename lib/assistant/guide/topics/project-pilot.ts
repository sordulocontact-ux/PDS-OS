import type { GuideTopic } from "@/lib/assistant/guide/types";

export const projectPilotTopics: GuideTopic[] = [
  {
    key: "budget",
    title: "Budget",
    summary: "L'enveloppe du projet et chaque dépense, d'estimée à payée.",
    keywords: [
      "budget",
      "enveloppe",
      "depense",
      "cout",
      "paye",
      "engage",
      "estime",
      "facture",
      "reste",
      "depassement",
    ],
    projectSection: "budget",
    where: "Dans un projet lancé › Pilotage › Budget.",
    facts: [
      "La page Budget montre l'enveloppe fixée à la création du projet et chaque ligne de dépense.",
      "Une ligne passe par les statuts Estimé, Proposé, Engagé, Facturé, Payé. Un montant proposé ne consomme pas l'enveloppe : accepté, il devient engagé.",
      "Les totaux et ce qui reste sont calculés à partir des lignes, jamais saisis. Un dépassement est écrit en toutes lettres.",
      "Chaque dépense a une famille (production de contenus, publicité et promotion, événements et activations, prestations, déplacements, frais divers, autre).",
      "Une dépense peut être liée à un livrable et porter son justificatif.",
      "Le Budget n'est visible que par le responsable du projet et la direction.",
      "Un bouton « Ajouter une dépense » existe aussi dans les pages du Marketing.",
    ],
    faq: [
      {
        q: "Qui peut modifier le budget ?",
        a: "Le responsable du projet. La direction le lit.",
      },
    ],
  },
  {
    key: "project_team",
    title: "Équipe d'un projet",
    summary:
      "Qui travaille sur un projet : membres, équipe créative et intervenants extérieurs.",
    keywords: [
      "equipe du projet",
      "qui fait quoi",
      "directeur creatif",
      "responsable",
      "intervenants",
      "charge",
    ],
    projectSection: "team",
    where:
      "Dans un projet lancé ; la page n'a plus d'entrée dans la navigation du projet, chaque étape affiche un bloc « Qui fait quoi ».",
    facts: [
      "La page Équipe d'un projet réunit les membres internes et leur charge, l'équipe créative et les intervenants cités dans les calls.",
      "Le responsable du projet est le chef de projet qui l'a accepté.",
      "La direction créative est facultative et se choisit à la création ; elle ne donne aucun droit de validation.",
      "Chaque étape d'un workflow a son bloc « Qui fait quoi », avec le responsable de l'étape et celui qui valide.",
      "Les externes (ingénieur, prestataire) agissent par un lien privé, sans compte PDS OS.",
    ],
    faq: [
      {
        q: "Comment ajouter un directeur créatif à un projet ?",
        a: "La direction ou le chef de projet responsable le désigne ; plusieurs directeurs créatifs sont possibles sur un projet.",
      },
    ],
  },
  {
    key: "validations",
    title: "Validations",
    summary: "Les validations qu'un projet attend, avec leur décision.",
    keywords: [
      "validation",
      "valider",
      "validations",
      "approuver",
      "decision",
      "valideur",
      "refuser",
      "modification",
    ],
    projectSection: "validations",
    where: "Dans un projet lancé › Pilotage › Validations.",
    facts: [
      "La page Validations d'un projet liste les actions de type « valider » : version à écouter, brief, devis, bilan…",
      "Ce sont les mêmes informations que dans Travail, filtrées sur les validations.",
      "Une validation peut aussi se refuser ou demander une modification, toujours avec un motif.",
      "Qui valide dépend de l'étape : la direction pour les briefs et bilans, une personne désignée pour les versions d'un mix.",
      "Une étape validée est définitive.",
      "L'historique des décisions se lit dans la page Activité du projet.",
    ],
    faq: [
      {
        q: "Où voir les validations qui m'attendent, tous projets confondus ?",
        a: "Dans Travail, onglet « À valider ».",
      },
    ],
    permissions: ["validate"],
  },
];
