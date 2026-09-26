import { z } from "zod";

import { normalizeIsrc } from "@/lib/release/platforms";

/** Release form: parsed and normalized in code before any write. */

const optionalText = z
  .string()
  .trim()
  .transform((value) => (value === "" ? null : value));

export const releaseFormSchema = z.object({
  title: z.string().trim().min(1, "title").max(200, "title"),
  isrc: optionalText.pipe(
    z
      .string()
      .nullable()
      .transform((value, ctx) => {
        if (value === null) return null;
        const isrc = normalizeIsrc(value);
        if (!isrc) {
          ctx.addIssue({ code: "custom", message: "isrc" });
          return z.NEVER;
        }
        return isrc;
      }),
  ),
  upc: optionalText.pipe(
    z
      .string()
      .regex(/^\d{12,13}$/, "upc")
      .nullable(),
  ),
  plannedReleaseDate: optionalText.pipe(
    z.iso.date("plannedReleaseDate").nullable(),
  ),
  spotifyUrl: optionalText.pipe(
    z
      .string()
      .max(2048, "spotifyUrl")
      .regex(/^https:\/\/open\.spotify\.com\/\S+$/, "spotifyUrl")
      .nullable(),
  ),
});

export type ReleaseFormValues = z.infer<typeof releaseFormSchema>;
export type ReleaseField = keyof ReleaseFormValues;

export function parseReleaseForm(formData: FormData) {
  const read = (name: string) => {
    const value = formData.get(name);
    return typeof value === "string" ? value : "";
  };
  return releaseFormSchema.safeParse({
    title: read("title"),
    isrc: read("isrc"),
    upc: read("upc").replace(/\s/g, ""),
    plannedReleaseDate: read("plannedReleaseDate"),
    spotifyUrl: read("spotifyUrl"),
  });
}
