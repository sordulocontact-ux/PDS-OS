/** Labo page of the app: artists read on TikTok screenshots. */
export const laboCaptures = {
  title: "Labo",
  description:
    "Fonctions en essai avant d'entrer dans l'app. Rien n'est enregistré ici.",
  section: "Artistes depuis des captures TikTok",
  sectionDescription:
    "PO lit chaque capture et regroupe les noms d'une même personne ; le code retrouve son compte Deezer.",
  drop: "Glissez vos captures ici, ou cliquez pour les choisir",
  dropHint: "Ou collez une capture (⌘ V). PNG, JPEG ou WebP, 8 Mo au plus.",
  empty: "Aucune capture pour l'instant.",
  remove: (name: string) => `Retirer ${name}`,
  retry: "Relire la capture",
  status: {
    queued: "En attente",
    reading: "Lecture…",
    done: "Lue",
    failed: "Non lue",
    notTiktok: "Pas TikTok ?",
  },
  nobody: "Aucun nom lisible sur cette capture.",
  role: {
    account: "Compte",
    sound: "Son utilisé",
    mentioned: "Mentionné",
  },
  alsoKnownAs: (names: string) => `Aussi : ${names}`,
  reasoning: "Raisonnement de PO",
  proposedName: (name: string) => `PO proposait « ${name} »`,
  match: {
    linked: "Compte trouvé",
    single: "À vérifier",
    several: "Plusieurs comptes",
    none: "Pas sur Deezer",
  },
  matchWhy: {
    linked: (titles: string) =>
      `Ses sorties correspondent à la capture : ${titles}.`,
    single:
      "Le compte Deezer de ce nom le plus suivi. Vérifiez que c'est bien lui.",
    several:
      "Plusieurs artistes Deezer portent ce nom. Ouvrez-les pour choisir.",
    none: "Aucun artiste Deezer ne porte exactement l'un de ces noms.",
  },
  openDeezer: "Ouvrir sur Deezer",
  fans: (count: string) => `${count} fans`,
  releases: (count: number) => (count === 1 ? "1 sortie" : `${count} sorties`),
  inCatalog: "Déjà au catalogue",
  socials: {
    label: "Réseaux",
    tiktok: "TikTok",
    instagram: "Instagram",
    spotify: "Spotify",
    none: "Aucun compte TikTok, Instagram ni Spotify trouvé.",
    source: {
      capture: "lu sur la capture",
      tiktok: "confirmé par TikTok",
      linktree: "sur son Linktree",
      musicbrainz: "via MusicBrainz",
      wikidata: "via Wikidata",
    },
  },
  otherAccounts: "Autres comptes du même nom",
  meta: (model: string, seconds: string) => `${model} · ${seconds} s`,
  errors: {
    unauthorized: "Votre session a expiré. Reconnectez-vous.",
    no_file: "Aucune image reçue.",
    file_too_large: "Image trop lourde : 8 Mo au plus.",
    unsupported_type: "Format non pris en charge : PNG, JPEG ou WebP.",
    provider_error:
      "Mistral n'a pas pu lire l'image (quota, clé ou panne). Relisez-la dans un instant.",
    deezer_unavailable:
      "Deezer ne répond pas. Relisez la capture dans un instant.",
    network: "Le serveur ne répond pas.",
  },
  skipped: (count: number) =>
    count === 1
      ? "1 fichier ignoré : seules les images sont lues."
      : `${count} fichiers ignorés : seules les images sont lues.`,
} as const;
