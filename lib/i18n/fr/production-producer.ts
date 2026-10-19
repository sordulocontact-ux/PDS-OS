// « Qui produit ? » of a deliverable (proto « Projet complet », pqBody,
// companyField, prepModeField, pqChangeModal; production.md § 2.2, 2.3).
export const productionProducer = {
  legend: "Qui produit ce livrable ?",
  kinds: {
    external: {
      label: "Externe",
      detail: "Une société de production est mandatée",
      hint: "La société se choisit juste en dessous",
    },
    internal: {
      label: "Interne",
      detail: "PDS pilote, avec ses freelances",
      hint: (name: string, role: string) => `${name} · ${role}`,
    },
  },
  producerRole: "chargé de production",
  ownerRole: "responsable du projet",
  proposed: "Proposé d'après la fiche et le Réseau ; vous confirmez.",
  company: {
    legend: "Quelle société ?",
    suggested: "proposée par PO",
    network: (reason: string) => `Réseau · ${reason}`,
    reasons: {
      artist: (title: string, artist: string) =>
        `a produit « ${title} » de ${artist}`,
      count: (n: number) =>
        n === 1
          ? "a produit 1 livrable pour PDS"
          : `a produit ${n} livrables pour PDS`,
      never: "n'a jamais travaillé avec PDS",
    },
    none: "Aucune société de production dans le Réseau : créez sa fiche.",
    create: "Créer la fiche d'une société",
    createTitle: "Nouvelle société dans le Réseau",
  },
  mode: {
    legend: "Comment organiser la préproduction ?",
    choices: {
      direct: {
        label: "Préparer directement avec PO",
        hint: "PO propose les points à trancher d'après la fiche ; vous les confirmez un par un.",
      },
      call: {
        label: "Préparer un call de production",
        hint: "PO prépare l'ordre du jour ; après le call, il propose ce qui a été dit, avec la phrase exacte.",
      },
      import: {
        label: "Importer une organisation existante",
        hint: "Un planning ou un document déjà fait : PO en tire les points, vous les confirmez.",
      },
    },
    nothingOutside: "Ce choix ne déclenche rien à l'extérieur.",
    short: {
      direct: "préparer directement avec PO",
      call: "préparer un call de production",
      import: "importer une organisation existante",
    },
  },
  confirm: "Confirmer",
  done: (deliverable: string, kind: string) =>
    `${deliverable} : ${kind.toLowerCase()}`,
  errors: {
    kind: "Choisissez qui produit ce livrable.",
    company: "Choisissez la société.",
    mode: "Choisissez comment organiser la préproduction.",
    missing: (n: number) =>
      n === 1 ? "1 choix manque." : `${n} choix manquent.`,
  },
  // After the bold « Externe · Studio Ressac »; `day` is « le 14/10 ».
  chosen: (mode: string | null, by: string, day: string) =>
    `${mode ? ` · ${mode}` : ""}, choisi par ${by} ${day}.`,
  facts: {
    fiche: "Fiche transférée",
    ficheValue: (title: string, version: number, form: string | null) =>
      [title, `V${version}`, form].filter(Boolean).join(" · "),
    single: "Fiche unique",
    series: (n: number) => `Fiche série · ${n} éléments`,
    delivery: "Livraison finale le",
  },
  wait: "choisir qui produit",
  more: "Dates, enveloppe et héritage de la Conception",
} as const;
