// Browser-side: an image made light enough to be sent to a route. Vercel
// refuses a request body over 4.5 MB before the function runs, and an
// iPhone screenshot (PNG, 1290 × 2796) often weighs 3 to 6 MB. A picture
// that is only read (by PO) loses nothing at 2,000 px: the models shrink it
// below that anyway.

/** Longest side kept, in pixels. */
const MAX_SIDE = 2000;
/** Under it, an image already small enough is sent as it is. */
const LIGHT_BYTES = 1024 * 1024;
const JPEG_QUALITY = 0.85;

export function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality?: number,
) {
  return new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, type, quality),
  );
}

/**
 * The same picture, at most MAX_SIDE px on its longest side, as a JPEG.
 * Left as it is when already light and small; the original is returned
 * whenever the browser cannot redraw it (the server then says what fails).
 */
export async function shrinkImage(file: File): Promise<File> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file;
  }
  try {
    const longest = Math.max(bitmap.width, bitmap.height);
    if (longest <= MAX_SIDE && file.size <= LIGHT_BYTES) return file;

    const scale = Math.min(1, MAX_SIDE / longest);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const context = canvas.getContext("2d");
    if (!context) return file;
    // JPEG has no transparency: a transparent PNG would turn black.
    context.fillStyle = "white";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    const blob = await canvasToBlob(canvas, "image/jpeg", JPEG_QUALITY);
    if (!blob || blob.size >= file.size) return file;
    const name = file.name.replace(/\.[^.]+$/, "") || "capture";
    return new File([blob], `${name}.jpg`, {
      type: "image/jpeg",
      lastModified: file.lastModified,
    });
  } finally {
    bitmap.close();
  }
}
