import "server-only";

import { productionCallTopics } from "@/lib/production/call-prep";
import { effectiveLogistics } from "@/lib/production/logistics";
import { technicalCallTopics } from "@/lib/production/preprod/call-topics";
import { loadPreprod } from "@/lib/production/preprod/queries";
import { prepFailure } from "@/lib/production/prep-result";
import { loadProductionSheet } from "@/lib/production/sheet";
import { fr } from "@/lib/i18n/fr";

import type { CreateArgs, Client, PrepAdapter } from "./types";

async function sheetOf(
  access: Parameters<PrepAdapter["points"]>[0]["access"],
  projectId: string,
  target: Record<string, string>,
) {
  const deliverableId = target.deliverableId ?? "";
  const data = await loadProductionSheet(projectId, deliverableId, access);
  if (!data?.sheet || data.sheet.id !== target.sheetId) return null;
  return data;
}

async function create(supabase: Client, a: CreateArgs) {
  const { data, error } = await supabase.rpc("create_production_call", {
    p_sheet_id: a.target.sheetId ?? "",
    p_title: a.title,
    p_occurred_at: a.occurredAt,
    p_meeting_url: a.format === "video" ? a.meetingUrl : "",
    p_agenda: a.agenda,
    p_purpose: a.goal,
    p_participants: a.attendees.rows,
    p_format: a.format,
  });
  return { callId: data ?? null, error };
}

const failure = (error: { code?: string; message: string }) => {
  const result = prepFailure(error);
  return result.ok ? null : result.error;
};

/** The production call of a sheet: points from what the preparation lacks. */
export const productionAdapter: PrepAdapter = {
  async points({ access, projectId, target }) {
    const data = await sheetOf(access, projectId, target);
    if (!data) return { error: "not_found" };
    if (!data.canOrganize) return { error: fr.productionPrep.errors.forbidden };
    return {
      points: productionCallTopics(data).map((x) => ({
        key: x.key,
        topic: x.topic,
        minutes: x.minutes,
        questions: x.questions,
      })),
    };
  },
  create,
  failure,
};

/** The technical call: points from what the preproduction leaves open. */
export const technicalAdapter: PrepAdapter = {
  async points({ access, projectId, target }) {
    const data = await sheetOf(access, projectId, target);
    if (!data?.sheet) return { error: "not_found" };
    if (!data.canOrganize) return { error: fr.productionPrep.errors.forbidden };
    const preprod = await loadPreprod(projectId, {
      ...data,
      sheet: data.sheet,
    });
    const logistics = effectiveLogistics(
      data.sheet.logistics,
      data.heritage.fiche,
    );
    return {
      points: technicalCallTopics({ data, preprod, logistics }).map((x) => ({
        key: x.key,
        topic: x.topic,
        minutes: x.minutes,
        questions: x.questions,
      })),
    };
  },
  create,
  failure,
};
