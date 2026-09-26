import { runExtraction } from "@/lib/calls/pipeline";
import { handleStep } from "@/lib/calls/route-helpers";

// Structured extraction of a long transcript can take a while.
export const maxDuration = 300;

export async function POST(
  _request: Request,
  { params }: RouteContext<"/api/calls/[callId]/extract">,
) {
  const { callId } = await params;
  return handleStep(callId, runExtraction);
}
