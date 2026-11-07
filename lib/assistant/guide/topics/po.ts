import type { GuideTopic } from "@/lib/assistant/guide/types";

// PO about itself (docs/ASSISTANT.md § 1, 2 bis, 2 ter; quota: docs/
// ARCHITECTURE.md § 5 bis). Update it with any change to what PO reads,
// prepares, saves or counts.
export const poTopics: GuideTopic[] = [
  {
    key: "po",
    title: "PO",
    summary:
      "L'assistant : ce qu'il sait faire, ce qu'il ne fait pas, l'historique des conversations, la limite du jour, la fenêtre Espace Espace.",
    keywords: [
      "po",
      "assistant",
      "ia",
      "intelligence artificielle",
      "conversation",
      "historique",
      "enregistre",
      "sauvegarde",
      "prive",
      "quota",
      "limite",
      "requete",
      "espace espace",
      "dictee",
      "micro",
      "chat",
      "sais faire",
      "tu peux",
      "capable",
    ],
    nav: "/app/assistant",
    facts: [
      "PO est l'assistant de PDS OS. Il lit les données que vous pouvez voir (projets, étapes, Brief, tâches, validations, calls et comptes rendus, artistes, fiches des titres, équipe, contrats, Juridique, Master, Distribution, Marketing, budget, calendrier, fichiers, Réseau, notifications) et répond avec les faits et les liens affichés sous sa réponse. Il sait aussi retrouver où se trouve un élément et expliquer comment marche l'application.",
      "Il prépare des créations et des modifications (artiste, titre et sa fiche, projet, contrat, modèle de contrat, contact du Réseau, tâche, dépense, réunion, retour sur l'application) : il ouvre le vrai formulaire pré-rempli, et c'est vous qui relisez et enregistrez.",
      "Il ne décide jamais : valider une étape, transmettre un projet, soumettre, envoyer ou signer un contrat restent vos gestes, sur la page concernée. Il n'écrit aucune clause juridique et ne cherche pas sur Internet.",
      "Il utilise vos droits, jamais plus : il ne voit que ce que vous voyez.",
      "Il explique les notions du métier (ISRC, ISWC, droits master et édition, SACEM, splits, sample…) à partir de connaissances générales, signalées comme à vérifier : sans chiffre, sans date et sans conseil juridique. Pour un cas réel, il renvoie au Juridique du projet.",
      "Il ne lit pas les écoutes ni les statistiques de streaming, qui ne sont pas branchées.",
      "Quand une réponse reste sans résultat, PDS OS le compte de façon anonyme, sans le texte de la question ni le nom de la personne, pour savoir où PO doit progresser.",
      "Chaque conversation est enregistrée après chaque réponse, dans l'historique de la page PO. Elle est privée : vous seul la lisez, même le directeur général n'y a pas accès. Elle est gardée jusqu'à ce que vous la supprimiez. Supprimer une conversation ne touche à rien de ce que PO a aidé à créer.",
      "Chaque message à PO compte pour une requête de votre limite du jour. Le compteur repart à zéro à minuit, heure de Paris. Votre utilisation se lit dans Paramètres (menu de votre compte, en bas de la barre latérale) ; le directeur général règle la limite de chacun dans Équipe.",
      "Deux appuis rapides sur Espace, depuis n'importe quelle page, ouvrent PO dans une fenêtre : il écoute tout de suite, votre demande part dès la fin de la dictée, et il sait sur quelle page vous êtes. Échap annule. Ces conversations sont enregistrées aussi, avec la page d'ouverture.",
    ],
    faq: [
      {
        q: "Mes conversations avec PO sont-elles enregistrées ?",
        a: "Oui, après chaque réponse, dans l'historique de la page PO (barre latérale › PO). Elles sont privées et gardées jusqu'à ce que vous les supprimiez.",
      },
      {
        q: "Qui peut lire mes conversations ?",
        a: "Vous seul. Même le directeur général n'y a pas accès.",
      },
      {
        q: "Comment supprimer une conversation ?",
        a: "Sur la page PO, dans l'historique, « ⋯ » sur la ligne de la conversation, puis Supprimer.",
      },
      {
        q: "Combien de questions puis-je poser à PO ?",
        a: "Autant que votre limite du jour, visible dans Paramètres. Le directeur général peut l'augmenter dans Équipe.",
      },
      {
        q: "PO peut-il valider, envoyer ou signer à ma place ?",
        a: "Non. Il prépare, vous relisez et vous décidez, sur la page concernée.",
      },
    ],
  },
];
