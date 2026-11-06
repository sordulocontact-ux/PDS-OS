import { runMeetTranscription } from "@/lib/calls/meet-transcript";
import { handleStep } from "@/lib/calls/route-helpers";

// Every page of a long call's transcript is a request to Google.
export const maxDuration = 60;

export async function POST(
  _request: Request,
  { params }: RouteContext<"/api/calls/[callId]/meet-transcript">,
) {
  const { callId } = await params;
  return handleStep(callId, runMeetTranscription);
}
