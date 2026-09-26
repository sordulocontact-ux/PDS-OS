import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  isStepCount,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from "ai";
import { z } from "zod";

import { createAssistantTools } from "@/lib/assistant/tools";
import { getAccess } from "@/lib/auth/dal";
import { assistantInstructions } from "@/lib/ai/instructions/assistant";
import { getChatModel } from "@/lib/ai/llm";

export const maxDuration = 60;

// Bounds on what a client may send: the conversation lives in the tab only.
const bodySchema = z.object({
  messages: z
    .array(
      z
        .object({
          id: z.string(),
          role: z.enum(["user", "assistant", "system"]),
          parts: z.array(z.unknown()),
        })
        .passthrough(),
    )
    .min(1)
    .max(40),
});
const MAX_USER_TEXT = 2000;

export async function POST(request: Request) {
  const access = await getAccess();
  if (access.state !== "approved")
    return Response.json({ error: "unauthorized" }, { status: 401 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return Response.json({ error: "invalid_input" }, { status: 400 });

  // The client cannot inject a system message: only user and assistant turns are kept.
  const messages = (parsed.data.messages as UIMessage[]).filter(
    (m) => m.role !== "system",
  );
  const tooLong = messages.some(
    (m) =>
      m.role === "user" &&
      m.parts.some((p) => p.type === "text" && p.text.length > MAX_USER_TEXT),
  );
  if (tooLong) return Response.json({ error: "too_long" }, { status: 413 });

  const { model } = getChatModel();
  const result = streamText({
    model,
    temperature: 0,
    system: assistantInstructions({
      firstName: access.firstName,
      role: access.role,
    }),
    messages: await convertToModelMessages(messages),
    tools: createAssistantTools(access),
    stopWhen: isStepCount(5),
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({ stream: result.stream }),
  });
}
