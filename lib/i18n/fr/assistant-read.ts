/**
 * The read functions of PO (lib/assistant/read/): facts worded by code.
 * Model context, also shown under PO's answer. One block per domain.
 */
export const assistantRead = {
  failed:
    "La lecture a échoué : l'information n'a pas pu être lue pour l'instant.",
  projectNotFound: (name: string) =>
    `Aucun projet visible ne correspond à « ${name} ».`,
  whichProject:
    "Aucun projet nommé et PO n'a pas été ouvert depuis la page d'un projet : demande de quel projet il s'agit.",
  capped: (shown: number, total: number) =>
    `Réponse partielle : seuls ${shown} éléments sur ${total} sont listés.`,
  // search_everything: where each record lives (lib/assistant/read/search.ts).
  search: {
    kinds: {
      project: "Projet",
      artist: "Artiste",
      master: "Titre",
      contract: "Contrat",
      contact: "Contact du Réseau",
      template: "Modèle de contrat",
      call: "Call ou réunion",
    },
    places: {
      project: (title: string) => `Projets › ${title}`,
      artist: (name: string) => `Artistes › ${name}`,
      master: (label: string, artists: string) =>
        `Catalogue › ${label}${artists ? ` (${artists})` : ""}`,
      contract: (title: string, project: string | null) =>
        `Contrats › ${title}${project ? ` (projet ${project})` : ""}`,
      contact: (name: string) => `Réseau › ${name}`,
      template: (name: string) => `Contrats › Modèles › ${name}`,
      call: (title: string) => `Calls › ${title}`,
    },
    hit: (kind: string, place: string) => `${kind} : ${place}.`,
    nothing: (query: string) =>
      `Rien de visible ne porte un nom proche de « ${query} » (projets, artistes, titres, contrats, modèles, Réseau, calls).`,
  },
};
