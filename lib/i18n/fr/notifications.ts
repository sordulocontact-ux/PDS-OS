/** Notifications: bell, toasts and browser notifications. */
export const notifications = {
  bell: "Notifications",
  bellUnread: (count: number) =>
    count === 1
      ? "Notifications, 1 non lue"
      : `Notifications, ${count} non lues`,
  title: "Notifications",
  empty: "Aucune notification pour l'instant.",
  markAllRead: "Tout marquer comme lu",
  someone: "Quelqu'un",
  aProject: "un projet",
  texts: {
    project_transmitted: (actor: string, project: string) =>
      `${actor} vous transmet « ${project} ».`,
    project_accepted: (actor: string, project: string) =>
      `${actor} a accepté « ${project} » : le projet est lancé.`,
    project_refused: (actor: string, project: string) =>
      `${actor} a refusé « ${project} ».`,
    project_clarification_requested: (actor: string, project: string) =>
      `${actor} demande une précision sur « ${project} ».`,
    validation_requested: (actor: string, project: string) =>
      `${actor} demande votre validation sur « ${project} ».`,
    validation_approved: (actor: string, project: string) =>
      `${actor} a validé votre demande sur « ${project} ».`,
    validation_rejected: (actor: string, project: string) =>
      `${actor} a refusé votre demande de validation sur « ${project} ».`,
    task_assigned: (actor: string, project: string) =>
      `${actor} vous assigne une tâche sur « ${project} ».`,
  },
  open: "Ouvrir",
  push: {
    enable: "Activer les notifications du navigateur",
    enabling: "Activation…",
    enabled: "Notifications du navigateur activées",
    disable: "Désactiver",
    denied:
      "Les notifications sont bloquées pour ce site : autorisez-les dans les réglages du navigateur.",
    unsupported:
      "Ce navigateur ne gère pas les notifications. Sur iPhone, installez d'abord l'app sur l'écran d'accueil.",
    failed: "Impossible d'activer les notifications. Réessayez.",
  },
  systemTitle: "PDS OS",
} as const;
