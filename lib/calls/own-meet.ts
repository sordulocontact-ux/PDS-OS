import "server-only";

import { googleMeetConfigured } from "@/lib/integrations/google-calendar";
import { meetingCodeOf } from "@/lib/integrations/google-meet";

/** A Meet PDS OS made itself (Calendar, in po@'s name): the only ones po@
 * organizes, so the only ones whose transcript it may read back
 * (lib/calls/meet-transcript.ts). */
export function hasOwnMeet(call: {
  meetingUrl: string | null;
  googleEventId: string | null;
}): boolean {
  return (
    googleMeetConfigured() &&
    call.googleEventId !== null &&
    call.meetingUrl !== null &&
    meetingCodeOf(call.meetingUrl) !== null
  );
}
