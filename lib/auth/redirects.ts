// Imported from Ibé's PO foundation (po/lib/auth/redirects.ts), routes extended.
// Les états d'accès et la seule fonction qui décide où envoyer quelqu'un.
// Chaque état a exactement une page qui l'affiche ; toutes les autres y
// renvoient. C'est ce qui garantit l'absence de boucle de redirection.

export type AccessState =
  | "anonymous"
  | "unlinked"
  // La base n'a pas pu répondre. L'accès est refusé par prudence, mais ce
  // n'est pas un problème de compte : c'est une panne, et elle se réessaie.
  | "unavailable"
  | "disabled"
  | "pending"
  | "approved"
  | "rejected"
  | "suspended";

export const ACCESS_STATES: readonly AccessState[] = [
  "anonymous",
  "unlinked",
  "unavailable",
  "disabled",
  "pending",
  "approved",
  "rejected",
  "suspended",
];

// PDS positions. A position is not a permission: what each one allows is
// decided by the database (role_permissions) and read from get_my_access.
export const ORGANIZATION_ROLES = [
  "general_director",
  "project_manager",
  "creative_director",
] as const;
export type OrganizationRole = (typeof ORGANIZATION_ROLES)[number];

export function isOrganizationRole(value: unknown): value is OrganizationRole {
  return (
    typeof value === "string" &&
    (ORGANIZATION_ROLES as readonly string[]).includes(value)
  );
}

// Permissions of the V1 matrix (docs/CONTEXTE-PROJET.md § 12). Checks ask
// for a permission, never for a position.
export const PERMISSIONS = [
  "administer",
  "assign_projects",
  "validate",
  "pilot_projects",
  "creative_work",
  "manage_catalog",
  "create_projects",
  // Sees every project, and reads their contracts (the direction).
  "view_all_projects",
  "archive_records",
  "read_feedback",
  // Adds and edits the people and organizations of the network.
  "manage_network",
  // Creates and follows contracts (the direction and project managers).
  "manage_contracts",
  // Sees and runs a project's Juridique (the direction and project managers).
  "manage_legal",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

export function isPermission(value: unknown): value is Permission {
  return (
    typeof value === "string" &&
    (PERMISSIONS as readonly string[]).includes(value)
  );
}

export const routes = {
  home: "/",
  login: "/login",
  signup: "/signup",
  verifyEmail: "/verify-email",
  forgotPassword: "/forgot-password",
  resetPassword: "/reset-password",
  authConfirm: "/auth/confirm",
  authState: "/auth/state",
  pending: "/pending",
  accessDenied: "/access-denied",
  unavailable: "/unavailable",
  app: "/app",
  assistant: "/app/assistant",
  work: "/app/work",
  calls: "/app/calls",
  // An internal meeting: a call without a project.
  meeting: (callId: string) => `/app/calls/${callId}`,
  // Every file the viewer may read, across artists, titles, projects, contracts.
  files: "/app/files",
  // Features on trial before they enter the app (any member).
  labo: "/app/labo",
  network: "/app/network",
  networkContact: (id: string) => `/app/network/${id}`,
  contracts: "/app/contracts",
  contract: (id: string) => `/app/contracts/${id}`,
  contractTemplates: "/app/contracts/templates",
  contractDocumentPdf: (id: string) => `/api/contracts/${id}/document`,
  formalityDocumentPdf: (id: string, version: number) =>
    `/api/legal/formalities/${id}/document?version=${version}`,
  feedback: "/app/feedback",
  members: "/app/members",
  membersNew: "/app/members/new",
  artists: "/app/catalog/artists",
  artist: (id: string) => `/app/catalog/artists/${id}`,
  artistDiscography: (id: string) => `/app/catalog/artists/${id}/discography`,
  artistMasters: (id: string) => `/app/catalog/artists/${id}/masters`,
  artistProjects: (id: string) => `/app/catalog/artists/${id}/projects`,
  artistFiles: (id: string) => `/app/catalog/artists/${id}/files`,
  artistActivity: (id: string) => `/app/catalog/artists/${id}/activity`,
  masters: "/app/catalog/masters",
  mastersNew: "/app/catalog/masters/new",
  master: (id: string) => `/app/catalog/masters/${id}`,
  // Six tabs (overview, audio, credits, rights, projects, files); the other
  // sections are blocks of one of them, reached by their anchor. Their old
  // URLs redirect here.
  masterAudio: (id: string) => `/app/catalog/masters/${id}/audio`,
  masterSessions: (id: string) => `/app/catalog/masters/${id}/audio#sessions`,
  masterVariants: (id: string) => `/app/catalog/masters/${id}#variants`,
  masterCredits: (id: string) => `/app/catalog/masters/${id}/credits`,
  masterSplits: (id: string) =>
    `/app/catalog/masters/${id}/credits#splits-master`,
  masterRights: (id: string) => `/app/catalog/masters/${id}/rights`,
  masterDistribution: (id: string) =>
    `/app/catalog/masters/${id}/projects#distribution`,
  masterProjects: (id: string) => `/app/catalog/masters/${id}/projects`,
  masterFiles: (id: string) => `/app/catalog/masters/${id}/files`,
  masterActivity: (id: string) => `/app/catalog/masters/${id}#activity`,
  // Title form pre-filled from another title (name, credits): a variant.
  mastersNewVariantOf: (masterId: string) =>
    `/app/catalog/masters/new?variantOf=${masterId}`,
  // Title form with this artist already credited (from the artist page).
  mastersNewForArtist: (artistId: string) =>
    `/app/catalog/masters/new?artist=${artistId}`,
  projects: "/app/projects",
  projectsNew: "/app/projects/new",
  // Creation form with this master already linked (from the master page).
  projectsNewFromMaster: (masterId: string) =>
    `/app/projects/new?master=${masterId}`,
  project: (id: string) => `/app/projects/${id}`,
  projectFraming: (id: string) => `/app/projects/${id}/framing`,
  // One screen of the Framing's guided review (lib/framing/guide.ts).
  projectFramingStep: (id: string, step: string) =>
    `/app/projects/${id}/framing?step=${step}`,
  // One question of the Cadrage intelligent (lib/framing/dimensions.ts).
  projectFramingQuestion: (id: string, dimension: string, key: string) =>
    `/app/projects/${id}/framing?step=${dimension}&q=${key}`,
  // What PO understood from a framing call, to confirm item by item.
  projectFramingReview: (id: string, callId: string) =>
    `/app/projects/${id}/framing?step=review&call=${callId}`,
  // The plan PO proposes once the Brief is validated: a section of the
  // overview (there is no plan page).
  projectPlan: (id: string) => `/app/projects/${id}#plan`,
  // The shareable Brief, printable as a PDF.
  projectFramingBrief: (id: string) => `/app/projects/${id}/framing/brief`,
  // The same Brief as a downloaded PDF file.
  projectFramingBriefPdf: (id: string) => `/api/projects/${id}/framing-brief`,
  projectStrategy: (id: string) => `/app/projects/${id}/strategy`,
  // The Brief de sortie consolidé (ticket Stratégie § 8).
  projectStrategyBrief: (id: string) => `/app/projects/${id}/strategy/brief`,
  // One stored version of the Brief de sortie (V1, V2…), as it was sent.
  // A strategy document's version by its id: redirects to its page.
  projectStrategyDocument: (id: string, documentId: string) =>
    `/app/projects/${id}/strategy/document/${documentId}`,
  projectStrategyBriefVersion: (id: string, version: number) =>
    `/app/projects/${id}/strategy/brief?v=${version}`,
  // A stored version of a strategy document as a PDF file.
  projectStrategyDocumentPdf: (id: string, documentId: string) =>
    `/api/projects/${id}/strategy-documents/${documentId}`,
  // The Plan de sortie generator, one step at a time (ticket Stratégie § 11).
  // Follow-up of a validated strategy, before and after the release.
  projectStrategyFollowUp: (id: string) =>
    `/app/projects/${id}/strategy/follow-up`,
  projectStrategyReleasePlan: (id: string, step?: number) =>
    `/app/projects/${id}/strategy/release-plan${step ? `?step=${step}` : ""}`,
  // The Dossier de presse generator, one step at a time (ticket § 12).
  projectStrategyPressKit: (id: string, step?: number) =>
    `/app/projects/${id}/strategy/press-kit${step ? `?step=${step}` : ""}`,
  // A shared external document of the Stratégie, read without an account.
  sharedDocument: (token: string) => `/d/${token}`,
  // A dimension of the Stratégie open in its work panel.
  projectStrategyDimension: (id: string, dimension: string) =>
    `/app/projects/${id}/strategy?d=${dimension}`,
  projectDesign: (id: string) => `/app/projects/${id}/design`,
  // The Conception's direct work (Chemin B), on one target: a deliverable
  // (design_deliverables.id) or « direction ».
  projectDesignWork: (id: string, target?: string) =>
    `/app/projects/${id}/design/work${target ? `?d=${target}` : ""}`,
  // Moodboards and references, one resource linked to any number of targets.
  projectDesignReferences: (id: string) =>
    `/app/projects/${id}/design/references`,
  // The artistic direction: responsible, validators, synthesis, submissions.
  projectDesignDirection: (id: string) =>
    `/app/projects/${id}/design/direction`,
  // The Brief créatif global; `version` opens a stored one.
  projectDesignBrief: (id: string, version?: number) =>
    `/app/projects/${id}/design/brief${version ? `?v=${version}` : ""}`,
  // The Fiches Livrables, then one of them.
  projectDesignSheets: (id: string) => `/app/projects/${id}/design/sheets`,
  projectDesignSheet: (id: string, sheetId: string) =>
    `/app/projects/${id}/design/sheets/${sheetId}`,
  // One deliverable of the Conception, by its anchor.
  projectDesignDeliverable: (id: string, deliverableId: string) =>
    `/app/projects/${id}/design#deliverable-${deliverableId}`,
  projectCalls: (id: string) => `/app/projects/${id}/calls`,
  projectCall: (id: string, callId: string) =>
    `/app/projects/${id}/calls/${callId}`,
  projectRelease: (id: string) => `/app/projects/${id}/release`,
  // Distribution in five steps (lib/ui/distribution-steps.ts): Préparation
  // above, then the Dossier de livraison, the Suivi of the manual deposit,
  // the Plateformes (detection, links, smartlink) and the Clôture.
  projectReleaseDossier: (id: string) => `/app/projects/${id}/release/dossier`,
  projectReleaseTracking: (id: string) =>
    `/app/projects/${id}/release/tracking`,
  projectReleaseOnline: (id: string) => `/app/projects/${id}/release/online`,
  projectReleaseClosure: (id: string) => `/app/projects/${id}/release/closure`,
  // Specialised workflows next to the 7 steps, one URL per internal step.
  projectMaster: (id: string) => `/app/projects/${id}/master`,
  projectMasterStep: (id: string, step: string) =>
    `/app/projects/${id}/master/${step}`,
  projectLegal: (id: string) => `/app/projects/${id}/legal`,
  projectLegalStep: (id: string, step: string) =>
    `/app/projects/${id}/legal/${step}`,
  projectActivations: (id: string) => `/app/projects/${id}/activations`,
  // One activation followed by the Marketing, with its evidence.
  projectActivation: (id: string, activationId: string) =>
    `/app/projects/${id}/activations/${activationId}`,
  projectProduction: (id: string) => `/app/projects/${id}/production`,
  // Production of one committed deliverable: its preparation.
  projectProductionSheet: (id: string, deliverableId: string) =>
    `/app/projects/${id}/production/${deliverableId}`,
  // Its other tabs: preproduction, shoot, post, delivery.
  projectProductionStep: (id: string, deliverableId: string, step: string) =>
    `/app/projects/${id}/production/${deliverableId}/${step}`,
  // Marketing › Suivi & bilan (ticket « Suivi & bilan »): the dashboard.
  projectReview: (id: string) => `/app/projects/${id}/review`,
  projectReviewReports: (id: string) => `/app/projects/${id}/review/reports`,
  // Marketing › Clôture: preparing and deciding the Marketing closing.
  projectReviewClosure: (id: string) => `/app/projects/${id}/review/closure`,
  projectReviewReportNew: (id: string) =>
    `/app/projects/${id}/review/reports/new`,
  projectReviewReport: (id: string, reportId: string, compare?: string) =>
    `/app/projects/${id}/review/reports/${reportId}${compare ? `?compare=${compare}` : ""}`,
  projectReviewReportPdf: (id: string, reportId: string) =>
    `/api/projects/${id}/marketing-reports/${reportId}`,
  // Vue d'ensemble › Clôture du projet: the whole project's closing, a
  // process apart from the Marketing closing.
  projectClosure: (id: string) => `/app/projects/${id}/closure`,
  projectWork: (id: string) => `/app/projects/${id}/work`,
  projectTeam: (id: string) => `/app/projects/${id}/team`,
  projectDeliverables: (id: string) => `/app/projects/${id}/deliverables`,
  projectFiles: (id: string) => `/app/projects/${id}/files`,
  projectPlanning: (id: string) => `/app/projects/${id}/planning`,
  projectBudget: (id: string) => `/app/projects/${id}/budget`,
  projectValidations: (id: string) => `/app/projects/${id}/validations`,
  projectActivity: (id: string) => `/app/projects/${id}/activity`,
  // Public, no account: smartlink of a release.
  smartlink: (token: string) => `/l/${token}`,
  // Public, no account: a fiche de renseignements (Juridique 02).
  legalForm: (token: string) => `/f/${token}`,
  legalSplit: (token: string) => `/s/${token}`,
} as const;

export function destinationFor(state: AccessState): string {
  switch (state) {
    case "anonymous":
      return routes.login;
    case "pending":
    case "unlinked":
      return routes.pending;
    case "unavailable":
      return routes.unavailable;
    case "approved":
      return routes.app;
    case "rejected":
    case "suspended":
    case "disabled":
      return routes.accessDenied;
  }
}

/** Where to go back once the database answers again: a page of the app the
 * person was on, never another site (an open redirect). */
export function safeReturnPath(value: unknown): string {
  return typeof value === "string" &&
    /^\/app(\/|$|\?)/.test(value) &&
    !value.includes("\\") &&
    !value.startsWith("//")
    ? value
    : routes.app;
}

/** /unavailable, remembering the page to return to. */
export function unavailableFrom(path: string): string {
  return `${routes.unavailable}?next=${encodeURIComponent(safeReturnPath(path))}`;
}

export function isAccessState(value: unknown): value is AccessState {
  return (
    typeof value === "string" && (ACCESS_STATES as string[]).includes(value)
  );
}
