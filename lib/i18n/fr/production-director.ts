// The director proposed by the company and retained by PDS (proto
// directorBlock, production.md § 2.6).
export const productionDirector = {
  title: "Réalisateur",
  waiting: (company: string) =>
    `En attente de ${company} (lien privé) : proposer un réalisateur`,
  intro: (company: string) =>
    `${company} a proposé un réalisateur. Celui que vous retenez reçoit le rôle « Réalisation » et son lien privé ; les autres sont gardés ici.`,
  by: (company: string, at: string) => `Proposé par ${company} le ${at}`,
  retain: "Retenir",
  retainLabel: (name: string) => `Retenir ${name}`,
  done: (name: string) => `${name} retenu`,
  retained: (name: string, company: string) =>
    `Réalisation : ${name} · proposé par ${company}. Il a son lien privé pour la proposition de réalisation.`,
  status: { proposed: "Proposé", retained: "Retenu", declined: "Non retenu" },
  linkTitle: (name: string) => `Lien de ${name}`,
  linkDescription:
    "Affiché une seule fois : copiez-le et envoyez-le-lui. Il y dépose sa proposition de réalisation.",
} as const;
