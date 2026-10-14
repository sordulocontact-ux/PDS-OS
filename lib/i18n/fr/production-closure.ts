const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

// Production › Livraison: what each expected file must be, the files
// deposited on it, the check point by point, the transmission to the person
// in charge of Activations and the closing (PROD-035 to PROD-040).
export const productionClosure = {
  spec: {
    label: "Ce qui est attendu",
    hint: "Format, ratio, durée, langue, sous-titres… Repris de la Fiche Livrable, à compléter.",
    duration: (range: string) => `durée ${range}`,
    durationMissing: "durée à confirmer",
    languageMissing: "langue à confirmer",
    subtitles: {
      burned: "sous-titres intégrés",
      file: "sous-titres en fichier séparé",
      both: "sous-titres intégrés et en fichier",
      on: "avec sous-titres",
      off: "sans sous-titres",
      unknown: "sous-titres à confirmer",
    } as Record<string, string>,
    subtitleRatios: (ratios: string[]) => `pour ${ratios.join(", ")}`,
    qc: "image, son et génériques sur la version validée",
    toConfirm: "À confirmer",
  },
  missing: {
    title: (n: number) =>
      plural(
        n,
        "La Fiche Livrable attend 1 fichier qui n'est pas dans la checklist :",
        `La Fiche Livrable attend ${n} fichiers qui ne sont pas dans la checklist :`,
      ),
    add: (n: number) =>
      plural(n, "Ajouter ce fichier", `Ajouter ces ${n} fichiers`),
    added: "Fichiers attendus ajoutés.",
  },
  files: {
    summary: (n: number) =>
      plural(n, "1 fichier déposé", `${n} fichiers déposés`),
    current: "actuel",
    provider: "Le prestataire, par son lien",
    by: (who: string, date: string) => `${who}, le ${date}`,
    open: "Ouvrir",
  },
  points: {
    open: "Contrôler",
    again: "Revérifier",
    resume: "Reprendre le contrôle",
    noFile: "Le contrôle s'ouvre une fois le fichier déposé.",
    dialogTitle: (label: string) => `Contrôle · ${label}`,
    dialogDescription:
      "Point par point : le fichier n'est conforme que quand chaque point l'est. Un point non conforme dit pourquoi, et le prestataire le voit sur son lien.",
    labels: {
      format: "Format et conteneur",
      codec: "Codec",
      ratio: "Ratio et cadrage",
      resolution: "Résolution",
      duration: "Durée",
      audio: "Audio (niveaux, mixage)",
      sync: "Synchronisation",
      spelling: "Orthographe",
      language: "Langue",
      image: "Image",
      sound: "Son",
      credits: "Génériques et mentions",
      conformity: "Conformité au brief",
    } as Record<string, string>,
    ok: "Conforme",
    notOk: "Non conforme",
    note: "Ce qui ne va pas",
    noteRequired: "Dites ce qui ne va pas sur ce point.",
    nothing: "Cochez au moins un point.",
    save: "Enregistrer le contrôle",
    saved: "Contrôle enregistré.",
    progress: (done: number, total: number) =>
      `${done} point${done > 1 ? "s" : ""} sur ${total} contrôlé${done > 1 ? "s" : ""}`,
    failed: (label: string, note: string | null) =>
      note ? `${label} : ${note}` : label,
  },
  handoff: {
    recipient: "Responsable Activations",
    recipientHint:
      "Il reçoit une notification avec le lien vers la livraison. Pré-rempli avec la personne à qui le livrable est confié.",
    recipientRequired: "Choisissez qui reprend le livrable dans Activations.",
    exports: "Fichiers transmis",
    exportsHint:
      "Seuls les fichiers validés et conformes partent, avec ce qui est attendu de chacun.",
    noExports: "Aucun fichier attendu dans la checklist.",
    sentTo: (who: string) => `pour ${who}`,
  },
  closure: {
    title: "Clôture",
    description:
      "Ce que la Production a livré et transmis. Une fois clôturée, elle reste consultable avec tout son historique.",
    recap: {
      deliverable: "Livrable",
      creative: "Validation créative",
      technical: "Contrôle technique",
      delivery: "Livraison",
      exports: "Fichiers conformes",
      handoffs: "Transmissions",
      done: (who: string | null, date: string) =>
        who ? `${who}, le ${date}` : `Le ${date}`,
      notYet: "Pas encore",
      exportsValue: (ok: number, total: number) => `${ok} sur ${total}`,
      handoffsValue: (n: number, who: string | null) =>
        [plural(n, "1 transmission", `${n} transmissions`), who]
          .filter(Boolean)
          .join(" · "),
    },
    openTitle: "Encore ouvert",
    open: {
      notHandedOff: "Le livrable n'est pas encore transmis à Activations.",
      staleHandoff:
        "La dernière transmission ne correspond plus à la livraison : transmettez la nouvelle.",
      equipment: (n: number) =>
        plural(
          n,
          "1 matériel loué ou prêté n'est pas encore rendu.",
          `${n} matériels loués ou prêtés ne sont pas encore rendus.`,
        ),
      incidents: (n: number) =>
        plural(
          n,
          "1 incident du tournage bloque la clôture.",
          `${n} incidents du tournage bloquent la clôture.`,
        ),
    },
    close: "Clôturer la production",
    confirmTitle: "Clôturer la production ?",
    confirmBody: (title: string) =>
      `La production de « ${title} » est close. Elle reste consultable, avec son historique ; la suite se passe dans Activations.`,
    pending: "Clôture…",
    done: "Production clôturée.",
    closed: (who: string | null, date: string) =>
      who ? `Clôturée par ${who} le ${date}.` : `Clôturée le ${date}.`,
    activation: "Ouvrir l'activation",
    activations: "Créer l'activation dans Activations",
  },
  errors: {
    exportsNotConforming:
      "Tous les fichiers attendus doivent être validés et conformes avant d'être transmis.",
    personNotMember:
      "Le responsable Activations doit être un membre de l'équipe.",
    notHandedOff:
      "La production se clôture une fois le livrable transmis à Activations.",
    closingBlocked:
      "Du matériel n'est pas rendu ou un incident bloque encore la clôture.",
    notDeposited: "Le fichier n'est pas encore déposé.",
  },
} as const;
