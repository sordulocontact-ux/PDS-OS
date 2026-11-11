/** The people of a deal (BIZ 8): an artist's manager, a lawyer… A private
 * contact is shared with the deal's readers by its owner only. */
export const dealContacts = {
  section: "Contacts",
  empty: "Aucun contact sur ce deal.",
  add: "Ajouter un contact",
  addTitle: "Ajouter un contact au deal",
  addDescription:
    "Un contact du Réseau. Un contact privé est partagé avec les personnes qui lisent ce deal : seule sa propriétaire, ou la direction, peut le faire.",
  contact: "Contact",
  required: "Choisissez un contact.",
  submit: "Ajouter au deal",
  remove: "Retirer",
  privateBadge: "Privé",
  hidden: "Coordonnées privées",
  linked: "Contact ajouté au deal",
  unlinked: "Contact retiré du deal",
  refused:
    "Ce contact est privé : seule sa propriétaire, ou la direction, le partage avec un deal. Le refus est noté dans son journal.",
  already: "Ce contact est déjà sur le deal.",
  errors: {
    contact_not_found: "Ce contact est introuvable.",
    deal_contact_not_found: "Ce contact n'est plus sur le deal.",
  } as Record<string, string>,
} as const;
