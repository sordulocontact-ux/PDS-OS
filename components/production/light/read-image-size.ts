"use client";

/** The image's size in pixels, read from the file by the browser (the
 * proto's « Le code lit sa taille et son format »); null when it cannot. */
export async function readImageSize(
  file: File,
): Promise<{ width: number; height: number } | null> {
  try {
    const bitmap = await createImageBitmap(file);
    const size = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return size;
  } catch {
    return null;
  }
}
