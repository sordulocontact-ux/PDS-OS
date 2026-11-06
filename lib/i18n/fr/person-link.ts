// A person's private link, as one card everywhere (Figma 378-6581, the
// Master's « Lien de Karim Haddou »; components/ui/person-link-card.tsx):
// the Master's package, a Juridique démarche.

export const personLink = {
  title: (name: string) => `Lien de ${name}`,
  states: {
    notSent: "Pas encore envoyé",
    sent: "Envoyé",
    opened: "Ouvert",
    none: "Pas de lien",
  },
  copy: "Copier le lien",
  copied: "Lien copié",
  remind: "Relancer",
  renew: "Nouveau lien",
  renewHint:
    "Un nouveau lien remplace l'ancien, qui cesse de marcher ; ce qui a été déposé reste.",
  more: (name: string) => `Autres actions sur le lien de ${name}`,
  create: "Créer le lien",
} as const;
