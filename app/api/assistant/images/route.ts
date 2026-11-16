import {
  ASSISTANT_IMAGE_BUCKET,
  ASSISTANT_IMAGE_EXTENSIONS,
  assistantImagePathOf,
  assistantImageProblem,
  assistantImageUrl,
} from "@/lib/assistant/image-rules";
import { getAccess } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

/**
 * An image joined to a question to PO (docs/ASSISTANT.md § 2 quinquies),
 * uploaded with the member's session under "<person_id>/<uuid>.<ext>"
 * (bucket policies: one's own folder only). Answers the address the
 * message keeps. DELETE removes one taken back before sending.
 */
export async function POST(request: Request) {
  const access = await getAccess();
  if (access.state !== "approved" || !access.personId)
    return Response.json({ error: "unauthorized" }, { status: 401 });

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File))
    return Response.json({ error: "invalid_input" }, { status: 400 });
  const problem = assistantImageProblem(file);
  if (problem)
    return Response.json(
      { error: problem },
      { status: problem === "size" ? 413 : 415 },
    );

  const path = `${access.personId}/${crypto.randomUUID()}.${ASSISTANT_IMAGE_EXTENSIONS[file.type]}`;
  const supabase = await createClient();
  const { error } = await supabase.storage
    .from(ASSISTANT_IMAGE_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) {
    console.error("[assistant] image upload failed:", error.message);
    return Response.json({ error: "failed" }, { status: 502 });
  }
  return Response.json({
    url: assistantImageUrl(path),
    mediaType: file.type,
  });
}

export async function DELETE(request: Request) {
  const access = await getAccess();
  if (access.state !== "approved" || !access.personId)
    return Response.json({ error: "unauthorized" }, { status: 401 });

  const url = new URL(request.url).searchParams.get("url") ?? "";
  const path = assistantImagePathOf(url);
  if (!path?.startsWith(`${access.personId}/`))
    return Response.json({ error: "invalid_input" }, { status: 400 });

  const supabase = await createClient();
  await supabase.storage.from(ASSISTANT_IMAGE_BUCKET).remove([path]);
  return new Response(null, { status: 204 });
}
