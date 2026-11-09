import type { GuideTopic } from "@/lib/assistant/guide/types";

export const projectsTopics: GuideTopic[] = [
  {
    key: "projects",
    title: "Projets",
    summary:
      "La liste des projets, leur création, leur transmission à un chef de projet et leurs statuts.",
    keywords: [
      "projet",
      "projets",
      "creer",
      "nouveau projet",
      "brouillon",
      "transmettre",
      "chef de projet",
      "accepter",
      "refuser",
      "statut",
      "sortie",
      "single",
      "ep",
      "album",
    ],
    nav: "/app/projects",
    facts: [
      "La liste Projets a quatre onglets : Tous, Brouillons, Actifs, Archivés, avec une recherche et des filtres par type, responsable, statut, échéance et artiste.",
      "Un projet est de type Musical (single, EP, album, mixtape, compilation ou autre), Contenu, ou Événement. Le type Événement n'est pas encore ouvert à la création.",
      "« Nouveau projet » demande le type, le format, les titres ou l'artiste liés, les informations de départ, puis le chef de projet à qui le transmettre.",
      "Ce qu'on saisit est enregistré au fil de l'eau comme brouillon, qu'on reprend depuis la liste.",
      "Le chef de projet reçoit le projet et peut l'accepter, le refuser ou demander une précision. Un refus ou une demande revient à la direction avec un message.",
      "En acceptant, il devient responsable du projet : le projet est lancé et le Cadrage s'ouvre.",
      "Statuts de la liste : Brouillon, Non transmis, Transmis à accepter, Précision demandée, Refusé, En cours, Terminé.",
      "Un projet lancé s'organise en sections : Vue d'ensemble, Cadrage, puis les workflows Master, Juridique, Marketing, Distribution, et le Pilotage (Travail, Calls, Sessions studio, Validations, Activité, Budget).",
    ],
    faq: [
      {
        q: "Qui peut créer un projet ?",
        a: "La direction. Elle le transmet ensuite à un chef de projet.",
      },
      {
        q: "J'ai quitté le formulaire en cours de création, ai-je tout perdu ?",
        a: "Non, c'est enregistré en brouillon. Retrouvez-le en tête de la liste des projets.",
      },
      {
        q: "Un chef de projet a demandé une précision, que faire ?",
        a: "Le projet revient à la direction avec sa question. Elle répond et retransmet le projet.",
      },
    ],
    permissions: ["create_projects", "assign_projects"],
  },
  {
    key: "overview",
    title: "Vue d'ensemble",
    summary:
      "La page d'accueil d'un projet lancé : où il en est, ce qui vous attend, une carte par workflow.",
    keywords: [
      "vue d'ensemble",
      "plan du projet",
      "lancer le plan",
      "workflows",
      "cloture",
      "bilan du projet",
      "carte",
    ],
    projectSection: "overview",
    where:
      "Dans un projet lancé › Vue d'ensemble (le Plan du projet est la 4e étape du Cadrage).",
    facts: [
      "La Vue d'ensemble montre ce qui vous attend dans ce projet, puis une carte par workflow : son statut, sa progression et qui fait quoi.",
      "Tant que le plan du projet n'est pas lancé, elle ne montre que ce qui précède les workflows : les étapes du Cadrage, chacune ouvre sa page d'un clic.",
      "Le Plan du projet s'écrit à la fin du Cadrage : il propose ce qui commence maintenant, ce qui suit, ce qui avance en parallèle et ce qu'il faut prévoir. On peut le modifier avant de le lancer.",
      "Rien ne démarre avant « Lancer le plan » : alors les workflows prévus démarrent.",
      "Un workflow retiré du plan peut être ajouté et lancé ensuite.",
      "Une page « Bilan & clôture du projet » est accessible depuis l'en-tête.",
      "Les statuts d'un workflow (Non démarré, En cours, En attente, Bloqué, Terminé) sont calculés, jamais cochés à la main.",
    ],
    faq: [
      {
        q: "Pourquoi le Master ou le Juridique est-il verrouillé ?",
        a: "Parce que le plan du projet n'est pas encore lancé. Terminez le Cadrage et lancez le plan.",
      },
    ],
  },
  {
    key: "framing",
    title: "Cadrage",
    summary:
      "La première étape d'un projet : cadrer le projet avec PO jusqu'à un Brief de cadrage validé.",
    keywords: [
      "cadrage",
      "brief de cadrage",
      "dimensions",
      "6 dimensions",
      "echange",
      "call de cadrage",
      "demarrer",
      "po",
    ],
    projectSection: "framing",
    where: "Dans un projet lancé › Cadrage.",
    facts: [
      "Le Cadrage a quatre étapes : Démarrer le cadrage, Les 6 dimensions, Brief de cadrage, Plan du projet.",
      "On démarre soit directement avec PO, soit en préparant un échange (un call) dont le compte rendu nourrit le cadrage.",
      "Les 6 dimensions regroupent ce que le projet sait déjà, ce que PO a compris de l'échange et ce qui manque. PO ne pose de questions que sur ce qui manque, une à la fois.",
      "Le Brief de cadrage rassemble les 6 dimensions dans un document versionné, avec leurs sources.",
      "La direction valide le Brief. Une demande de modification ne rouvre que les dimensions concernées.",
      "Le Plan du projet, dernière étape, lance ensuite les autres workflows.",
      "Un échange de cadrage seulement prévu peut être annulé.",
    ],
    faq: [
      {
        q: "Faut-il d'abord faire un call ?",
        a: "Non. On peut commencer directement avec PO ou préparer un échange. Les deux chemins mènent au même Brief de cadrage.",
      },
    ],
    permissions: ["validate"],
  },
  {
    key: "strategy",
    title: "Stratégie",
    summary:
      "La stratégie de lancement : 8 dimensions à arbitrer jusqu'au Brief de sortie validé.",
    keywords: [
      "strategie",
      "brief de sortie",
      "positionnement",
      "publics",
      "narratif",
      "leviers",
      "dispositif",
      "livrables",
      "calendrier de lancement",
      "kpi",
      "objectifs",
    ],
    projectSection: "strategy",
    where: "Dans un projet lancé › Marketing › Stratégie.",
    facts: [
      "La Stratégie démarre quand le plan du projet est lancé. Quatre étapes : Démarrer la stratégie, Les 8 dimensions, Validation du Brief de sortie, Stratégie validée.",
      "Les 8 dimensions : Positionnement, Publics prioritaires, Narratif de sortie, Dispositif, Livrables engagés, Calendrier de lancement, Budget stratégie, Objectifs & KPIs.",
      "On peut démarrer directement ou préparer un échange stratégique : ce qui y est dit devient des propositions à confirmer, modifier ou écarter. Rien n'est coché d'avance.",
      "Chaque dimension est « À compléter », « En cours », « À arbitrer » ou « Complétée », calculé par le code.",
      "La direction valide le Brief de sortie, sur pièce. Pendant la relecture, la Stratégie est figée.",
      "Une fois validé, ses décisions alimentent la Conception, les Activations et le calendrier.",
    ],
    faq: [
      {
        q: "Qu'est-ce que le Brief de sortie ?",
        a: "Le document qui résulte de la Stratégie, une fois les 8 dimensions arbitrées. La direction le valide.",
      },
    ],
    permissions: ["validate"],
  },
];
