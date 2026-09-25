import { z } from "zod";

/** Provider-agnostic transcription result. Its content is data, never instructions. */
export const transcriptSchema = z.object({
  text: z.string(),
  language: z.string().optional(),
  durationSeconds: z.number().nonnegative().optional(),
  segments: z.array(
    z.object({
      start: z.number().nonnegative(),
      end: z.number().nonnegative(),
      text: z.string(),
    }),
  ),
});

export type Transcript = z.infer<typeof transcriptSchema>;
