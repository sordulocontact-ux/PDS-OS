import type { QuestionKey } from "@/lib/framing/dimensions";

/**
 * Fake answers to the Cadrage questions, written by code (never by the
 * model, CLAUDE.md rule 6). Fictional data, not interface text.
 */

export const FAKE_FRAMING_TEXTS: Partial<Record<QuestionKey, string>> = {
  objective:
    "Installer ce titre comme la sortie de référence de l'artiste cette saison et élargir son public au-delà du rap.",
  success_criteria:
    "500 000 écoutes en 8 semaines, 3 playlists éditoriales et un passage radio national.",
  main_priority:
    "Sortir à la date prévue avec le clip disponible dès le premier jour.",
  calendar_constraints:
    "Pas de sortie pendant les vacances scolaires ; l'artiste est en tournée les trois semaines précédentes.",
  prerequisites:
    "Master final validé et pochette livrée quatre semaines avant la sortie.",
  commitments: "Studio de mix réservé, acompte versé au réalisateur du clip.",
  decision_makers:
    "Le chef de projet décide au quotidien, le directeur général valide le Brief et le budget.",
  missing_skills: "Un attaché de presse radio.",
  current_state: "Titre enregistré, mix en cours.",
  existing_elements:
    "Maquette, photos de presse et premières pistes de pochette.",
  decisions_made: "Sortie en single d'abord, clip tourné à Paris.",
  work_started: "Sessions d'enregistrement terminées, mixeur choisi.",
  legal_agreements:
    "Contrat d'artiste signé ; contrat de réalisation du clip à rédiger.",
  legal_needs:
    "Cession de droits du réalisateur du clip et répartition éditoriale à confirmer.",
  legal_secured: "Contrat d'artiste signé.",
};

/** Used for a text question added later without its own fake answer. */
export const FAKE_FRAMING_TEXT = "À préciser lors du prochain échange.";

/** Envelope when the project sheet has none: 15 000 €. */
export const FAKE_BUDGET_CENTS = 1_500_000;

/** Target date when the project sheet has none: in 90 days. */
export function fakeTargetDate(): string {
  const due = new Date();
  due.setUTCDate(due.getUTCDate() + 90);
  return due.toISOString().slice(0, 10);
}

export const FAKE_NEEDS = [
  { preset: "clip", family: "creation_content" },
  { preset: "social_content", family: "creation_content" },
  { preset: "playlisting", family: "promotion_distribution" },
] as const;

export const FAKE_CONSTRAINT = {
  type: "production",
  text: "Tournage du clip limité à deux jours.",
} as const;
