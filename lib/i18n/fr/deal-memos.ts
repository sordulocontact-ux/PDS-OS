/** The deal memo and the contract of a deal (BIZ 7). */
export const dealMemos = {
  section: "Deal memo",
  none: "Aucun deal memo : il se crée à l'accord de principe, ou à la main.",
  create: "Nouveau deal memo",
  created: "Deal memo créé",
  validate: "Valider le deal memo",
  validated: "Deal memo validé",
  name: (n: number) => `Deal memo n°${n}`,
  statuses: { draft: "Brouillon", validated: "Validé" },
  meta: (who: string | null, day: string) =>
    who ? `Créé par ${who}, le ${day}` : `Créé le ${day}`,
  validatedBy: (who: string | null, day: string) =>
    who ? `Validé par ${who}, le ${day}` : `Validé le ${day}`,
  noTerms: "Aucun terme écrit au moment du deal memo.",
  changed: "Les termes ont changé depuis ce deal memo.",
  older: "Versions précédentes",
  pdf: {
    label: "Exporter en PDF",
    pending: "Export…",
    failed: "Le PDF n'a pas pu être créé. Réessayez.",
    file: (deal: string, n: number) => `Deal memo ${deal} n°${n}.pdf`,
    meta: (stage: string, day: string) => `Étape : ${stage} · ${day}`,
    term: "Terme",
    value: "Valeur",
    state: "État",
  },
  contract: {
    section: "Contrat",
    none: "Aucun contrat lié à ce deal.",
    noneParticipation: "Aucun contrat lié à la participation.",
    fromParticipation: "Contrat de la participation",
    signedOn: (day: string) => `Signé le ${day}`,
    amount: "Montant saisi sur le contrat",
    open: (title: string) => `Ouvrir le contrat « ${title} »`,
    link: "Lier un contrat",
    change: "Changer",
    unlink: "Retirer le lien",
    linkTitle: "Contrat du deal",
    linkDescription:
      "Le contrat principal du deal, parmi ceux de son projet ou de son artiste. Les autres contrats de l'opération restent dans Contrats.",
    pick: "Contrat",
    pickPlaceholder: "Choisir un contrat",
    noOption:
      "Aucun contrat sur le projet ou l'artiste de ce deal : créez-le d'abord dans Contrats.",
    submit: "Lier le contrat",
    linked: "Contrat lié",
    unlinked: "Lien retiré",
  },
  compare: {
    title: (n: number) => `Le contrat face au deal memo n°${n}`,
    needMemo: "Validez un deal memo pour le comparer au contrat.",
    needContract: "Liez un contrat pour le comparer au deal memo validé.",
    intro:
      "PDS OS ne lit pas le PDF du contrat : vérifiez chaque terme, le contrat dit-il la même chose ?",
    differs: (count: number) =>
      count === 1
        ? "1 terme que le contrat contredit."
        : `${count} termes que le contrat contredit.`,
    allConform: "Le contrat dit ce que dit le deal memo.",
    amountDiffers: (amount: string) => `Le contrat porte ${amount}`,
    amountMatches: "Le montant du contrat est le même",
    verdicts: {
      conform: "Conforme",
      different: "Différent",
      unchecked: "À vérifier",
    },
    conform: "Conforme",
    different: "Différent",
    noteTitle: (label: string) => `${label} : ce que dit le contrat`,
    note: "Ce que dit le contrat",
    noteRequired: "Dites ce que dit le contrat.",
    save: "Enregistrer",
    checkedBy: (who: string | null, day: string) =>
      who ? `${who}, ${day}` : day,
    saved: "Vérification enregistrée",
  },
  errors: {
    memo_not_found: "Ce deal memo est introuvable.",
    memo_validated: "Ce deal memo est déjà validé.",
    memo_not_latest: "Seul le dernier deal memo se valide.",
    memo_not_validated: "Comparez un deal memo validé.",
    participation_contract:
      "Le contrat de ce deal est celui de la participation, dans le Juridique.",
    contract_not_linkable:
      "Ce contrat n'appartient ni au projet ni à l'artiste du deal.",
    contract_unchanged: "Ce contrat est déjà lié.",
    no_contract: "Aucun contrat lié à ce deal.",
    check_unchanged: "Rien n'a changé.",
    invalid_verdict: "Choisissez « Conforme » ou « Différent ».",
    invalid_term: "Ce terme n'est pas dans le deal memo.",
  } as Record<string, string>,
} as const;
