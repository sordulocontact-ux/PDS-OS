// « Brief et proposition » of a collaboration (proto collabCard `cbrief`):
// what the form opens with, written by code from what PDS knows — the
// validated concept, the creator's platform, the project, a rate noted in
// the Réseau — never invented (no fee without a noted rate). Client-safe.

import { fr } from "@/lib/i18n/fr";
import { lowerFirst } from "@/lib/ui/journey";

const t = fr.activationBrief.brief;

export type BriefDefaults = {
  // In euros HT, as a string for the field; "" when nothing is known.
  fee: string;
  // Where the fee comes from (« Tarif relevé dans le Réseau le 02/10 »).
  feeSource: string | null;
  deliverables: string;
  organic: string;
  body: string;
  // « TikTok », « Instagram »: the private message's platform.
  platform: string;
};

export function briefDefaults(input: {
  creator: string;
  platform: string;
  artist: string;
  title: string;
  // « Sam. 05/12 », when the release date is known.
  releaseDay: string | null;
  concept: { angle?: string; format?: string; message?: string };
  rate: { amount: number; day: string } | null;
}): BriefDefaults {
  const first = input.creator.trim().split(/\s+/)[0] ?? input.creator;
  const { angle, format, message } = input.concept;
  const body = [
    t.greeting(first),
    "",
    [
      t.release(input.artist, input.title, input.releaseDay),
      angle ? t.idea(lowerFirst(angle.replace(/[.\s]+$/, ""))) : null,
      format ? t.format(format.replace(/[.\s]+$/, "")) : null,
      message ? t.key(message.replace(/[.\s]+$/, "")) : null,
      t.closing,
    ]
      .filter(Boolean)
      .join(" "),
  ].join("\n");
  return {
    fee: input.rate ? String(Math.round(input.rate.amount)) : "",
    feeSource: input.rate ? t.feeSource(input.rate.day) : null,
    deliverables: format ?? "",
    organic: t.organicDefault(input.platform, input.artist),
    body,
    platform: input.platform,
  };
}
