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
      "image",
      "capture",
      "photo",
      "joindre",
      "chat",
      "sais faire",
      "tu peux",
      "capable",
      "je veux",
      "resume de la semaine",
    ],
    nav: "/app/assistant",
    facts: [
      "PO est l'assistant de PDS OS. Il lit les données que vous pouvez voir (projets, étapes, Brief, tâches, validations, calls et comptes rendus, artistes, fiches des titres, équipe, contrats, Juridique, Master, Distribution, Marketing, budget, calendrier, fichiers, Réseau, notifications, deals, et la Finance pour qui la lit : trésorerie et point bas, factures en retard, dépenses à payer, enveloppes, justificatifs manquants) et répond avec les faits qu'il a lus (« A lu … données », replié au-dessus de la réponse) et les liens (« Sources », sous la réponse). Il sait aussi retrouver où se trouve un élément et expliquer comment marche l'application.",
      "Il prépare des créations et des modifications (artiste, titre et sa fiche, projet, contrat, modèle de contrat, contact du Réseau, tâche, dépense, réunion, retour sur l'application) : il ouvre le vrai formulaire pré-rempli, et c'est vous qui relisez et enregistrez.",
      "Après le call d'un deal, il lit la transcription et propose sur la page du deal ce qui a changé (un terme, une étape, la prochaine action), avec le passage où c'est dit : « Vérifier » ouvre le vrai formulaire pré-rempli, vous corrigez et enregistrez, ou vous l'écartez. Il ne change jamais un deal lui-même.",
      "Il ne décide jamais : valider une étape, transmettre un projet, soumettre, envoyer ou signer un contrat restent vos gestes, sur la page concernée. Il n'écrit aucune clause juridique et ne cherche pas sur Internet.",
      "Il utilise vos droits, jamais plus : il ne voit que ce que vous voyez.",
      "Il explique les notions du métier (ISRC, ISWC, droits master et édition, SACEM, splits, sample…) à partir de connaissances générales, signalées comme à vérifier : sans chiffre, sans date et sans conseil juridique. Pour un cas réel, il renvoie au Juridique du projet.",
      "Dans Finance, sous la Vue d'ensemble, « Je veux… » propose des questions (point bas de trésorerie, factures en retard, reste d'une enveloppe) et un champ : choisir une question ou en écrire une ouvre PO avec la question posée, dans une nouvelle conversation. Il répond avec les chiffres calculés par PDS OS, qu'il recopie.",
      "La carte « Résumé de la semaine » de la Vue d'ensemble de Finance est rédigée par PO à partir des chiffres choisis par PDS OS (entrées et sorties de la semaine, retards, réserve, enveloppe la plus consommée, justificatifs) : PDS OS vérifie que chaque chiffre de sa phrase est l'un des siens, sinon il garde sa propre phrase (« Calculé par PDS OS »). Le résumé est écrit une fois par jour pour toute l'équipe (de nouveau si les chiffres changent) et compte pour une requête de la personne dont la visite le fait écrire.",
      "Il ne lit pas les écoutes ni les statistiques de streaming, qui ne sont pas branchées.",
      "Quand une réponse reste sans résultat, PDS OS le compte de façon anonyme, sans le texte de la question ni le nom de la personne, pour savoir où PO doit progresser.",
      "Chaque conversation est enregistrée après chaque réponse, dans l'historique de la page PO. Elle est privée : vous seul la lisez, même le directeur général n'y a pas accès. Elle est gardée jusqu'à ce que vous la supprimiez. Supprimer une conversation ne touche à rien de ce que PO a aidé à créer.",
      "Chaque message à PO compte pour une requête de votre limite du jour. Le compteur repart à zéro à minuit, heure de Paris. Votre utilisation se lit dans Paramètres (menu de votre compte, en bas de la barre latérale) ; le directeur général règle la limite de chacun dans Équipe.",
      "Vous pouvez joindre des images à une question (captures d'écran, photos, documents) : le trombone de la zone de saisie, un glisser-déposer ou ⌘V / Ctrl+V. PNG, JPEG, WebP ou GIF, 4 par question et 12 par conversation. PO les lit pour vous répondre ; un fait de PDS OS reste lu dans l'application. Comme la conversation, elles sont privées et supprimées avec elle.",
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
        q: "Puis-je montrer une image à PO ?",
        a: "Oui : le trombone de la zone de saisie, un glisser-déposer ou ⌘V / Ctrl+V. 4 images par question, 12 par conversation.",
      },
      {
        q: "PO peut-il valider, envoyer ou signer à ma place ?",
        a: "Non. Il prépare, vous relisez et vous décidez, sur la page concernée.",
      },
    ],
  },
];
