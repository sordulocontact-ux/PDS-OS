import { z } from "zod";

import { fr } from "@/lib/i18n/fr";
import { RELEASE_TYPES } from "@/lib/projects/types";

const e = fr.auth.errors;
const pe = fr.shell.newProject.errors;

const optionalUuid = z
  .string()
  .trim()
  .transform((value) => (value === "" ? null : value))
  .pipe(z.uuid().nullable());

export const createProjectSchema = z
  .object({
    title: z
      .string({ error: e.required })
      .trim()
      .min(1, { error: e.required })
      .max(200, { error: e.tooLong }),
    releaseType: z.enum(RELEASE_TYPES, { error: pe.invalidType }),
    artistMode: z.enum(["existing", "new"]).default("existing"),
    artistId: optionalUuid.optional().default(null),
    artistName: z
      .string()
      .trim()
      .max(200, { error: e.tooLong })
      .optional()
      .default(""),
    ownerPersonId: z.uuid({ error: pe.ownerInvalid }),
  })
  .superRefine((data, ctx) => {
    if (data.artistMode === "existing" && !data.artistId) {
      ctx.addIssue({
        code: "custom",
        path: ["artistId"],
        message: pe.artistRequired,
      });
    }
    if (data.artistMode === "new" && data.artistName === "") {
      ctx.addIssue({
        code: "custom",
        path: ["artistName"],
        message: pe.artistRequired,
      });
    }
  });

export const projectIdSchema = z.uuid();
