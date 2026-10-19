// The preproduction checklist (proto « Projet complet » BODY.prep,
// production.md § 2.9).
export const productionChecklist = {
  title: "Checklist de préproduction",
  intro: (company: string) =>
    `Tenue par ${company} depuis son lien ; PDS ajoute les tâches propres au projet. Les tâches faites restent ici.`,
  introInternal:
    "PDS ajoute les tâches propres au projet. Les tâches faites restent ici.",
  empty: "La checklist s'ouvre avec la validation du devis.",
  due: (day: string) => `pour le ${day}`,
  origin: (text: string) => `origine : ${text}`,
  origins: { checklist: "Checklist de préproduction" },
  doneOn: (day: string) => `faite ${day}`,
  state: { todo: "À faire", done: "Faite", review: "À revoir" },
  finish: "Fait",
  finishLabel: (title: string) => `Fait : ${title}`,
  finished: "Tâche faite",
  add: {
    open: "Ajouter une tâche",
    title: "Tâche",
    who: "Qui la fait",
    nobody: "Personne pour l'instant",
    due: "Échéance",
    submit: "Ajouter",
    done: "Tâche ajoutée",
    required: "Dites ce qu'il faut faire.",
  },
  count: (done: number, total: number) => `${done} / ${total} tâches faites`,
  link: {
    title: "Préproduction",
    action: (n: number) =>
      n === 1 ? "Faire avancer 1 tâche" : `Faire avancer ${n} tâches`,
    hint: "Cochez « Fait » quand c'est fait : PDS suit sans vous demander de tout ressaisir.",
    done: "C'est noté.",
  },
} as const;
