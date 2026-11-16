import type { UIMessage } from "ai";
import { IconChevronRight, IconLoader } from "nucleo-sharp-essential";

import { AnswerActions } from "@/components/assistant/answer-actions";
import { AnswerText } from "@/components/assistant/answer-text";
import { DraftCard } from "@/components/assistant/draft-card";
import { evidenceOf } from "@/components/assistant/tool-output";
import { ImageGallery } from "@/components/ui/image-gallery";
import { proposalOf } from "@/lib/assistant/drafts";
import { assistant } from "@/lib/i18n/fr/assistant";

const fr = { assistant };

type Part = UIMessage["parts"][number];
const isToolPart = (
  part: Part,
): part is Extract<Part, { toolCallId: string }> =>
  part.type.startsWith("tool-") && "toolCallId" in part;

/**
 * Splits an answer's text: what the model said before its last lookup
 * (« Je vais vérifier… ») is the way there, folded with what it read, once
 * an answer follows that lookup. A failed or stopped answer keeps it all.
 */
function answerParts(parts: Part[]): { steps: string[]; answer: string } {
  const lastTool = parts.findLastIndex(isToolPart);
  const textOf = (from: number, to: number) =>
    parts
      .slice(from, to)
      .map((p) => (p.type === "text" ? p.text : ""))
      .join("");
  const after = textOf(lastTool + 1, parts.length);
  if (lastTool === -1 || !after.trim())
    return { steps: [], answer: textOf(0, parts.length) };
  const steps = parts
    .slice(0, lastTool)
    .flatMap((p) => (p.type === "text" && p.text.trim() ? [p.text] : []));
  return { steps, answer: after };
}

/** One turn. Assistant turns show, folded above the answer, what PO read
 * (the facts found by code) and said on the way; then the answer; then, once
 * it is finished, the row to copy it and open its sources. `live`: the turn
 * being answered, the only one whose unfinished lookups still spin (a
 * stopped or failed answer shows none). */
export function AssistantMessage({
  message,
  live = false,
}: {
  message: UIMessage;
  live?: boolean;
}) {
  const t = fr.assistant;

  if (message.role === "user") {
    const text = message.parts
      .map((p) => (p.type === "text" ? p.text : ""))
      .join("");
    // Read back from their address, with the viewer's session (§ 2 quinquies).
    const images = message.parts.flatMap((p) =>
      p.type === "file" && p.mediaType.startsWith("image/") ? [p.url] : [],
    );
    return (
      <div className="ml-auto grid max-w-[85%] justify-items-end gap-2">
        <span className="sr-only">{t.you} : </span>
        {images.length > 0 && (
          <ImageGallery
            images={images.map((url, index) => ({
              key: url,
              src: url,
              alt: t.images.image(index + 1),
              openLabel: t.images.open(index + 1),
              title: t.images.viewerTitle(index + 1, images.length),
            }))}
            labels={t.images.viewer}
          />
        )}
        {text && (
          <div className="rounded-2xl bg-muted px-4 py-2 text-sm whitespace-pre-wrap">
            {text}
          </div>
        )}
      </div>
    );
  }

  const { steps, answer } = answerParts(message.parts);
  const tools = message.parts.filter(isToolPart);
  const running = live
    ? tools.filter(
        (p) => p.state !== "output-available" && p.state !== "output-error",
      )
    : [];
  const done = tools.filter((p) => p.state === "output-available");
  // Drafts show as cards; their facts would only repeat the card.
  const drafts = done.flatMap((p) => {
    const proposal = proposalOf(p.output);
    return proposal ? [{ toolCallId: p.toolCallId, proposal }] : [];
  });
  const evidence = done
    .filter((p) => !proposalOf(p.output))
    .map((p) => evidenceOf(p.output));
  const facts = evidence.flatMap((e) => e.facts);
  const sources = [
    ...new Map(
      evidence.flatMap((e) => e.sources).map((s) => [s.href, s]),
    ).values(),
  ].slice(0, 8);

  return (
    <div className="grid max-w-[95%] gap-3">
      <span className="sr-only">{t.po} : </span>
      {(facts.length > 0 || steps.length > 0) && (
        <details className="group text-caption text-muted-foreground">
          <summary className="flex w-fit cursor-pointer list-none items-center gap-1 rounded-sm hover:text-foreground [&::-webkit-details-marker]:hidden">
            {facts.length > 0 ? t.read(facts.length) : t.steps}
            <IconChevronRight
              aria-hidden
              className="size-3.5 transition-transform duration-[var(--duration-fast)] group-open:rotate-90 motion-reduce:transition-none"
            />
          </summary>
          <div className="mt-2 grid gap-2 border-l border-border pl-3">
            {steps.map((step, i) => (
              <AnswerText key={i} text={step} />
            ))}
            {facts.length > 0 && (
              <ul className="grid list-disc gap-1 pl-4">
                {facts.map((fact, i) => (
                  <li key={i}>{fact}</li>
                ))}
              </ul>
            )}
          </div>
        </details>
      )}
      {running.map((p) => (
        <p
          key={p.toolCallId}
          className="flex items-center gap-2 text-caption text-muted-foreground"
        >
          <IconLoader
            className="size-3.5 animate-spin motion-reduce:animate-none"
            aria-hidden
          />
          {t.tools[p.type.replace(/^tool-/, "")] ?? t.thinking}
        </p>
      ))}
      {answer && <AnswerText text={answer} />}
      {drafts.map((d) => (
        <DraftCard key={d.toolCallId} {...d} />
      ))}
      {!live && <AnswerActions text={answer} sources={sources} />}
    </div>
  );
}
