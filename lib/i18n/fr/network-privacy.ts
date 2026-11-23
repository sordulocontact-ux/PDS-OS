/** Private contacts (BIZ 8): the identity stays in the Réseau, the
 * coordinates and exchanges are its owner's, shared deal by deal. */
export const networkPrivacy = {
  badge: "Privé",
  section: "Confidentialité",
  sharedState: "Partagé avec tout le Réseau",
  privateState: (owner: string | null) =>
    owner ? `Privé, coordonnées tenues par ${owner}` : "Privé",
  hidden: "Coordonnées privées",
  hiddenBody: (owner: string | null) =>
    `${owner ?? "Sa propriétaire"} les partage deal par deal ; la direction les lit.`,
  formHidden:
    "Coordonnées privées : seules leur propriétaire, la direction et les personnes d'un deal où ce contact est partagé les lisent et les modifient.",
  makePrivate: "Rendre privé",
  makePrivateTitle: "Rendre ce contact privé ?",
  makePrivateBody:
    "Son nom reste dans le Réseau. Ses coordonnées (e-mail, téléphone, ville, notes) et ses échanges ne seront plus lus que par vous, la direction et les personnes des deals où vous le partagez.",
  makeShared: "Rendre partagé",
  makeSharedTitle: "Partager ce contact avec tout le Réseau ?",
  makeSharedBody:
    "Ses coordonnées reviennent dans le Réseau, lues par tous les membres.",
  sharedWith: "Partagé avec",
  sharedNone: "Partagé avec aucun deal.",
  done: {
    private: "Contact rendu privé",
    shared: "Contact partagé avec tout le Réseau",
  },
  errors: {
    forbidden:
      "Seuls la personne qui a créé ce contact et la direction le rendent privé ; seules sa propriétaire et la direction le partagent de nouveau.",
    contact_not_found: "Ce contact est introuvable.",
    contact_already_private: "Ce contact est déjà privé.",
    contact_not_private: "Ce contact n'est pas privé.",
    generic: "L'enregistrement a échoué. Réessayez.",
  } as Record<string, string>,
} as const;
