import { NETWORK_PICTURE_PX } from "@/lib/network/picture-rules";

/**
 * Browser-side: the chosen image cropped to its centred square and drawn at
 * `NETWORK_PICTURE_PX` at most, as a JPEG on a white ground (a transparent
 * logo stays readable). Small enough to travel with the contact form. Null
 * when the browser cannot read the image.
 */
export async function squarePicture(file: File): Promise<File | null> {
  try {
    const bitmap = await createImageBitmap(file);
    const side = Math.min(bitmap.width, bitmap.height);
    const size = Math.max(1, Math.min(NETWORK_PICTURE_PX, side));
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d");
    if (!context) return null;
    context.fillStyle = "#fff";
    context.fillRect(0, 0, size, size);
    context.drawImage(
      bitmap,
      (bitmap.width - side) / 2,
      (bitmap.height - side) / 2,
      side,
      side,
      0,
      0,
      size,
      size,
    );
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.85),
    );
    return blob
      ? new File([blob], "picture.jpg", { type: "image/jpeg" })
      : null;
  } catch {
    return null;
  }
}
