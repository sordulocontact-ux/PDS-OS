// The interview brief, prepared by code from the validated framing (ticket
// RP § 5.5 : « propose les messages clés, sujets sensibles, éléments
// factuels et questions probables, sans inventer les réponses de l'artiste
// ni prétendre connaître celles du journaliste »). Client-safe.

import type { OpportunityRecord } from "@/lib/activations/press/queries";
import type { SheetFields } from "@/lib/activations/sheets";
import { fr } from "@/lib/i18n/fr";
import { formatDateTime } from "@/lib/release/format";

const t = fr.activationPress.briefTemplate;

export function composeInterviewBrief(
  framing: SheetFields | null,
  media: string,
  journalist: string | null,
  o: OpportunityRecord,
): string {
  const value = (key: keyof SheetFields) => framing?.[key]?.value ?? t.missing;
  const practical = [
    o.scheduledAt ? formatDateTime(o.scheduledAt) : null,
    o.location,
    journalist,
    o.participants,
    o.format,
  ].filter(Boolean);
  return [
    t.title(media, o.subject),
    "",
    `${t.context}\n${value("objectives")}`,
    "",
    `${t.messages}\n${value("main_message")}`,
    "",
    `${t.angles}\n${value("angles")}`,
    "",
    `${t.facts}\n${value("proof_points")}`,
    "",
    `${t.sensitive}\n${value("restrictions")}${o.constraints ? `\n${o.constraints}` : ""}`,
    "",
    `${t.questions}\n- \n- `,
    t.noAnswer,
    "",
    `${t.practical}\n${practical.join(" · ") || t.missing}`,
  ].join("\n");
}
