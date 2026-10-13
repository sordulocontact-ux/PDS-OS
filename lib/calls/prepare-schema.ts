// What the « Préparer un échange » forms send about the agenda, checked the
// same way by every action that creates the call.

import { z } from "zod";

import { TOPIC_MINUTES_MAX, TOPIC_MINUTES_MIN } from "@/lib/calls/prepare";

const minutes = z.number().int().min(TOPIC_MINUTES_MIN).max(TOPIC_MINUTES_MAX);

export const extraTopicsSchema = z
  .array(z.object({ topic: z.string().trim().min(1).max(200), minutes }))
  .max(10);

export const topicMinutesSchema = z.record(z.string().min(1).max(64), minutes);
