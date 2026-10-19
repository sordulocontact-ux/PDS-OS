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
    project_creative_added: (actor: string, project: string) =>
      `${actor} vous ajoute à l'équipe créative de « ${project} ».`,
    design_version_submitted: (actor: string, project: string) =>
      `${actor} a déposé une version à relire sur « ${project} ».`,
    design_version_approved: (actor: string, project: string) =>
      `${actor} a approuvé votre version sur « ${project} ».`,
    design_version_changes_requested: (actor: string, project: string) =>
      `${actor} demande des retouches sur votre version (« ${project} »).`,
    design_version_discarded: (actor: string, project: string) =>
      `${actor} a écarté votre proposition créative (« ${project} »).`,
    design_submission_requested: (actor: string, project: string) =>
      `${actor} vous demande une décision sur la conception (« ${project} »).`,
    design_submission_decided: (actor: string, project: string) =>
      `${actor} a décidé sur votre demande de validation (« ${project} »).`,
    // A contract or a meeting may have no project: the text never names one.
    contract_review_requested: (actor: string) =>
      `${actor} vous demande de valider un contrat.`,
    contract_approved: (actor: string) => `${actor} a validé votre contrat.`,
    contract_changes_requested: (actor: string) =>
      `${actor} demande des modifications sur votre contrat.`,
    meeting_invited: (actor: string) =>
      `${actor} vous invite à une réunion interne.`,
    call_report_shared: (actor: string) =>
      `${actor} vous partage le compte rendu d'un call.`,
    // The engineer has no account: no actor, the project names it.
    production_version_submitted: (actor: string, project: string) =>
      `${actor} a soumis une version de « ${project} » : votre décision est attendue.`,
    // The provider has no account: no actor, the project names it.
    production_export_deposited: (_actor: string, project: string) =>
      `Un prestataire a déposé un export de « ${project} » : il est à contrôler.`,
    // The provider has no account: no actor, the project names it.
    production_organized: (actor: string, project: string) =>
      `${actor} vous a donné un rôle dans la production de « ${project} » : votre part vous attend.`,
    production_quote_deposited: (_actor: string, project: string) =>
      `Un devis de « ${project} » est arrivé : il est à vérifier.`,
    production_quote_submitted: (actor: string, project: string) =>
      `${actor} a vérifié un devis de « ${project} » : il attend votre validation.`,
    production_quote_decided: (actor: string, project: string) =>
      `${actor} a tranché sur un devis de « ${project} ».`,
    production_direction_submitted: (actor: string, project: string) =>
      `${actor} a envoyé la proposition de réalisation de « ${project} » : elle attend votre validation.`,
    production_direction_decided: (actor: string, project: string) =>
      `${actor} a tranché sur la proposition de réalisation de « ${project} ».`,
    step_blocker_reported: (actor: string, project: string) =>
      `${actor} a signalé un blocage sur « ${project} ».`,
    step_blocker_lifted: (actor: string, project: string) =>
      `${actor} a levé un blocage sur « ${project} ».`,
    step_note_to_decide: (actor: string, project: string) =>
      `${actor} a noté une information à confirmer sur « ${project} ».`,
    production_handed_off: (actor: string, project: string) =>
      `${actor} vous a transmis un livrable de « ${project} » pour les Activations : fichiers, formats et contraintes sont sur sa livraison.`,
    production_step_done: (_actor: string, project: string) =>
      `Un prestataire a terminé sa mission de postproduction sur « ${project} ».`,
    production_call_sheet_published: (actor: string, project: string) =>
      `${actor} a diffusé une nouvelle version de la feuille de service de « ${project} ».`,
    production_shoot_started: (actor: string, project: string) =>
      `${actor} a lancé le tournage de « ${project} » : horaires, lieu et équipe sont sur la fiche.`,
    production_corrections_sent: (actor: string, project: string) =>
      `${actor} vous demande des corrections sur une version de « ${project} ».`,
    master_engineer_signal: (_actor: string, project: string) =>
      `L'ingénieur de « ${project} » vous a écrit : question, retard ou fichier manquant à voir.`,
    // The engineer has no account: no actor, the project names it.
    master_transmission_received: (_actor: string, project: string) =>
      `Le mixeur a bien reçu le dossier de « ${project} ».`,
    master_mix_version_received: (actor: string, project: string) =>
      `${actor} a ajouté une version du mix de « ${project} » : vos retours sont attendus.`,
    master_mix_approved: (actor: string, project: string) =>
      `${actor} a validé le mix final de « ${project} ».`,
    master_mix_changes_requested: (actor: string, project: string) =>
      `${actor} demande une modification du mix de « ${project} ».`,
    master_mastering_version_received: (actor: string, project: string) =>
      `${actor} a ajouté une version du mastering de « ${project} » : vos retours sont attendus.`,
    master_final_approved: (actor: string, project: string) =>
      `${actor} a validé le master final de « ${project} ».`,
    master_mastering_changes_requested: (actor: string, project: string) =>
      `${actor} demande une modification du mastering de « ${project} ».`,
    clearance_terms_proposed: (actor: string, project: string) =>
      `${actor} vous demande de valider les conditions d'un emprunt (« ${project} »).`,
    clearance_terms_validated: (actor: string, project: string) =>
      `${actor} a validé les conditions de l'emprunt (« ${project} ») : le contrat est prêt à envoyer.`,
    clearance_terms_rejected: (actor: string, project: string) =>
      `${actor} demande une contre-proposition sur l'emprunt (« ${project} »).`,
    strategy_review_requested: (actor: string, project: string) =>
      `${actor} vous demande de valider un document de la stratégie de « ${project} ».`,
    strategy_review_approved: (actor: string, project: string) =>
      `${actor} a validé un document de la stratégie de « ${project} ».`,
    strategy_review_changes_requested: (actor: string, project: string) =>
      `${actor} demande une modification d'un document de la stratégie de « ${project} ».`,
    strategy_review_reminder: (actor: string, project: string) =>
      `${actor} vous relance : votre validation est attendue sur la stratégie de « ${project} ».`,
    project_launched: (actor: string, project: string) =>
      `« ${project} » est lancé : ${actor} en est responsable.`,
    brief_approved: (_actor: string, project: string) =>
      `Le Brief de « ${project} » est validé : il est prêt à lire.`,
    call_invited: (actor: string, project: string) =>
      `${actor} vous invite à un call sur « ${project} ».`,
    // The engineer has no account: no actor, the project names it.
    master_delivery_received: (_actor: string, project: string) =>
      `L'ingénieur a déposé une nouvelle version du mix de « ${project} ».`,
    master_mastering_delivery_received: (_actor: string, project: string) =>
      `L'ingénieur a déposé une nouvelle version du mastering de « ${project} ».`,
    // Sent through a public link: no actor, the project names it.
    legal_form_received: (_actor: string, project: string) =>
      `Une fiche de renseignements de « ${project} » est arrivée : elle est à vérifier.`,
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
