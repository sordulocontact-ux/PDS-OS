// The presentation of the first connection (docs/DESIGN.md § 4, « Présentation »).
// The visuals show a made-up project, labelled « Exemple »: no real person or
// real project behind these names. Dates are computed by the caller from today.

const PO_LEDE =
  "PO pré-remplit ce que PDS OS sait déjà, et dit d'où ça vient. Vous confirmez ou vous corrigez : il ne valide, ne signe et n'envoie jamais rien à votre place.";

export const onboarding = {
  replay: "Revoir la présentation",
  skip: "Passer",
  start: "Commencer",
  next: "Continuer",
  done: "C'est parti",
  back: "Retour",
  skippedToast:
    "Revoyez la présentation quand vous voulez : votre nom, dans la navigation.",
  example: "Exemple",

  greeting: (firstName: string | null) =>
    firstName ? `Bonjour ${firstName}` : "Bonjour",
  welcome: "Bienvenue dans PDS OS.",
  yourRole: "Votre poste :",
  intro: "Trois choses à savoir avant de commencer. Trente secondes.",
  doesLabel: "Ce que vous ferez ici",

  journeyTitle: "Chaque projet est un parcours",
  journeyLede:
    "Des étapes dans l'ordre, chacune avec son responsable, sa raison et sa suite. Quand la vôtre est faite, PDS OS passe la main à la bonne personne : personne n'a besoin de relancer.",
  journeyMine: "Vos étapes sont en bleu.",
  journeyProject: "Néons · Mona Lys",
  journeyCaption: "Parcours du projet",
  journeyMineStep: (action: string) => `À vous · ${action}`,
  journeyOtherStep: (name: string, action: string) => `${name} · ${action}`,
  journeyAfter: (step: string) => `Après : ${step}`,

  nowTitle: "Ce qui est à vous vient à vous",
  nowCard: {
    label: "Maintenant",
    mine: "À vous",
    late: "En retard",
    toValidate: "À valider",
    open: "Ouvrir",
    then: "Ensuite",
    before: (day: string) => `avant le ${day}`,
    expected: (day: string) => `attendu le ${day}`,
  },
  push: {
    ask: "Être prévenu quand une action vous attend, même PDS OS fermé.",
    on: "Les notifications vous suivent, même PDS OS fermé.",
  },

  poTitle: "PO prépare, vous décidez",
  poQuestion: "Une question ?",
  poOpens: "ouvre PO depuis n'importe quelle page.",

  journey: [
    {
      title: "Créer et transmettre le projet",
      by: "direction",
      done: "Projet transmis",
      action: "créer et transmettre le projet",
    },
    {
      title: "Accepter le projet",
      by: "pilot",
      done: "Projet accepté",
      action: "accepter le projet",
    },
    {
      title: "Valider le Brief de cadrage",
      by: "direction",
      done: "Brief de cadrage validé",
      action: "valider le Brief de cadrage",
    },
    {
      title: "Valider le Mix V1",
      by: "creative",
      done: "Mix V1 validé",
      action: "valider le Mix V1",
    },
    {
      title: "Déposer la pochette",
      by: "creative",
      done: "Version de la pochette déposée",
      action: "déposer la pochette",
    },
    {
      title: "Valider la pochette",
      by: "direction",
      done: "Pochette validée",
      action: "valider la pochette",
    },
  ],
  people: {
    direction: "Claire Morel",
    pilot: "Lina Haddad",
    creative: "Nadia Benali",
  },

  variants: {
    direction: {
      lead: "Vous voyez tous les projets, vous les confiez à un chef de projet et vous validez ce qu'on vous soumet.",
      does: [
        "Créer un projet et le transmettre",
        "Valider ce qu'on vous soumet, sur pièce",
        "Voir qui avance et qui on attend",
      ],
      now: "Ce qu'on vous soumet arrive en tête de l'Accueil, le plus pressé d'abord. Le reste, vous le suivez dans « Ce que vous attendez ».",
      notification: {
        title: "Contrat à valider",
        body: "Lina Haddad vous l'a soumis · Néons",
      },
      nowExample: {
        where: "Néons · Juridique › Contrats",
        title: "Valider le contrat de Sami Kader",
        why: "Le contrat de co-édition est rempli avec ce que sa fiche de renseignements a recueilli : la direction le valide avant l'envoi.",
        then: "Envoyer le contrat à Sami Kader",
        kind: "validate",
        dueInDays: -2,
      },
      po: {
        lede: "L'équipe et PO préparent, chaque valeur avec sa source. Vous décidez sur pièce : valider, demander une précision ou refuser, toujours avec un motif.",
        place: ["Néons", "Cadrage", "Brief de cadrage"],
        chip: "Tout est là, avec sa source",
        facts: [
          {
            label: "Budget",
            value: "25 000 € HT, dont 18 000 € de clip",
            source: "Call de cadrage : « 25 en tout, dont 18 pour le clip »",
          },
          {
            label: "Date de sortie visée",
            day: 36,
            source: "Lancement · saisie par vous",
          },
          {
            label: "Cheffe de projet",
            value: "Lina Haddad",
            source: "Lancement · désignée par vous",
          },
        ],
        action: "Valider le Brief de cadrage",
        done: () =>
          "Brief de cadrage validé. En attente de Lina Haddad : préparer le Plan du projet.",
      },
    },
    pilot: {
      lead: "Vous recevez les projets, vous les acceptez, puis vous les menez jusqu'à la sortie.",
      does: [
        "Accepter les projets qu'on vous transmet",
        "Mener le Cadrage, puis les workflows",
        "Tenir chaque étape à l'heure",
      ],
      now: "Un projet qu'on vous transmet passe en tête de l'Accueil. Ensuite, votre prochaine action y est toujours : son pourquoi, qui valide, ce qu'elle débloque.",
      notification: {
        title: "Nouveau projet transmis",
        body: "Claire Morel vous a transmis « Lueur »",
      },
      nowExample: {
        where: "Lueur · Lancement › Acceptation",
        title: "Accepter le projet",
        why: "Le projet vous est transmis : acceptez-le, demandez une précision ou refusez-le, en voyant tout ce qui a été saisi.",
        then: "Cadrage",
        kind: "do",
        dueInDays: null,
      },
      po: {
        lede: PO_LEDE,
        place: ["Néons", "Cadrage", "Budget et calendrier"],
        chip: "PO a compris 3 réponses",
        facts: [
          {
            label: "Budget",
            value: "25 000 € HT",
            source: "Call de cadrage : « 25 en tout »",
          },
          {
            label: "Dont le clip",
            value: "18 000 € HT",
            source: "Call de cadrage : « dont 18 pour le clip »",
          },
          {
            label: "Date de sortie visée",
            day: 36,
            source: "Lancement · saisie par Claire Morel",
          },
        ],
        action: "Confirmer les 3",
        done: (name: string) => `3 réponses confirmées par ${name}.`,
      },
    },
    creative: {
      lead: "Vous travaillez sur les livrables créatifs qui vous sont confiés, vous déposez vos versions et vous validez la création.",
      does: [
        "Écouter et valider les mix",
        "Déposer vos versions de la pochette",
        "Donner vos retours, minutés",
      ],
      now: "Vos validations et vos livrables arrivent en tête de l'Accueil, avec le fichier à écouter ou à revoir. Travail rassemble le reste, par échéance.",
      notification: {
        title: "Mix V1 déposé",
        body: "Karim Haddou · Néons, à écouter",
      },
      nowExample: {
        where: "Néons · Master › Mixage",
        title: "Valider le Mix V1",
        why: "Écoutez le Mix V1 déposé par Karim Haddou : validé, il devient la base du Mix final ; sinon, vos retours partent à Karim.",
        then: "Mix final",
        kind: "validate",
        dueInDays: 3,
      },
      po: {
        lede: PO_LEDE,
        place: ["Néons", "Conception", "Pochette"],
        chip: "PO a pré-rempli 3 valeurs",
        facts: [
          {
            label: "Intention",
            value: "La nuit, les reflets, les néons",
            source:
              "Échange créatif : « une pochette de nuit, avec des reflets »",
          },
          {
            label: "Format attendu",
            value: "3000 × 3000 px, carré",
            source: "Contrôlé par le code",
          },
          {
            label: "Version attendue le",
            day: 7,
            source: "Plan du projet",
          },
        ],
        action: "Confirmer les 3",
        done: (name: string) => `3 valeurs confirmées par ${name}.`,
      },
    },
    // No project-related permission: what is common to everyone.
    member: {
      lead: "Vous suivez les projets où vous intervenez et vous agissez quand une étape vous revient.",
      does: [
        "Suivre les projets où vous intervenez",
        "Faire les étapes qui vous reviennent",
        "Poser vos questions à PO",
      ],
      now: "Ce qui vous revient arrive en tête de l'Accueil, avec son pourquoi et ce qu'il débloque. Travail rassemble le reste, par échéance.",
      notification: {
        title: "Une étape vous attend",
        body: "Lina Haddad · Néons",
      },
      nowExample: {
        where: "Néons · Distribution › Paramètres",
        title: "Confirmer les paramètres de distribution",
        why: "Date, territoires et prix sont pré-remplis depuis le projet ; confirmés, ils partent avec le dépôt chez The Orchard.",
        then: "Dépôt chez The Orchard",
        kind: "do",
        dueInDays: 10,
      },
      po: {
        lede: PO_LEDE,
        place: ["Néons", "Cadrage", "Budget et calendrier"],
        chip: "PO a compris 3 réponses",
        facts: [
          {
            label: "Budget",
            value: "25 000 € HT",
            source: "Call de cadrage : « 25 en tout »",
          },
          {
            label: "Dont le clip",
            value: "18 000 € HT",
            source: "Call de cadrage : « dont 18 pour le clip »",
          },
          {
            label: "Date de sortie visée",
            day: 36,
            source: "Lancement · saisie par Claire Morel",
          },
        ],
        action: "Confirmer les 3",
        done: (name: string) => `3 réponses confirmées par ${name}.`,
      },
    },
  },
} as const;
