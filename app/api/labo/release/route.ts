import { isLaboEnabled, laboError } from "@/lib/labo/guard";
import { detectRelease } from "@/lib/release/detect";
import { normalizeIsrc } from "@/lib/release/platforms";

export async function GET(request: Request) {
  if (!isLaboEnabled) return laboError("disabled", 404);

  const isrc = normalizeIsrc(
    new URL(request.url).searchParams.get("isrc") ?? "",
  );
  if (!isrc) return laboError("invalid_isrc", 400);

  return Response.json(await detectRelease(isrc));
}
