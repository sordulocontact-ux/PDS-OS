/**
 * Pre-production bar (lib/preprod/): the proto's « Voir comme / Aller à » on
 * the real app, for the team's tests. Never shown in production.
 */
export const preprod = {
  region: "Commandes de la pré-prod",
  badge: "Pré-prod",
  viewAs: "Voir comme",
  goTo: "Aller à",
  switching: "Connexion…",
  noMoment: "Aucun moment préparé",
  // One per moment of lib/preprod/moments.ts: what is due, and by whom.
  moments: {
    accept: "Projet transmis, à accepter · Lina",
    framing: "Cadrage en cours · Lina",
    brief: "Brief à valider · Claire",
    plan: "Plan du projet à lancer · Lina",
    launched: "Plan lancé, Stratégie à démarrer · Lina",
  },
};
