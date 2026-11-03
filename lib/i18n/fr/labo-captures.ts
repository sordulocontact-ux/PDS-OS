/** Repérage page of the app (route /app/labo): artists read on TikTok
 * screenshots. Named « Repérage » by Sacha on 03/11/2026. */
export const laboCaptures = {
  title: "Repérage",
  description:
    "Retrouvez les artistes repérés sur TikTok à partir d'une capture. Rien n'est enregistré sans votre clic.",
  section: "Artistes depuis des captures TikTok",
  sectionDescription:
    "PO lit chaque capture et regroupe les noms d'une même personne ; le code retrouve son profil TikTok, son compte Deezer et ses réseaux. « Ajouter au Réseau » l'enregistre dans l'onglet Artistes du Réseau.",
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
    chosen: "Choisi par vous",
  },
  matchWhy: {
    single:
      "Le compte Deezer de ce nom le plus suivi, sans autre preuve. Vérifiez que c'est bien lui.",
    several:
      "Plusieurs artistes Deezer portent ce nom et rien ne les départage sûrement : choisissez le bon.",
    none: "Aucun artiste Deezer ne porte exactement l'un de ces noms.",
    chosen: "Le compte Deezer que vous avez choisi.",
  },
  // Why the code is sure of a Deezer account, one sentence per proof.
  proofs: {
    account: (source: string, network: string, handle: string) =>
      `${source} relie ce compte Deezer à son ${network} ${handle}.`,
    bio: (words: string) => `Sa bio Deezer cite ${words}.`,
    releases: (titles: string) =>
      `Ses sorties correspondent à la capture : ${titles}.`,
    sources: { musicbrainz: "MusicBrainz", wikidata: "Wikidata" },
  },
  // Picking the Deezer account by hand.
  chooser: {
    title: "Quel est son compte Deezer ?",
    suggested: "PO penche pour lui",
    undecided: "PO ne tranche pas :",
    pick: (name: string) => `Choisir ${name}`,
    pickShort: "C'est lui",
    current: "Compte retenu",
    otherLink: "Autre lien Deezer",
    otherPlaceholder: "deezer.com/artist/… ou link.deezer.com/…",
    use: "Utiliser ce lien",
    pending: "Lecture sur Deezer…",
    open: "Pas le bon compte Deezer ?",
    close: "Garder ce compte",
    errors: {
      invalid_link:
        "Ce n'est pas le lien d'une page artiste Deezer (deezer.com/artist/…).",
      not_found: "Deezer ne connaît pas cet artiste.",
      unavailable: "Deezer ne répond pas. Réessayez dans un instant.",
    },
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
    none: "Aucun compte TikTok, Instagram ni Spotify, aucun e-mail trouvé.",
    source: {
      capture: "lu sur la capture",
      tiktok: "confirmé par TikTok",
      bio: "dans sa bio TikTok",
      linktree: "sur son Linktree",
      musicbrainz: "via MusicBrainz",
      wikidata: "via Wikidata",
    },
  },
  // The public TikTok profile, read on its page.
  profile: {
    followers: (count: string) => `${count} abonnés TikTok`,
    videos: (count: number) => (count === 1 ? "1 vidéo" : `${count} vidéos`),
    verified: "Compte certifié",
    bio: "Bio TikTok",
  },
  // What the person does, proposed for the Réseau's roles.
  activity: {
    clue: (word: string, where: string) => `« ${word} » ${where}`,
    where: {
      tiktok: "dans sa bio TikTok",
      capture: "sur la capture",
    },
    po: "d'après PO",
  },
  email: {
    label: "E-mail",
    source: {
      capture: "lu sur la capture",
      tiktok: "dans sa bio TikTok",
      linktree: "sur son Linktree",
    },
  },
  // Saving a person to the Réseau (Artistes tab).
  network: {
    add: "Ajouter au Réseau",
    title: "Ajouter au Réseau",
    description:
      "Tout ce qui a été trouvé est déjà rempli : relisez, corrigez, puis enregistrez. Le contact rejoint l'onglet Artistes du Réseau.",
    inNetwork: "Dans le Réseau",
    added: "Ajouté au Réseau",
    open: (name: string) => `Ouvrir ${name} dans le Réseau`,
    // Notes of the new contact, written by the code.
    notes: {
      spotted: (date: string, role: string) =>
        `Repéré sur TikTok le ${date} (${role}).`,
      role: {
        account: "compte qui publie",
        sound: "artiste du son utilisé",
        mentioned: "mentionné sur la vidéo",
      },
      tiktok: (followers: string | null, videos: number | null) =>
        `TikTok : ${[
          followers && `${followers} abonnés`,
          videos !== null && (videos === 1 ? "1 vidéo" : `${videos} vidéos`),
        ]
          .filter(Boolean)
          .join(", ")}.`,
      deezer: (fans: string, releases: number) =>
        `Deezer : ${fans} fans, ${releases === 1 ? "1 sortie" : `${releases} sorties`}.`,
      bio: (bio: string) => `Bio TikTok : « ${bio} »`,
    },
  },
  meta: (model: string, seconds: string) => `${model} · ${seconds} s`,
  errors: {
    unauthorized: "Votre session a expiré. Reconnectez-vous.",
    no_file: "Aucune image reçue.",
    file_too_large: "Image trop lourde : 8 Mo au plus.",
    unsupported_type: "Format non pris en charge : PNG, JPEG ou WebP.",
    provider_error:
      "Mistral n'a pas pu lire l'image (quota, clé ou panne). Relisez-la dans un instant.",
    // The member's daily limit of requests to PO (lib/ai/quota.ts).
    ai_quota:
      "Limite du jour de requêtes à PO atteinte : le compteur repart à zéro à minuit ; le directeur général peut l'augmenter dans Équipe.",
    deezer_unavailable:
      "Deezer ne répond pas. Relisez la capture dans un instant.",
    network: "Le serveur ne répond pas.",
  },
  skipped: (count: number) =>
    count === 1
      ? "1 fichier ignoré : seules les images sont lues."
      : `${count} fichiers ignorés : seules les images sont lues.`,
} as const;
