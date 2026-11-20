import type { GuideTopic } from "@/lib/assistant/guide/types";

export const libraryFilesTopics: GuideTopic[] = [
  {
    key: "contracts",
    title: "Contrats",
    summary:
      "Tous les contrats, de la rédaction à la signature, et les modèles qui servent à les générer.",
    keywords: [
      "contrat",
      "contrats",
      "modele",
      "modeles",
      "signature",
      "signer",
      "partie",
      "licence",
      "edition",
      "resilier",
      "valider un contrat",
    ],
    nav: "/app/contracts",
    facts: [
      "La page a deux onglets : Contrats et Modèles.",
      "Un contrat a un titre, un type (contrat d'artiste, licence, distribution, édition, coproduction, droit à l'image, prestation, partenariat, autre), des parties du Réseau, un responsable, une échéance et des versions de fichiers.",
      "Vues : Tous, En préparation, À valider, À signer, Signés, Résiliés.",
      "Parcours : en préparation, soumis, validé par le business manager (ou modifications demandées avec un commentaire), envoyé pour signature, signé avec sa date, éventuellement résilié. La direction peut aussi valider : elle supervise. Signer pour PDS reste la direction.",
      "Un contrat est figé pendant sa relecture et une fois résilié. « Expiré » est calculé : un contrat signé dont la date de fin est passée.",
      "Un modèle se lit comme un document : son texte tel quel, chaque valeur à remplir montrée comme un blanc avec ce qui y va (« Nom civil »), et « Voir le PDF ». Le business manager le valide ou le refuse avec sa raison.",
      "Un modèle ne se modifie pas dans PDS OS : « Modifier » ouvre son document source ; une fois corrigé, il s'importe en nouvelle version (« ⋯ › Nouvelle version »), à valider à son tour. Un modèle validé ne change jamais. Les contrats d'un projet se génèrent depuis les modèles dans son Juridique.",
      "Un modèle est en français ou en anglais, dit à son import. Un contrat est dans la langue de son modèle : pour un artiste anglais, on choisit le modèle en anglais dans les contrats à prévoir du Juridique.",
      "PO n'écrit ni modèle ni clause, et ne traduit jamais un contrat.",
    ],
    faq: [
      {
        q: "Qui valide un contrat ?",
        a: "Le business manager. La direction peut aussi valider : elle supervise. Les deux sont prévenus quand un contrat est soumis.",
      },
      {
        q: "Qui valide un modèle de contrat ?",
        a: "Le business manager, dans l'onglet Modèles de la page Contrats ; la direction peut aussi le faire.",
      },
      {
        q: "Comment faire un contrat en anglais ?",
        a: "Importer le modèle en anglais (« Langue du contrat » : Anglais), le faire valider, puis le choisir pour la personne dans les contrats à prévoir du Juridique. PO ne traduit pas un modèle français.",
      },
    ],
    permissions: ["manage_contracts", "validate_contracts"],
  },
  {
    key: "files",
    title: "Fichiers",
    summary:
      "Tous les fichiers que vous pouvez ouvrir, dans leur dernière version.",
    keywords: [
      "fichier",
      "fichiers",
      "document",
      "documents",
      "version",
      "telecharger",
      "importer",
      "pochette",
      "audio",
      "bibliotheque",
    ],
    nav: "/app/files",
    facts: [
      "La page rassemble les fichiers des artistes, des titres, des projets et des contrats, dans leur dernière version, avec ce à quoi chacun est rattaché.",
      "Onglets par rattachement : Tous, Artistes, Titres, Projets, Contrats. Recherche et filtres par catégorie, type de fichier et auteur.",
      "On ne dépose pas de fichier ici : on le dépose dans la fiche de l'artiste, du titre, du projet ou du contrat, qui le classe par catégorie.",
      "Chaque fichier peut avoir de nouvelles versions : l'ancienne reste consultable.",
      "Vous ne voyez que les fichiers que vous avez le droit de lire.",
    ],
    faq: [
      {
        q: "Où déposer un fichier ?",
        a: "Dans l'onglet Fichiers de la fiche concernée (artiste, titre, projet ou contrat).",
      },
    ],
  },
  {
    key: "labo",
    title: "Repérage",
    summary:
      "Retrouver des artistes repérés sur TikTok à partir d'une capture ou d'un lien.",
    keywords: [
      "reperage",
      "reperer",
      "tiktok",
      "instagram",
      "capture",
      "artiste repere",
      "lien",
      "labo",
      "deezer",
    ],
    nav: "/app/labo",
    facts: [
      "On dépose une capture d'écran TikTok (glisser, choisir ou coller), ou on colle un lien TikTok ou Instagram.",
      "PO lit la capture et regroupe les noms d'une même personne ; le code retrouve ensuite le profil TikTok, le compte Deezer et les réseaux.",
      "Un compte peut être « Compte trouvé », « À vérifier » ou « Plusieurs comptes » (vous choisissez). Il peut aussi n'être pas sur Deezer.",
      "Rien n'est enregistré sans un clic : « Ajouter au Réseau » crée le contact dans l'onglet Artistes repérés du Réseau.",
      "La page est ouverte à tous les membres. Un raccourci iPhone peut envoyer une capture directement.",
    ],
    faq: [
      {
        q: "Les artistes repérés sont-ils ajoutés au Catalogue ?",
        a: "Non, ils vont dans le Réseau. Ils ne rejoignent le Catalogue qu'une fois signés ou en collaboration.",
      },
    ],
  },
];
