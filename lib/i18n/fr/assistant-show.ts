/**
 * What PO shows besides text (docs/ASSISTANT.md § 3 sexies): charts, files
 * (CSV, PDF) and the requests it cannot fulfil yet.
 */
export const assistantShow = {
  charts: {
    treasury: (months: string) => `Trésorerie prévue · ${months}`,
    flows: "Entrées et sorties par mois",
    posts: (envelope: string | null) =>
      envelope ? `Dépenses par poste · ${envelope}` : "Dépenses par poste",
    postsTotal: "Engagé, facturé ou payé",
    postsEmpty: "Aucune dépense engagée, facturée ou payée.",
    noPost: "Sans poste",
    budgets: "Budgets : engagé de chaque enveloppe",
    budgetsEmpty: "Aucune enveloppe de budget en cours.",
    budgetLine: (engaged: string, amount: string) =>
      `${engaged} engagés sur ${amount}`,
    budgetNoAmount: (engaged: string) => `${engaged} engagés, sans montant`,
    projectBudget: (project: string) => `Budget de ${project} par état`,
    projectBudgetEmpty: "Aucune ligne de budget dans ce projet.",
    splits: (title: string, kind: string) => `Répartition ${kind} · ${title}`,
    splitsEmpty: "Aucune part saisie.",
    splitKinds: { master: "master", publishing: "édition" },
    others: (count: number) => (count === 1 ? "1 autre" : `${count} autres`),
    share: (percent: number) => `${percent} %`,
    horizons: {
      30: "1 mois",
      90: "3 mois",
      180: "6 mois",
      365: "1 an",
    } as Record<number, string>,
    shown: "Graphique affiché sous la réponse.",
    noStatement:
      "Pas de graphique : aucun relevé de compte n'est saisi dans Finance › Trésorerie.",
    hidden:
      "Ce graphique lit la Finance du label : votre poste ne la voit pas.",
    budgetHidden:
      "Ce budget n'est visible que par le responsable du projet et la direction.",
    splitsHidden:
      "Les parts ne sont visibles que par les postes qui gèrent le catalogue.",
    notFound: (name: string) => `Aucun élément ne correspond à « ${name} ».`,
    which: "Quel élément ? Donnez son nom.",
  },
  files: {
    download: "Télécharger",
    preparing: "Préparation…",
    failed: "Le fichier n'a pas pu être préparé. Réessayez.",
    csvDetail: (rows: number) =>
      rows === 1 ? "CSV · 1 ligne" : `CSV · ${rows} lignes`,
    csvEmpty: "Liste vide : rien à exporter.",
    pdfDetail: "PDF",
    emptyText: "Aucun texte à mettre en PDF.",
    ready: (label: string) =>
      `Fichier « ${label} » prêt à télécharger sous la réponse.`,
    hidden: "Votre poste ne permet pas de lire cette liste.",
    // The lists PO exports (export_list), as their file is named.
    lists: {
      titres: "Titres du catalogue",
      artistes: "Artistes",
      projets: "Projets",
      contacts: "Contacts du Réseau",
      contrats: "Contrats",
      fichiers: "Fichiers",
      depenses: "Dépenses",
      factures: "Factures et encaissements",
      encaissements: "Encaissements",
      banque: "Opérations bancaires",
      historique: "Historique Finance",
    } as Record<string, string>,
    columns: {
      title: "Titre",
      artists: "Artistes",
      audio: "État audio",
      isrc: "ISRC",
      duration: "Durée",
      projects: "Projets",
      name: "Nom",
      relation: "Relation",
      country: "Pays",
      type: "Type",
      status: "Statut",
      stage: "Étape actuelle",
      dueOn: "Échéance",
      manager: "Responsable",
      roles: "Rôles",
      organization: "Structure",
      email: "E-mail",
      phone: "Téléphone",
      contract: "Contrat",
      project: "Projet",
      parties: "Parties",
      state: "État",
      file: "Fichier",
      category: "Catégorie",
      attachedTo: "Rattaché à",
      addedOn: "Ajouté le",
    },
    // Documents of the app PO prints (make_pdf).
    documents: {
      master_brief: "Brief Mix/Master",
      distribution_dossier: "Dossier de distribution",
      call_report: "Compte rendu",
      contract: "Contrat",
    } as Record<string, string>,
    textTitle: "Document",
    by: (name: string | null, day: string) =>
      name
        ? `Préparé avec PO pour ${name}, le ${day}`
        : `Préparé avec PO, le ${day}`,
    noProject: "Quel projet ? Donnez son nom.",
    noCall: "Aucun call de ce projet n'a de compte rendu enregistré.",
    noContract: "Quel contrat ? Donnez son nom.",
  },
  gaps: {
    noted:
      "Demande notée, sans son texte, pour l'équipe qui fait évoluer PDS OS.",
  },
};
