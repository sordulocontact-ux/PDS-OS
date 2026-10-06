import "server-only";

import { tool } from "ai";
import { z } from "zod";

import type { DraftChange } from "@/lib/assistant/drafts";
import { change } from "@/lib/assistant/propose/match";
import {
  proposalResult,
  type ProposeContext,
} from "@/lib/assistant/propose/result";
import { namedMembers } from "@/lib/assistant/propose/targets";
import { parseSaidDateTime, parseSaidUrl } from "@/lib/assistant/verbatim";
import { routes } from "@/lib/auth/redirects";
import { fr } from "@/lib/i18n/fr";

/**
 * propose_meeting: an internal meeting (a call without a project), any
 * member. Date, hour and link come from the user's words, read by code;
 * without them the form keeps its own default (the next round hour).
 */
export function proposeMeetingTool({ access, verbatim }: ProposeContext) {
  return tool({
    description:
      "Prépare une réunion interne (un call sans projet, page Calls) : titre, date et heure, lien de visio, participants de l'équipe. N'enregistre RIEN : l'utilisateur relit le formulaire pré-rempli et enregistre lui-même. Pour un call d'un projet, indique la page Calls du projet.",
    inputSchema: z.object({
      title: z.string().min(1).max(200),
      when: z
        .string()
        .max(60)
        .optional()
        .describe(
          "Date avec l'année et heure, recopiées exactement telles que l'utilisateur les a écrites",
        ),
      meetingUrl: z
        .string()
        .max(500)
        .optional()
        .describe("Lien de visio recopié exactement"),
      attendees: z
        .array(z.string().max(100))
        .max(20)
        .optional()
        .describe("Noms des membres de l'équipe invités"),
    }),
    execute: async (input) => {
      const t = fr.assistantRecords;
      const labels = fr.calls.meeting;
      const warnings: string[] = [];
      const whenQuote = verbatim.quote(input.when);
      const occurredAtLocal = whenQuote ? parseSaidDateTime(whenQuote) : null;
      if (input.when && !occurredAtLocal) warnings.push(t.dateTimeNotSaid);
      const urlQuote = verbatim.quote(input.meetingUrl);
      const meetingUrl = urlQuote ? parseSaidUrl(urlQuote) : null;
      if (input.meetingUrl && !meetingUrl)
        warnings.push(fr.assistant.drafts.notSaid(fr.calls.create.fieldLink));
      const attendees = (
        await namedMembers(access, input.attendees ?? [], warnings)
      ).filter((m) => m.personId !== access.personId);

      const changes: DraftChange[] = [];
      change(changes, fr.calls.create.fieldTitle, null, input.title.trim());
      change(
        changes,
        labels.fieldDate,
        null,
        occurredAtLocal ? t.dateTime(occurredAtLocal) : null,
      );
      change(changes, fr.calls.create.fieldLink, null, meetingUrl);
      change(
        changes,
        labels.fieldAttendees,
        null,
        attendees.map((m) => m.name).join(", "),
      );

      return proposalResult({
        draft: {
          kind: "meeting",
          values: {
            title: input.title.trim(),
            occurredAtLocal: occurredAtLocal ?? "",
            meetingUrl: meetingUrl ?? "",
            attendeeIds: [...new Set(attendees.map((m) => m.personId))],
          },
        },
        title: t.titles.createMeeting(input.title.trim()),
        changes,
        warnings,
        source: { label: fr.calls.all.title, href: routes.calls },
      });
    },
  });
}
