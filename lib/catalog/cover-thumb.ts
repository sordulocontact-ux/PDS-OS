import { COVER_THUMB_PX } from "@/lib/catalog/cover-rules";

/**
 * Browser-side: a JPEG copy of the cover, at most 320 px a side, drawn on a
 * white ground (a transparent PNG stays readable). Null when the browser
 * cannot read the image: the original is shown instead.
 */
export async function makeCoverThumb(file: File): Promise<Blob | null> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(
      1,
      COVER_THUMB_PX / Math.max(bitmap.width, bitmap.height),
    );
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) return null;
    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    return await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.85),
    );
  } catch {
    return null;
  }
}
