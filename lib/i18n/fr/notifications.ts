// « (« PDS MIC #5 ») » after a deal's words, nothing for a deal without a
// project (the text then falls back on « un projet »).
const dealOf = (project: string) =>
  project === "un projet" ? "" : ` (« ${project} »)`;

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
  // The menu's tabs (Figma: All, Requests, Unread), with their counts.
  tabs: {
    label: "Notifications à afficher",
    all: "Toutes",
    requests: "Demandes",
    unread: "Non lues",
  },
  emptyRequests: "Aucune demande en attente.",
  emptyUnread: "Tout est lu.",
  groups: {
    today: "Aujourd'hui",
    week: "7 derniers jours",
    older: "Plus ancien",
  },
  unreadDot: "Non lue",
  ago: {
    now: "à l'instant",
    minutes: (count: number) => `il y a ${count} min`,
    hours: (count: number) => `il y a ${count} h`,
  },
  settings: "Réglages des notifications",
  pdsOs: "PDS OS",
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
    design_sheet_new_version: (actor: string, project: string) =>
      `${actor} a transféré une nouvelle version d'une Fiche Livrable en Production (« ${project} »).`,
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
    // The company has no account: the project names it.
    production_quote_changes: (actor: string, project: string) =>
      `${actor} demande une modification d'un devis de « ${project} ».`,
    production_version_decided: (_actor: string, project: string) =>
      `La validation créative externe a donné son retour sur le montage de « ${project} ».`,
    production_final_deposited: (_actor: string, project: string) =>
      `La société a déposé le fichier final validé de « ${project} » : à contrôler.`,
    production_delivered: (actor: string, project: string) =>
      `${actor} vous a livré un livrable de « ${project} ». Livré ne veut pas dire publié.`,
    production_schedule_changed: (actor: string, project: string) =>
      `${actor} a changé la date du tournage de « ${project} » : le planning est à revoir.`,
    production_ready_requested: (actor: string, project: string) =>
      `${actor} demande de valider la préparation du tournage de « ${project} » malgré des points critiques : votre décision est attendue.`,
    production_ready_decided: (actor: string, project: string) =>
      `${actor} a décidé de la dérogation avant le tournage de « ${project} ».`,
    production_rushes_linked: (_actor: string, project: string) =>
      `La société a transmis le lien des rushes de « ${project} » : à récupérer.`,
    production_director_proposed: (_actor: string, project: string) =>
      `La société de production propose un réalisateur pour « ${project} » : à retenir.`,
    distribution_version_submitted: (actor: string, project: string) =>
      `${actor} a soumis le dossier de livraison de « ${project} » : il attend votre validation.`,
    distribution_version_decided: (actor: string, project: string) =>
      `${actor} a tranché sur le dossier de livraison de « ${project} ».`,
    distribution_closure_proposed: (actor: string, project: string) =>
      `${actor} propose de clôturer la distribution de « ${project} » : votre décision est attendue.`,
    distribution_closure_decided: (actor: string, project: string) =>
      `${actor} a tranché sur la clôture de la distribution de « ${project} ».`,
    distribution_derogation_granted: (actor: string, project: string) =>
      `${actor} a accordé une dérogation sur le dossier de distribution de « ${project} ».`,
    distribution_reserve_lift_requested: (actor: string, project: string) =>
      `${actor} demande à lever une réserve de la distribution de « ${project} » : confirmez la preuve.`,
    distribution_reserve_lift_decided: (actor: string, project: string) =>
      `${actor} a tranché sur la levée d'une réserve de la distribution de « ${project} ».`,
    distribution_reserve_overdue: (_actor: string, project: string) =>
      `Une réserve de la distribution de « ${project} » a dépassé son échéance : à lever ou à arbitrer.`,
    marketing_report_submitted: (actor: string, project: string) =>
      `${actor} a soumis le bilan Marketing de « ${project} » : il attend votre décision.`,
    marketing_report_decided: (actor: string, project: string) =>
      `${actor} a tranché sur le bilan Marketing de « ${project} ».`,
    marketing_closure_requested: (actor: string, project: string) =>
      `${actor} demande la clôture du Marketing de « ${project} » : votre décision est attendue.`,
    marketing_closure_decided: (actor: string, project: string) =>
      `${actor} a tranché sur la clôture du Marketing de « ${project} ».`,
    marketing_closure_reopened: (actor: string, project: string) =>
      `${actor} a rouvert le Marketing de « ${project} ».`,
    activation_owner_assigned: (actor: string, project: string) =>
      `${actor} vous a confié une activation de « ${project} ».`,
    activation_suspended: (actor: string, project: string) =>
      `${actor} a suspendu une de vos activations de « ${project} ».`,
    activation_creator_acted: (_actor: string, project: string) =>
      `Une créatrice a agi sur son lien privé pour « ${project} » : contenu, publication ou facture à reprendre.`,
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
    master_source_newer: (_actor: string, project: string) =>
      `Une nouvelle version d'un titre de « ${project} » est arrivée au Catalogue : les voix définitives ? Remplacez la source.`,
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
      `${actor} vous demande de valider les conditions d'utilisation d'une œuvre existante (« ${project} »).`,
    clearance_terms_validated: (actor: string, project: string) =>
      `${actor} a validé les conditions d'utilisation (« ${project} ») : la licence est prête à envoyer.`,
    clearance_reply_received: (_actor: string, project: string) =>
      `Un ayant droit a répondu à votre demande d'autorisation (« ${project} ») : sa réponse vous attend.`,
    clearance_terms_rejected: (actor: string, project: string) =>
      `${actor} demande une contre-proposition sur l'autorisation d'utilisation (« ${project} »).`,
    legal_template_to_validate: (actor: string, project: string) =>
      `${actor} vous demande de valider un modèle de contrat (« ${project} »).`,
    legal_template_validated: (actor: string, project: string) =>
      `${actor} a validé votre modèle de contrat (« ${project} ») : il entre dans la bibliothèque.`,
    legal_template_refused: (actor: string, project: string) =>
      `${actor} a refusé votre modèle de contrat (« ${project} ») : voyez pourquoi dans les contrats à prévoir.`,
    legal_invoice_received: (_actor: string, project: string) =>
      `Une facture est arrivée pour « ${project} » : à payer.`,
    legal_invoice_paid: (actor: string, project: string) =>
      `${actor} a marqué une facture de « ${project} » comme payée.`,
    legal_contract_signed_received: (_actor: string, project: string) =>
      `Un contrat signé est arrivé par un lien privé (« ${project} ») : à vérifier, puis à marquer comme signé.`,
    legal_bulletin_signed: (_actor: string, project: string) =>
      `Un bulletin SACEM signé est arrivé par un lien privé (« ${project} »).`,
    // The deals (BIZ 4): the project's name only when the deal has one.
    deal_assigned: (actor: string, project: string) =>
      `${actor} vous confie un deal${dealOf(project)} : à vous de négocier.`,
    deal_agreement_proposed: (actor: string, project: string) =>
      `${actor} propose un accord de principe${dealOf(project)} : à valider.`,
    deal_agreement_validated: (actor: string, project: string) =>
      `${actor} a validé l'accord de principe${dealOf(project)} : place au contrat.`,
    deal_agreement_refused: (actor: string, project: string) =>
      `${actor} renvoie l'accord de principe en négociation${dealOf(project)} : voyez pourquoi.`,
    deal_follow_up_due: (_actor: string, project: string) =>
      `Une relance est due aujourd'hui${dealOf(project)}.`,
    deal_memo_received: (_actor: string, project: string) =>
      `Un deal memo est arrivé par e-mail${dealOf(project)} : à montrer à la direction.`,
    deal_memo_submitted: (actor: string, project: string) =>
      `${actor} vous montre un deal memo${dealOf(project)} : à valider.`,
    deal_memo_changes_requested: (actor: string, project: string) =>
      `${actor} demande des modifications au deal memo${dealOf(project)} : voyez pourquoi.`,
    deal_memo_validated: (actor: string, project: string) =>
      `${actor} a validé le deal memo${dealOf(project)} : renvoyez l'accord.`,
    deal_memo_sent: (actor: string, project: string) =>
      `${actor} a renvoyé l'accord validé${dealOf(project)}.`,
    // A selection of artists handed over (lot 4 of docs/pds-mic-plan.md):
    // no project yet.
    selection_transmitted: (actor: string, selection: string) =>
      selection
        ? `${actor} vous transmet la sélection d'artistes « ${selection} ».`
        : `${actor} vous transmet une sélection d'artistes.`,
    legal_element_withdrawn: (actor: string, project: string) =>
      `${actor} a retiré un élément repris d'une œuvre existante de « ${project} » : le passage est à refaire sans lui dans le Master.`,
    strategy_review_requested: (actor: string, project: string) =>
      `${actor} vous demande de valider un document de la stratégie de « ${project} ».`,
    strategy_review_approved: (actor: string, project: string) =>
      `${actor} a validé un document de la stratégie de « ${project} ».`,
    strategy_review_changes_requested: (actor: string, project: string) =>
      `${actor} demande une modification d'un document de la stratégie de « ${project} ».`,
    strategy_review_reminder: (actor: string, project: string) =>
      `${actor} vous relance : votre validation est attendue sur la stratégie de « ${project} ».`,
    strategy_validated: (_actor: string, project: string) =>
      `La Stratégie de « ${project} » est validée : le Brief de sortie alimente la Conception et les Activations.`,
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
    master_invoice_received: (_actor: string, project: string) =>
      `La facture de l'ingénieur de « ${project} » est arrivée : elle est à payer sous 30 jours.`,
    master_bank_details_changed: (_actor: string, project: string) =>
      `L'ingénieur de « ${project} » a donné un nouveau RIB : vérifiez-le par téléphone avant de payer.`,
    master_delay_escalated: (actor: string, project: string) =>
      `${actor} vous envoie un retard de l'ingénieur de « ${project} » : le master final passerait après la sortie, à vous d'arbitrer.`,
    master_delay_decided: (actor: string, project: string) =>
      `${actor} a tranché le retard de l'ingénieur de « ${project} ».`,
    master_files_requested: (actor: string, project: string) =>
      `${actor} vous demande des fichiers pour « ${project} » : déposez la source de chaque titre dans le Master.`,
    master_files_received: (actor: string, project: string) =>
      `${actor} a déposé un fichier demandé pour « ${project} » : la source du titre est à confirmer.`,
    participation_waiver_granted: (actor: string, project: string) =>
      `${actor} a accordé une dérogation pour un contrat de participation non signé de « ${project} ».`,
    participation_waiver_revoked: (actor: string, project: string) =>
      `${actor} a révoqué une dérogation à un contrat de participation de « ${project} » : le contrat redevient nécessaire.`,
    master_round_assigned: (actor: string, project: string) =>
      `${actor} vous confie le mix ou le mastering de « ${project} » : le dossier est dans PDS OS, déposez-y vos versions.`,
    master_deliverable_received: (_actor: string, project: string) =>
      `L'ingénieur de « ${project} » a déposé un livrable sur son lien.`,
    master_listen_feedback: (_actor: string, project: string) =>
      `L'artiste de « ${project} » a écouté une version et vous laisse son retour.`,
    master_invoice_paid: (actor: string, project: string) =>
      `${actor} a marqué payée la facture de l'ingénieur de « ${project} ».`,
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
