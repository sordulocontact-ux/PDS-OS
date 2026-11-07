import { handleStep } from "@/lib/calls/route-helpers";
import { runFileTranscript } from "@/lib/calls/transcript-file";

// A long PDF is read page by page.
export const maxDuration = 60;

/** A transcript dropped instead of a recording (lib/calls/transcript-file.ts). */
export async function POST(
  request: Request,
  { params }: RouteContext<"/api/calls/[callId]/transcript-file">,
) {
  const { callId } = await params;
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File))
    return Response.json(
      { ok: false, error: "invalid_input" },
      { status: 400 },
    );
  return handleStep(callId, (supabase, id) =>
    runFileTranscript(supabase, id, file),
  );
}
