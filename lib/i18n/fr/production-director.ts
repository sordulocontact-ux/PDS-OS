// The director proposed by the company and retained by PDS (proto
// directorBlock, production.md § 2.6).
export const productionDirector = {
  title: "Réalisateur",
  waitingTodo: "proposer un réalisateur (lien privé)",
  intro: (company: string) =>
    `${company} a proposé un réalisateur. Celui que vous retenez reçoit le rôle « Réalisation » et son lien privé ; les autres sont gardés ici.`,
  by: (company: string, at: string) => `Proposé par ${company} le ${at}`,
  retain: "Retenir",
  retainLabel: (name: string) => `Retenir ${name}`,
  done: (name: string) => `${name} retenu`,
  retained: (name: string, company: string) =>
    `Réalisation : ${name} · proposé par ${company}. Il a son lien privé pour la proposition de réalisation.`,
  status: { proposed: "Proposé", retained: "Retenu", declined: "Non retenu" },
  revision: (reason: string) =>
    `Nouvelle version de la proposition demandée : « ${reason} »`,
  // The e-mail PDS OS sends itself to the retained director.
  email: {
    subject: (title: string) =>
      `« ${title} » : votre proposition de réalisation`,
    body: "Votre proposition est retenue. Voici votre espace privé, où vous déposez votre proposition de réalisation.",
    open: "Ouvrir votre espace :",
    sent: (name: string) =>
      `${name} retenu : son lien lui a été envoyé par e-mail`,
    failed:
      "Réalisateur retenu, mais l'e-mail n'est pas parti : copiez son lien et envoyez-le vous-même.",
  },
  linkTitle: (name: string) => `Lien de ${name}`,
  linkDescription:
    "Affiché une seule fois : copiez-le et envoyez-le-lui. Il y dépose sa proposition de réalisation.",
} as const;
