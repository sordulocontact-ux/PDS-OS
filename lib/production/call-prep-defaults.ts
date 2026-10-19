import "server-only";

import { callPrepDefaults } from "@/lib/calls/prep/defaults";
import type { CallPrepDefaults } from "@/lib/calls/prep/types";
import { fr } from "@/lib/i18n/fr";
import {
  productionCallPeople,
  productionCallPurpose,
  productionCallTopics,
} from "@/lib/production/call-prep";
import {
  technicalCallDocuments,
  technicalCallPeople,
  technicalCallPurpose,
  technicalCallTopics,
  type TechnicalCallInput,
} from "@/lib/production/preprod/call-topics";
import type { ProductionSheetData } from "@/lib/production/sheet";

/**
 * The common call form of a production sheet: PO's points from what the
 * preparation lacks, the owner, the person in charge, the director and the
 * people assigned. Null without a sheet: nothing to organize yet.
 */
export async function productionCallDefaults(
  projectId: string,
  data: Pick<
    ProductionSheetData,
    "deliverable" | "sheet" | "needs" | "ownerName"
  >,
): Promise<CallPrepDefaults | null> {
  if (!data.sheet) return null;
  const t = fr.callPrep.kinds;
  const topics = productionCallTopics(data);
  return callPrepDefaults({
    kind: "production",
    projectId,
    noun: "call",
    title: t.production.title(data.deliverable.title),
    target: { sheetId: data.sheet.id, deliverableId: data.deliverable.id },
    points: topics,
    proposal: { names: productionCallPeople(data) },
    goal: productionCallPurpose(data.deliverable.title, topics),
    facts: [
      {
        label: fr.callPrep.documents,
        value: t.production.documents(data.deliverable.title),
      },
    ],
  });
}

/**
 * The technical call: the topics with something open (the others can be
 * added back as the person's own), the participants by function and the
 * documents to have at hand.
 */
export async function technicalCallDefaults(
  projectId: string,
  input: TechnicalCallInput & { data: { sheet: { id: string } } },
): Promise<CallPrepDefaults> {
  const t = fr.callPrep.kinds;
  const documents = technicalCallDocuments(input);
  return callPrepDefaults({
    kind: "technical",
    projectId,
    noun: "call",
    title: t.technical.title(input.data.deliverable.title),
    target: {
      sheetId: input.data.sheet.id,
      deliverableId: input.data.deliverable.id,
    },
    points: technicalCallTopics(input).filter((x) => x.questions.length > 0),
    proposal: { names: technicalCallPeople(input) },
    goal: technicalCallPurpose(input.data.deliverable.title),
    facts: documents.length
      ? [{ label: fr.callPrep.documents, value: documents.join(" · ") }]
      : [],
  });
}
