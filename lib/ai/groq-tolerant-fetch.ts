import "server-only";

/**
 * The AI SDK validates every Groq verbose_json segment strictly (ten numeric
 * fields). On real recordings (silence, noise) Groq can return null for a
 * segment's metadata, and the whole transcription then fails with a misleading
 * "Invalid JSON response". We only use start / end / text: missing metadata is
 * filled with neutral values before the SDK validates the response.
 */

const NUMERIC_METADATA = [
  "id",
  "seek",
  "temperature",
  "avg_logprob",
  "compression_ratio",
  "no_speech_prob",
] as const;

type Json = Record<string, unknown>;

/** Pure: returns the normalized payload and how many fields were filled. */
export function normalizeGroqTranscription(payload: Json): {
  payload: Json;
  filled: number;
} {
  let filled = 0;
  const fill = <T>(value: unknown, fallback: T): T | unknown => {
    if (value === null || value === undefined) {
      filled++;
      return fallback;
    }
    return value;
  };

  const segments = Array.isArray(payload.segments)
    ? (payload.segments as Json[])
    : null;
  let previousEnd = 0;
  const normalized = segments?.map((segment, index) => {
    const start = fill(segment.start, previousEnd) as number;
    const end = fill(segment.end, start) as number;
    previousEnd = end;
    const out: Json = {
      ...segment,
      start,
      end,
      text: fill(segment.text, ""),
      tokens: fill(segment.tokens, []),
    };
    for (const key of NUMERIC_METADATA)
      out[key] = fill(segment[key], key === "id" ? index : 0);
    return out;
  });

  return {
    payload: {
      ...payload,
      x_groq: fill(payload.x_groq, { id: "" }),
      ...(normalized ? { segments: normalized } : {}),
    },
    filled,
  };
}

export const groqTolerantFetch: typeof fetch = async (input, init) => {
  const response = await fetch(input, init);
  const url =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.href
        : input.url;
  if (!response.ok || !url.includes("/audio/transcriptions")) return response;

  const text = await response.text();
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return new Response(text, {
      status: response.status,
      headers: response.headers,
    });
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return new Response(text, {
      status: response.status,
      headers: response.headers,
    });
  }

  const { payload, filled } = normalizeGroqTranscription(body as Json);
  if (filled > 0)
    console.warn(`[transcribe] filled ${filled} missing Groq segment fields`);
  const headers = new Headers(response.headers);
  headers.delete("content-length");
  headers.delete("content-encoding");
  return new Response(JSON.stringify(payload), {
    status: response.status,
    headers,
  });
};
