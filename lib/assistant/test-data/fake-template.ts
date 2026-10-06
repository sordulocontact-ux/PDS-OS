import "server-only";

import type { Supabase } from "@/lib/assistant/test-data/writes";
import type { ContractType } from "@/lib/contracts/types";
import type { FormRole } from "@/lib/legal/forms/definition";

/**
 * Fake contract templates for tests (docs/ASSISTANT.md § 3 ter): fixed texts
 * written here, in code, never by the model — the rule « aucune clause n'est
 * inventée » holds. Each is marked fictitious and uses only known {{fields}},
 * so « Générer le contrat » can be tried end to end. Created as drafts: the
 * director validates them like any template.
 */

type FakeTemplate = {
  name: string;
  type: ContractType;
  roles: FormRole[];
  usage: string;
  body: string;
};

const HEADER =
  "MODÈLE DE TEST — texte fictif créé par PO pour essayer l'application, sans aucune valeur juridique.";

const PARTIES = `Entre {{organisation.nom}}, ci-après « le Label »,
et {{personne.nom_civil}}, dit·e « {{personne.nom_artiste}} »,
statut : {{personne.statut}}, société : {{personne.societe}}, SIRET : {{personne.siret}},
adresse : {{personne.adresse}}, e-mail : {{personne.email}}, téléphone : {{personne.telephone}},
IPI : {{personne.ipi}}.`;

const SIGNATURES = `Fait en deux exemplaires.

Le Label                                  {{personne.nom_civil}}`;

const TEMPLATES: FakeTemplate[] = [
  {
    name: "Contrat d'artiste interprète",
    type: "artist",
    roles: ["performer"],
    usage: "Essai : artiste interprète principal d'un projet.",
    body: `${HEADER}

CONTRAT D'ARTISTE INTERPRÈTE

${PARTIES}

Article 1 — Objet
L'Artiste interprète le projet « {{projet.titre}} » de {{projet.artiste}}, en qualité de : {{personne.roles}}.

Article 2 — Enregistrements
{{projet.titres}}

Article 3 — Rémunération
{{remuneration}}

${SIGNATURES}`,
  },
  {
    name: "Cession de droits d'auteur-compositeur",
    type: "publishing",
    roles: ["author", "composer"],
    usage: "Essai : auteurs et compositeurs crédités sur les titres.",
    body: `${HEADER}

CESSION DE DROITS D'AUTEUR ET DE COMPOSITEUR

${PARTIES}

Article 1 — Œuvres
Les œuvres écrites ou composées par {{personne.nom_civil}} ({{personne.roles}}) pour « {{projet.titre}} » :
{{projet.titres}}

Article 2 — Rémunération
{{remuneration}}

${SIGNATURES}`,
  },
  {
    name: "Prestation de musicien",
    type: "service",
    roles: ["musician", "backing_vocalist", "arranger"],
    usage: "Essai : musiciens, choristes et arrangeurs d'une session.",
    body: `${HEADER}

CONTRAT DE PRESTATION MUSICALE

${PARTIES}

Article 1 — Prestation
{{personne.nom_artiste}} intervient sur « {{projet.titre}} » de {{projet.artiste}} en qualité de : {{personne.roles}}.

Article 2 — Titres concernés
{{projet.titres}}

Article 3 — Rémunération
{{remuneration}}

${SIGNATURES}`,
  },
];

/** One of the fixed templates, by turn, through the same RPC as the form. */
export async function insertTemplate(
  supabase: Supabase,
  organizationId: string,
  index: number,
): Promise<{ name: string } | null> {
  const template = TEMPLATES[index % TEMPLATES.length];
  const name = `${template.name} (test)`;
  const { error } = await supabase.rpc("create_contract_template", {
    p_organization_id: organizationId,
    p_series_id: null,
    p_name: name,
    p_type: template.type,
    p_roles: template.roles,
    p_usage: template.usage,
    p_body: template.body,
  });
  if (error) {
    console.error("testData template:", error.message);
    return null;
  }
  return { name };
}
