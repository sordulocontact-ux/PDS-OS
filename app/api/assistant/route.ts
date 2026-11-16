import {
  APICallError,
  convertToModelMessages,
  RetryError,
  createUIMessageStreamResponse,
  isStepCount,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from "ai";
import { z } from "zod";

import { saveConversation } from "@/lib/assistant/conversations";
import { recordUnanswered } from "@/lib/assistant/gaps";
import { guideMap } from "@/lib/assistant/guide";
import { checkImages, withImageData } from "@/lib/assistant/images";
import { pageContext } from "@/lib/assistant/page-context";
import { isTestDataEnabled } from "@/lib/assistant/test-data/tool";
import { createAssistantTools } from "@/lib/assistant/tools";
import { getAccess } from "@/lib/auth/dal";
import { assistantInstructions } from "@/lib/ai/instructions/assistant";
import { getChatModel } from "@/lib/ai/llm";
import { isAiQuotaExceeded, takeAiRequest } from "@/lib/ai/quota";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 60;

// Bounds on what a client may send. The tab holds the conversation; its id
// (a uuid) is where the turns are saved in the viewer's history.
const bodySchema = z.object({
  id: z.string().optional(),
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

// The provider said « too many requests » or « overloaded », after the SDK's
// own retries: worth asking again in a minute.
function isSaturated(error: unknown): boolean {
  const last = RetryError.isInstance(error) ? error.lastError : error;
  return (
    APICallError.isInstance(last) &&
    [429, 503, 529].includes(last.statusCode ?? 0)
  );
}

export async function POST(request: Request) {
  const access = await getAccess();
  if (access.state !== "approved")
    return Response.json({ error: "unauthorized" }, { status: 401 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return Response.json({ error: "invalid_input" }, { status: 400 });

  // The client cannot inject a system message: only user and assistant turns
  // are kept, and an image only as the sender's own (§ 2 quinquies).
  const images = checkImages(
    (parsed.data.messages as UIMessage[]).filter((m) => m.role !== "system"),
    access.personId ?? "",
  );
  if (!images.ok)
    return Response.json({ error: images.error }, { status: 400 });
  const messages = images.messages;
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
      testData: isTestDataEnabled(),
      appMap: guideMap(),
    }),
  );
  // Made now, while the request's cookies are readable: the images are read
  // with the member's session, and the turns saved with it (§ 2 ter).
  const supabase = await createClient();
  const result = streamText({
    model,
    ...settings,
    messages: await convertToModelMessages(
      await withImageData(supabase, messages),
    ),
    tools: createAssistantTools(access, userTexts, parsed.data.page ?? null),
    // A question across workflows (Master, Juridique, Distribution) takes
    // several reads: 8 steps (audit of PO § 3.3), to be measured.
    stopWhen: isStepCount(8),
  });

  // Saved after every answer, with the member's session: the history (§ 2 ter).
  const conversationId = z.uuid().safeParse(parsed.data.id);
  const organizationId = access.organizationId;

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      originalMessages: messages,
      // The client gets a code, never the provider's message: « busy » (try
      // again in a minute) or « failed » (components/assistant/assistant-thread.tsx).
      onError: (error) => {
        console.error("[assistant] answer failed:", error);
        return isSaturated(error) ? "busy" : "failed";
      },
      onEnd: async ({ messages: turns }) => {
        // Unanswered questions, without their text (§ 4 bis).
        await recordUnanswered(turns, parsed.data.page ?? null);
        if (!conversationId.success || !organizationId) return;
        await saveConversation(supabase, {
          id: conversationId.data,
          organizationId,
          pagePath: parsed.data.page ?? null,
          messages: turns,
        });
      },
    }),
  });
}
