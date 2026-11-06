import "server-only";

import { meetingCodeOf } from "@/lib/integrations/google-meet";
import { googleHasScope } from "@/lib/integrations/google-oauth";

const READ_MEET = "https://www.googleapis.com/auth/meetings.space.readonly";

/** A Meet PDS OS made itself (Calendar, in po@'s name), whose transcript the
 * organizer's token may read back (lib/calls/meet-transcript.ts): the only
 * Meets po@ organizes, and a token granted `meetings.space.readonly` (one
 * made before that scope was asked for lacks it: the call then simply asks
 * for its recording, as before). */
export async function hasOwnMeet(call: {
  meetingUrl: string | null;
  googleEventId: string | null;
}): Promise<boolean> {
  if (
    call.googleEventId === null ||
    call.meetingUrl === null ||
    meetingCodeOf(call.meetingUrl) === null
  )
    return false;
  return googleHasScope(READ_MEET);
}
