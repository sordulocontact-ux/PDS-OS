// The question PO asks and what it understood of the answer (proto
// « Projet complet »: Cadrage and Cadrage juridique), shared by every
// module that asks one question at a time (components/ui/po-question.tsx,
// po-reading.tsx).

export const poQuestion = {
  box: "Question de PO",
  rank: (n: number, total: number) => `${n} sur ${total}`,
  // Domain · state, in capitals (« PARTICIPANTS · INFORMATION MANQUANTE »).
  eyebrow: (domain: string, state: "missing" | "confirm") =>
    `${domain} · ${state === "missing" ? "Information manquante" : "À confirmer"}`,
  reading: {
    title: "Ce que PO a compris",
    hint: "Retirez ce qui est faux, puis enregistrez. Rien n'est gardé avant.",
    remove: "Retirer",
    removeLabel: (label: string) => `Retirer ${label}`,
    dropped: (n: number) =>
      n === 1
        ? "1 élément n'a pas été retrouvé tel quel dans votre réponse : écarté."
        : `${n} éléments n'ont pas été retrouvés tels quels dans votre réponse : écartés.`,
  },
  // Questions settled by reliable data (« Questions que PO ne pose pas »).
  notAsked: {
    title: "Questions que PO ne pose pas",
    hint: "Déjà réglées par une donnée fiable",
  },
} as const;
