import type {
  ConnectOutcome,
  GoogleService,
  GoogleServiceStatus,
} from "@/lib/google/services";

/** Paramètres › Connexions: the member's own Google accounts. */
const names: Record<GoogleService, string> = {
  calendar: "Agenda",
  gmail: "Gmail",
  drive: "Drive",
};

const nameOf = (service: string) => names[service as GoogleService] ?? service;

export const googleConnections = {
  title: "Connexions",
  description: "En lecture seule. Vous seul voyez ce qui en est lu.",
  names,
  kinds: {
    work: "Compte pro",
    personal: "Connecté par vous",
  },
  status: {
    connected: "Branché",
    not_set: "Pas encore branché",
    refused: "À autoriser",
    unreachable: "Google ne répond pas",
    off: "Coupé",
  } satisfies Record<GoogleServiceStatus, string>,
  workMissing: (domain: string) =>
    `Aucune adresse @${domain} liée à votre compte : le directeur général l'ajoute dans Équipe.`,
  none: "Aucun compte Google n'est branché pour l'instant.",
  connect: "Connecter un compte Google",
  disconnect: {
    label: "Déconnecter",
    pending: "Déconnexion…",
    title: (email: string) => `Déconnecter ${email} ?`,
    body: "PDS OS ne lira plus ce compte, et son accès est retiré chez Google.",
  },
  disconnected: (email: string) => `${email} déconnecté`,
  outcome: {
    connected: "Compte Google connecté.",
    already: "C'est votre compte pro : il est déjà branché sans rien faire.",
    cancelled: "Connexion annulée.",
    failed: "La connexion à Google n'a pas abouti. Réessayez.",
  } satisfies Record<ConnectOutcome, string>,
  loadError: "Lecture de vos connexions impossible pour l'instant.",
  failed: "Impossible d'enregistrer ce choix pour l'instant.",
  turnedOn: (service: string) => `${nameOf(service)} rebranché`,
  turnedOff: (service: string) => `${nameOf(service)} coupé`,
  // Équipe › Modifier: the member's work address.
  workField: {
    label: "Adresse Google pro",
    hint: "Si ce n'est pas son adresse de connexion : son Agenda, son Gmail et son Drive se branchent alors sans clic.",
    invalid: "Adresse e-mail non valide.",
    outsideDomain: (domain: string) => `L'adresse doit finir par @${domain}.`,
    taken: "Cette adresse est déjà celle d'un autre membre.",
  },
};
