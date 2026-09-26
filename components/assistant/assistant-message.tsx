import type { UIMessage } from "ai";
import { LoaderCircleIcon } from "lucide-react";
import Link from "next/link";

import { evidenceOf, plainText } from "@/components/assistant/tool-output";
import { fr } from "@/lib/i18n/fr";

type Part = UIMessage["parts"][number];
const isToolPart = (
  part: Part,
): part is Extract<Part, { toolCallId: string }> =>
  part.type.startsWith("tool-") && "toolCallId" in part;

/** One turn. Assistant turns show the model's text, then the facts and links found by code. */
export function AssistantMessage({ message }: { message: UIMessage }) {
  const t = fr.assistant;
  const text = message.parts
    .map((p) => (p.type === "text" ? p.text : ""))
    .join("");

  if (message.role === "user") {
    return (
      <div className="ml-auto max-w-[85%] rounded-2xl bg-muted px-4 py-2 text-sm whitespace-pre-wrap">
        <span className="sr-only">{t.you} : </span>
        {text}
      </div>
    );
  }

  const tools = message.parts.filter(isToolPart);
  const running = tools.filter(
    (p) => p.state !== "output-available" && p.state !== "output-error",
  );
  const evidence = tools
    .filter((p) => p.state === "output-available")
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
      {running.map((p) => (
        <p
          key={p.toolCallId}
          className="flex items-center gap-2 text-xs text-muted-foreground"
        >
          <LoaderCircleIcon
            className="size-3.5 animate-spin motion-reduce:animate-none"
            aria-hidden
          />
          {t.tools[p.type.replace(/^tool-/, "")] ?? t.thinking}
        </p>
      ))}
      {text && (
        <p className="text-sm leading-relaxed whitespace-pre-wrap">
          {plainText(text)}
        </p>
      )}
      {facts.length > 0 && (
        <details className="rounded-lg border border-border px-3 py-2 text-xs">
          <summary className="cursor-pointer font-medium text-muted-foreground">
            {t.facts} ({facts.length})
          </summary>
          <ul className="mt-2 grid list-disc gap-1 pl-4">
            {facts.map((fact, i) => (
              <li key={i}>{fact}</li>
            ))}
          </ul>
        </details>
      )}
      {sources.length > 0 && (
        <nav aria-label={t.sources} className="flex flex-wrap gap-2">
          {sources.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className="rounded-full border border-border px-3 py-1 text-xs hover:bg-muted"
            >
              {s.label}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}
