import "server-only";

import { MASTER_BRIEF_INSTRUCTIONS } from "@/lib/ai/instructions/master-brief";
import {
  masterBriefSchema,
  textOf,
  type MasterBriefExtraction,
} from "@/lib/ai/schemas/master-brief";
import { formatEuros } from "@/lib/budget/types";
import { fr } from "@/lib/i18n/fr";
import {
  BRIEF_COLUMNS,
  briefFromRow,
  emptyBrief,
} from "@/lib/master-workflow/brief-row";
import {
  BRIEF_ROLES,
  BRIEF_TEXT_FIELDS,
  briefChangeSchema,
  rateCents,
  type BriefChange,
  type BriefProposal,
} from "@/lib/master-workflow/brief-proposals";
import type { MasterBrief } from "@/lib/master-workflow/brief-types";
import { createClient } from "@/lib/supabase/server";
import { normalizeSearch } from "@/lib/utils/search";
import type { Locate, VoiceAdapter } from "@/lib/voice/engine";

/**
 * Adapter of the Brief Mix/Master, for a dictation and for an exchange's
 * transcript: the texts of the artistic direction, the engineers (matched by
 * code to the Réseau's engineers), "same engineer", the rates (the words
 * said, read by code) and the deliverables. Never the calendar, the
 * revisions, the validator nor the sources: a person decides them.
 */

type Engineer = { id: string; name: string };
export type BriefState = { brief: MasterBrief; engineers: Engineer[] };

// The Réseau is the team's directory: far below this for 3 to 5 people.
const NETWORK_LIMIT = 2000;

async function loadState(projectId: string): Promise<BriefState | null> {
  const supabase = await createClient();
  const [project, row, contacts] = await Promise.all([
    supabase.from("projects").select("id").eq("id", projectId).maybeSingle(),
    supabase
      .from("master_briefs")
      .select(BRIEF_COLUMNS)
      .eq("project_id", projectId)
      .maybeSingle(),
    supabase
      .from("network_contacts")
      .select("id, name")
      .contains("roles", ["engineer"])
      .is("archived_at", null)
      .limit(NETWORK_LIMIT),
  ]);
  if (!project.data) return null;
  return {
    brief: row.data ? briefFromRow(row.data) : emptyBrief(null),
    engineers: contacts.data ?? [],
  };
}

const t = fr.masterWorkflow.brief;

function describe({ brief, engineers }: BriefState): string {
  const nameOf = (id: string | null) =>
    engineers.find((engineer) => engineer.id === id)?.name ?? "(personne)";
  const euros = (cents: number | null) =>
    cents === null ? "(vide)" : formatEuros(cents);
  return [
    `Références : ${brief.references ?? "(vide)"}`,
    `Direction : ${brief.direction ?? "(vide)"}`,
    `Contraintes : ${brief.constraints ?? "(vide)"}`,
    `Ingénieur du mix : ${nameOf(brief.mixContactId)}`,
    `Même ingénieur pour le mastering : ${brief.masteringSameEngineer ? "oui" : "non"}`,
    `Ingénieur du mastering : ${nameOf(brief.masteringContactId)}`,
    `Tarif du mix : ${euros(brief.mixRateCents)}`,
    `Tarif du mastering : ${euros(brief.masteringRateCents)}`,
    `Livrables : ${brief.deliverables.join(", ") || "(aucun)"}`,
  ].join("\n");
}

const same = (a: string, b: string | null) =>
  normalizeSearch(a) === normalizeSearch(b ?? "");
// The texts are plain: emphasis the model may add (*titre*, **mot**) goes.
const plain = (text: string) =>
  text.replace(/(\*{1,2}|_{1,2})(\S[^*_]*?)\1/g, "$2").trim();

/** Code, not the model, decides what is new and what an engineer is. */
function toProposals(
  heard: MasterBriefExtraction,
  { brief, engineers }: BriefState,
  locate: Locate,
): BriefProposal[] {
  const changes: Array<{ change: BriefChange; before: string | null }> = [];
  const nameOf = (id: string | null) =>
    engineers.find((engineer) => engineer.id === id)?.name ?? null;

  for (const field of BRIEF_TEXT_FIELDS) {
    const said = textOf(heard[field]);
    if (!said || same(said.value, brief[field])) continue;
    changes.push({
      change: {
        kind: "text",
        field,
        value: plain(said.value),
        quote: said.quote,
      },
      before: brief[field],
    });
  }

  // "The same person masters" says it all: no mastering engineer besides.
  const sameSaid = heard.sameEngineer?.value === true;
  for (const role of BRIEF_ROLES) {
    if (role === "mastering" && sameSaid) continue;
    const said = heard[role === "mix" ? "mixEngineer" : "masteringEngineer"];
    const current =
      role === "mix" ? brief.mixContactId : brief.masteringContactId;
    // Only an engineer of the Réseau: a name the Réseau does not know is
    // added there first ("Ajouter un ingénieur"), never guessed.
    const match =
      said && engineers.find((engineer) => same(engineer.name, said.name));
    if (!said || !match || match.id === current) continue;
    changes.push({
      change: {
        kind: "engineer",
        role,
        contactId: match.id,
        name: match.name,
        quote: said.quote,
      },
      before: nameOf(current),
    });
  }

  if (
    heard.sameEngineer &&
    heard.sameEngineer.value !== brief.masteringSameEngineer
  )
    changes.push({
      change: { kind: "same_engineer", ...heard.sameEngineer },
      before: brief.masteringSameEngineer ? t.review.yes : t.review.no,
    });

  for (const role of BRIEF_ROLES) {
    const said = heard[role === "mix" ? "mixRate" : "masteringRate"];
    const current =
      role === "mix" ? brief.mixRateCents : brief.masteringRateCents;
    const cents = said ? rateCents(said) : null;
    if (!said || cents === null || cents === current) continue;
    changes.push({
      change: { kind: "rate", role, amount: said.amount, quote: said.quote },
      before: current === null ? null : formatEuros(current),
    });
  }

  const present = new Set(brief.deliverables);
  for (const deliverable of heard.deliverables) {
    if (present.has(deliverable.key)) continue;
    present.add(deliverable.key);
    changes.push({
      change: { kind: "deliverable", ...deliverable },
      before: null,
    });
  }

  return changes.flatMap(({ change, before }) => {
    const parsed = briefChangeSchema.safeParse(change);
    if (!parsed.success) return [];
    // A rate is found only if its amount, not just its context, was said.
    const located =
      locate(parsed.data.quote) &&
      (parsed.data.kind !== "rate" || locate(parsed.data.amount));
    return [{ ...parsed.data, id: crypto.randomUUID(), before, located }];
  });
}

export const masterBriefVoice: VoiceAdapter<
  BriefState,
  MasterBriefExtraction,
  BriefProposal
> = {
  loadState,
  describe,
  schema: masterBriefSchema,
  instructions: MASTER_BRIEF_INSTRUCTIONS,
  toProposals,
};
