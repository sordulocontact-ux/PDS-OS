import { runTranscription } from "@/lib/calls/pipeline";
import { handleStep } from "@/lib/calls/route-helpers";

// A long call can take minutes to transcribe.
export const maxDuration = 300;

export async function POST(
  _request: Request,
  { params }: RouteContext<"/api/calls/[callId]/transcribe">,
) {
  const { callId } = await params;
  return handleStep(callId, runTranscription);
}
