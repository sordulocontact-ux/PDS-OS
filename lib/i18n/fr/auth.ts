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
    subtitle: "Demandes d'accès et membres",
    segmentsLabel: "Filtrer par statut",
    segments: {
      pending: "En attente",
      approved: "Actifs",
      rejected: "Refusés",
      suspended: "Suspendus",
    },
    columns: {
      person: "Personne",
      role: "Rôle",
      status: "Statut",
      decision: "Dernière décision",
      actions: "Actions",
    },
    roles: { admin: "Admin", member: "Membre" },
    statuses: {
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
      makeAdmin: "Passer admin",
      removeAdmin: "Retirer admin",
      editName: "Modifier le nom",
    },
    you: "vous",
    reasonLabel: "Motif",
    reasonPlaceholder: "Obligatoire, visible des administrateurs seulement",
    requestedAt: "Demandé le",
    empty: {
      pending: "Aucune demande en attente.",
      approved: "Aucun membre actif.",
      rejected: "Aucune demande refusée.",
      suspended: "Aucun accès suspendu.",
    },
    loadError: "Impossible de charger l'équipe. Rechargez la page.",
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
    required: "Ce champ est obligatoire.",
    tooLong: "Trop long.",
    personHasNoAccount: "Cette personne n'a pas encore de compte.",
    lastUsableAdmin:
      "Impossible : il ne resterait plus aucun administrateur actif.",
    emailChangeForbidden:
      "L'adresse email d'un compte ne peut pas être modifiée.",
    forbidden: "Vous n'avez pas le droit de faire cette action.",
    notFound: "Élément introuvable.",
  },
} as const;
