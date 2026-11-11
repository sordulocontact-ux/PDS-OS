/** Authentication, access states and team screen (step 3). */
export const auth = {
  common: {
    signIn: "Se connecter",
    signUp: "Créer un compte",
    signOut: "Se déconnecter",
    cancel: "Annuler",
    save: "Enregistrer",
    saving: "Enregistrement…",
    loading: "Chargement…",
    backHome: "Accueil",
  },

  entry: {
    title: "Bienvenue",
    body: "L'outil interne de suivi des sorties musicales. Connectez-vous, ou créez un compte : un administrateur validera votre accès.",
  },

  fields: {
    firstName: "Prénom",
    lastName: "Nom",
    email: "Adresse email",
    password: "Mot de passe",
    passwordConfirm: "Confirmez le mot de passe",
    passwordHint: "10 caractères minimum",
  },

  signup: {
    title: "Créer un compte",
    submit: "Créer mon compte",
    submitting: "Création…",
    haveAccount: "J'ai déjà un compte",
  },

  verifyEmail: {
    title: "Vérifiez votre boîte mail",
    body: "Un email vient de vous être envoyé. Cliquez sur le lien pour confirmer votre adresse.",
    resendTitle: "Rien reçu ?",
    resend: "Renvoyer l'email",
    resending: "Envoi…",
    resent: "Si cette adresse est enregistrée, un nouvel email est parti.",
  },

  login: {
    title: "Connexion",
    submit: "Se connecter",
    submitting: "Connexion…",
    forgot: "Mot de passe oublié ?",
    noAccount: "Créer un compte",
    resendLink: "Renvoyer l'email de confirmation",
  },

  forgotPassword: {
    title: "Mot de passe oublié",
    body: "Indiquez votre adresse. Si elle est enregistrée, vous recevrez un lien.",
    submit: "Envoyer le lien",
    submitting: "Envoi…",
    sent: "Si cette adresse est enregistrée, vous recevrez un lien.",
    backToLogin: "Retour à la connexion",
  },

  resetPassword: {
    title: "Nouveau mot de passe",
    submit: "Enregistrer",
    submitting: "Enregistrement…",
  },

  pending: {
    title: "En attente de validation",
    body: "Votre adresse est confirmée. Un administrateur doit maintenant valider votre accès. Cette page se mettra à jour d'elle-même.",
    unlinked:
      "Votre compte est en cours de finalisation. Si ce message persiste, contactez l'équipe.",
    signedInAs: "Connecté en tant que",
  },

  unavailable: {
    title: "Service momentanément indisponible",
    body: "L'application n'arrive pas à joindre sa base de données. Votre compte n'est pas en cause.",
    instruction:
      "Réessayez dans un instant. Si le problème persiste, prévenez l'équipe.",
    retry: "Réessayer",
  },

  accessDenied: {
    // Name of the browser tab, whatever the reason.
    tab: "Accès impossible",
    rejected: {
      title: "Accès refusé",
      body: "Votre demande d'accès n'a pas été acceptée.",
    },
    suspended: {
      title: "Accès suspendu",
      body: "Votre accès est suspendu.",
    },
    disabled: {
      title: "Compte désactivé",
      body: "Ce compte est désactivé.",
    },
    contact: "Pour toute question, adressez-vous à l'équipe.",
  },

  members: {
    title: "Équipe",
    subtitle: "Comptes, postes et demandes d'accès",
    segmentsLabel: "Filtrer par statut",
    segments: {
      invited: "Invités",
      pending: "En attente",
      approved: "Actifs",
      rejected: "Refusés",
      suspended: "Suspendus",
    },
    columns: {
      person: "Personne",
      role: "Poste",
      status: "Statut",
      decision: "Dernière décision",
      actions: "Actions",
    },
    roles: {
      general_director: "Directeur général",
      project_manager: "Chef de projet",
      creative_director: "Directeur créatif",
      business_manager: "Business manager",
      business: "Business",
    },
    statuses: {
      invited: "Invité",
      pending: "En attente",
      approved: "Actif",
      rejected: "Refusé",
      suspended: "Suspendu",
    },
    actions: {
      approve: "Approuver",
      reject: "Refuser",
      suspend: "Suspendre",
      reactivate: "Réactiver",
      rolePlaceholder: "Choisir un poste",
      cancelInvite: "Annuler l'invitation",
      copyLink: "Copier le lien",
    },
    // "Modifier" modal of a row: name and position.
    edit: {
      title: "Modifier le membre",
      description: "Nom et poste dans l'équipe.",
      saved: "Modifications enregistrées.",
      // Why the position is not in the form.
      roleLocked: {
        self: "Votre propre poste ne se change pas ici.",
        undecided: "Le poste se choisit en approuvant l'accès.",
        suspended: "Réactivez l'accès pour changer de poste.",
      },
    },
    you: "vous",
    noRole: "À définir",
    reasonLabel: "Motif",
    reasonPlaceholder: "Obligatoire, visible des administrateurs seulement",
    requestedAt: "Demandé le",
    invitedAt: "Invité le",
    invitationCancelledNote: "Invitation annulée",
    empty: {
      invited: "Aucune invitation en cours.",
      pending: "Aucune demande en attente.",
      approved: "Aucun membre actif.",
      rejected: "Aucune demande refusée.",
      suspended: "Aucun accès suspendu.",
    },
    loadError: "Impossible de charger l'équipe. Rechargez la page.",
    create: "Créer un compte",
  },

  newMember: {
    title: "Créer un compte",
    subtitle:
      "Adresse, mot de passe et poste : le compte est prêt à l'emploi, sans validation.",
    back: "Équipe",
    role: "Poste",
    roleHint: {
      general_director:
        "Voit et administre l'ensemble. Attribue les projets et valide tout ce qui est soumis à validation.",
      project_manager:
        "Reçoit les projets attribués, les accepte, les refuse ou demande une précision, puis les pilote.",
      creative_director:
        "Travaille sur les projets et livrables créatifs qui lui sont affectés. Sans administration ni validation.",
      business_manager:
        "Négocie les dossiers qui lui sont affectés (artistes, titres, partenariats). Ne modifie pas les projets.",
      business:
        "Développe les partenariats et les opportunités commerciales, et négocie les dossiers qui lui sont affectés.",
    },
    submit: "Créer le compte",
    submitting: "Création…",
    cancel: "Annuler",
    passwordHint: "10 caractères minimum. À transmettre à la personne.",
    successTitle: (firstName: string) => `Compte de ${firstName} prêt`,
    readyBody: (email: string) =>
      `Connexion possible dès maintenant avec ${email} et le mot de passe choisi.`,
    confirmBody: (email: string) =>
      `Un email de confirmation a été envoyé à ${email}. Dès que la personne l'a confirmé, son accès s'ouvre avec le poste choisi. Si l'email n'arrive pas, envoyez-lui ce lien.`,
    linkLabel: "Lien d'inscription",
    copy: "Copier",
    copied: "Lien copié",
    copyFailed: "Copie impossible : sélectionnez le lien à la main.",
    another: "Créer un autre compte",
    toTeam: "Voir l'équipe",
  },

  errors: {
    generic: "Une erreur est survenue. Réessayez dans un instant.",
    invalidCredentials: "Email ou mot de passe incorrect.",
    emailNotConfirmed: "Confirmez d'abord votre adresse email.",
    rateLimit: "Trop de tentatives. Réessayez dans quelques minutes.",
    weakPassword: "Le mot de passe doit contenir au moins 10 caractères.",
    samePassword: "Le nouveau mot de passe doit être différent de l'ancien.",
    passwordMismatch: "Les deux mots de passe ne correspondent pas.",
    linkInvalid: "Ce lien n'est plus valide. Demandez un nouvel email.",
    invalidEmail: "Adresse email invalide.",
    emailTaken: "Un compte existe déjà avec cette adresse. Connectez-vous.",
    required: "Ce champ est obligatoire.",
    tooLong: "Trop long.",
    personHasNoAccount: "Cette personne n'a pas encore de compte.",
    accountNotCreated:
      "Le poste est enregistré mais le compte n'a pas pu être créé. Réessayez, ou envoyez le lien d'inscription depuis l'onglet Invités.",
    personHasAccount:
      "Cette adresse a déjà un compte : retrouvez la personne dans l'équipe pour l'approuver ou changer son poste.",
    invalidRole: "Choisissez un poste.",
    lastUsableAdmin:
      "Impossible : il ne resterait plus aucun directeur général actif.",
    emailChangeForbidden:
      "L'adresse email d'un compte ne peut pas être modifiée.",
    forbidden: "Vous n'avez pas le droit de faire cette action.",
    notFound: "Élément introuvable.",
  },
} as const;
