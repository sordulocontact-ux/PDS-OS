// The fiche de renseignements an outside person fills through a link
// (ticket Juridique 02). Versioned (« La définition du formulaire est
// versionnée ») and written from the ticket's blocks only: no SPPF or The
// Orchard field (« Aucun schéma exhaustif SPPF ou The Orchard n'est
// intégré »). Client-safe: the public page and the server share it.
//
// Each field says where its answer goes (« Les données permanentes
// alimentent Person ; les rôles, crédits et conditions propres au morceau
// alimentent Contribution »).

// v2 (10/10/2026): « Featuring » among the categories of a performer.
// v3 (25/11/2026): date and place of birth, for « né(e) le … à … ».
export const LEGAL_FORM_VERSION = 3;

// « Quel est votre rôle sur ce projet ? », multi-selection with « Autre ».
export const FORM_ROLES = [
  "author",
  "composer",
  "arranger",
  "performer",
  "musician",
  "backing_vocalist",
  "producer",
  "label",
  "provider",
  // A studio, a lawyer: their fiche asks the provider's block (migration
  // 20261010001901).
  "studio",
  "lawyer",
  "publisher",
  "other",
] as const;
export type FormRole = (typeof FORM_ROLES)[number];

export type FormBlock =
  "common" | "creator" | "artist" | "producer" | "provider" | "publisher";

// Which blocks a role opens (the ticket's « Branches de formulaire »): a
// mix or mastering provider never sees the SACEM questions of a creator.
export const BLOCKS_OF: Record<FormRole, FormBlock[]> = {
  author: ["creator"],
  composer: ["creator"],
  arranger: ["creator"],
  performer: ["artist"],
  musician: ["artist"],
  backing_vocalist: ["artist"],
  producer: ["producer"],
  label: ["producer"],
  provider: ["provider"],
  studio: ["provider"],
  lawyer: ["provider"],
  publisher: ["publisher"],
  other: [],
};

export type FieldType = "text" | "email" | "tel" | "textarea" | "select";

export type FormField = {
  id: string;
  block: FormBlock;
  type: FieldType;
  // person: kept on the contact (permanent); contribution: this project.
  target: "person" | "contribution";
  options?: readonly string[];
  required?: boolean;
};

export const FORM_FIELDS: readonly FormField[] = [
  // Tronc commun : identité, pseudonyme, contacts, adresse, personne ou
  // société, raison sociale, SIREN/SIRET, facturation.
  {
    id: "legal_first_name",
    block: "common",
    type: "text",
    target: "person",
    required: true,
  },
  {
    id: "legal_last_name",
    block: "common",
    type: "text",
    target: "person",
    required: true,
  },
  { id: "pseudonym", block: "common", type: "text", target: "person" },
  {
    id: "email",
    block: "common",
    type: "email",
    target: "person",
    required: true,
  },
  { id: "phone", block: "common", type: "tel", target: "person" },
  { id: "address", block: "common", type: "textarea", target: "person" },
  { id: "birth_date", block: "common", type: "text", target: "person" },
  { id: "birth_place", block: "common", type: "text", target: "person" },
  {
    id: "entity_type",
    block: "common",
    type: "select",
    target: "person",
    options: ["person", "company"],
    required: true,
  },
  { id: "company_name", block: "common", type: "text", target: "person" },
  { id: "siret", block: "common", type: "text", target: "person" },
  { id: "billing", block: "common", type: "textarea", target: "person" },
  // Auteur / compositeur / arrangeur.
  {
    id: "management_org",
    block: "creator",
    type: "select",
    target: "person",
    options: ["sacem", "other", "none"],
  },
  { id: "ipi_coad", block: "creator", type: "text", target: "person" },
  {
    id: "declared_pseudonym",
    block: "creator",
    type: "text",
    target: "person",
  },
  { id: "publisher", block: "creator", type: "text", target: "person" },
  {
    id: "contribution",
    block: "creator",
    type: "textarea",
    target: "contribution",
  },
  {
    id: "proposed_split",
    block: "creator",
    type: "text",
    target: "contribution",
  },
  // Artiste / musicien / choriste.
  { id: "credit_name", block: "artist", type: "text", target: "contribution" },
  { id: "performance", block: "artist", type: "text", target: "contribution" },
  {
    id: "category",
    block: "artist",
    type: "select",
    target: "contribution",
    options: ["main", "featuring", "secondary", "musician", "backing"],
  },
  { id: "label_management", block: "artist", type: "text", target: "person" },
  {
    id: "existing_contract",
    block: "artist",
    type: "textarea",
    target: "contribution",
  },
  // Producteur / label.
  { id: "structure", block: "producer", type: "text", target: "person" },
  {
    id: "master_ownership",
    block: "producer",
    type: "text",
    target: "contribution",
  },
  {
    id: "financing",
    block: "producer",
    type: "textarea",
    target: "contribution",
  },
  {
    id: "deal_type",
    block: "producer",
    type: "select",
    target: "contribution",
    options: ["coproduction", "license", "assignment"],
  },
  {
    id: "distributor",
    block: "producer",
    type: "text",
    target: "contribution",
  },
  {
    id: "neighbouring_rights_org",
    block: "producer",
    type: "text",
    target: "person",
  },
  { id: "isrc_root", block: "producer", type: "text", target: "person" },
  // Prestataire.
  { id: "function", block: "provider", type: "text", target: "contribution" },
  { id: "agreed_fee", block: "provider", type: "text", target: "contribution" },
  {
    id: "deliverable",
    block: "provider",
    type: "textarea",
    target: "contribution",
  },
  {
    id: "wished_credit",
    block: "provider",
    type: "text",
    target: "contribution",
  },
  // Éditeur.
  {
    id: "represented_creator",
    block: "publisher",
    type: "text",
    target: "contribution",
  },
  { id: "publisher_org", block: "publisher", type: "text", target: "person" },
  { id: "publisher_ipi", block: "publisher", type: "text", target: "person" },
  {
    id: "publisher_share",
    block: "publisher",
    type: "text",
    target: "contribution",
  },
  { id: "territory", block: "publisher", type: "text", target: "contribution" },
];

/** The fields shown for these roles: the common trunk, then their blocks.
 * `network`: a Réseau fiche (no project) asks only what is kept on the
 * person, never a project's contribution. */
export function fieldsFor(
  roles: readonly FormRole[],
  { network = false }: { network?: boolean } = {},
): FormField[] {
  const blocks = new Set<FormBlock>([
    "common",
    ...roles.flatMap((role) => BLOCKS_OF[role]),
  ]);
  return FORM_FIELDS.filter(
    (field) =>
      blocks.has(field.block) && (!network || field.target === "person"),
  );
}

export const MAX_ANSWER = 2000;
