import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  isStepCount,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from "ai";
import { z } from "zod";

import { pageContext } from "@/lib/assistant/page-context";
import { isTestDataEnabled } from "@/lib/assistant/test-data/tool";
import { createAssistantTools } from "@/lib/assistant/tools";
import { getAccess } from "@/lib/auth/dal";
import { assistantInstructions } from "@/lib/ai/instructions/assistant";
import { getChatModel } from "@/lib/ai/llm";
import { isAiQuotaExceeded, takeAiRequest } from "@/lib/ai/quota";

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
  // The page PO was opened from (Espace Espace): a path, resolved by code.
  page: z.string().max(300).optional(),
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

  const userTexts = messages.flatMap((m) =>
    m.role === "user"
      ? m.parts.flatMap((p) => (p.type === "text" ? [p.text] : []))
      : [],
  );

  // One message to PO = one request of the daily quota, whatever the number
  // of steps (tool calls) it takes.
  try {
    await takeAiRequest();
  } catch (error) {
    if (!isAiQuotaExceeded(error)) throw error;
    return Response.json(
      { error: "quota", limit: error.usage.limit },
      { status: 429 },
    );
  }

  const { model, settings } = getChatModel(
    assistantInstructions({
      firstName: access.firstName,
      role: access.role,
      page: await pageContext(parsed.data.page),
      testData: isTestDataEnabled,
    }),
  );
  const result = streamText({
    model,
    ...settings,
    messages: await convertToModelMessages(messages),
    tools: createAssistantTools(access, userTexts, parsed.data.page ?? null),
    stopWhen: isStepCount(5),
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({ stream: result.stream }),
  });
}
