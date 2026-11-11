import type { GuideTopic } from "@/lib/assistant/guide/types";

/** The Business module (BIZ 2 to 4): the deals. */
export const businessTopics: GuideTopic[] = [
  {
    key: "deals",
    title: "Deals",
    summary:
      "Les négociations avec les artistes (PDS MIC d'abord) : étapes, termes négociés, prochaine action et relances.",
    keywords: [
      "deal",
      "deals",
      "negociation",
      "negocier",
      "business",
      "business manager",
      "accord de principe",
      "relance",
      "termes",
      "avance",
      "cachet",
      "royalties",
      "splits",
    ],
    nav: "/app/deals",
    facts: [
      "Un deal est une négociation avec un artiste, à part du projet : la personne qui le négocie écrit sur le deal, jamais dans le projet.",
      "Pour un PDS MIC, un deal s'ouvre pour la participation d'un artiste à un titre ; son contrat est celui de la participation.",
      "Étapes : À contacter, Call prévu, Négociation, Accord de principe, Contractualisation, Signé ; ou Abandonné, toujours avec un motif.",
      "L'accord de principe est proposé par la personne qui négocie et validé par la direction, qui peut le renvoyer en négociation avec un motif. La contractualisation attend un accord validé.",
      "Chaque terme négocié (splits auteur-compositeur, part du master, royalties, avance ou cachet, crédits, territoires, durée, exclusivité, promo) a sa valeur, son état (Proposé par PDS, Contre-proposition, Confirmé, À définir) et l'historique de ses changements.",
      "Chaque deal a une prochaine action et une date de relance : le jour venu, PDS OS prévient la personne qui négocie, et l'action apparaît dans son Travail et son accueil.",
      "La page Deals est une seule liste : onglets En cours, À relancer, Signés, Abandonnés ; filtres par étape, personne qui négocie et projet.",
    ],
    faq: [
      {
        q: "Qui voit un deal ?",
        a: "La direction voit tous les deals. La personne qui le négocie voit les siens, et seulement eux. Le responsable du projet lié le lit sans le modifier.",
      },
      {
        q: "Qui crée un deal et le confie ?",
        a: "La direction, ou le responsable du projet lié, avec « Nouveau deal » sur la page Deals ; il se confie à un membre qui négocie (business manager, business).",
      },
    ],
    permissions: ["negotiate", "validate"],
  },
];
