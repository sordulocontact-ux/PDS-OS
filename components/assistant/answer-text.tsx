import { plainText } from "@/components/assistant/tool-output";

type Block =
  | { kind: "text"; lines: string[] }
  | { kind: "bullets" | "steps"; lines: string[] };

const BULLET = /^\s*[-•*]\s+/;
const STEP = /^\s*\d+[.)]\s+/;

// Paragraphs, and the lists the model writes as « - … » or « 1. … » lines.
function blocksOf(text: string): Block[] {
  const blocks: Block[] = [];
  for (const line of text.split("\n")) {
    const kind = BULLET.test(line)
      ? "bullets"
      : STEP.test(line)
        ? "steps"
        : line.trim()
          ? "text"
          : null;
    const last = blocks.at(-1);
    if (!kind) {
      // A blank line ends a paragraph; a list goes on across it.
      if (last?.kind === "text") blocks.push({ kind: "text", lines: [] });
      continue;
    }
    const content = line.replace(kind === "bullets" ? BULLET : STEP, "");
    if (last && last.kind === kind) last.lines.push(content);
    else blocks.push({ kind, lines: [content] });
  }
  return blocks.filter((block) => block.lines.length > 0);
}

/**
 * PO's answer as read: paragraphs and lists, nothing else. The text stays
 * plain (no link, no emphasis from the model: `plainText`); only code-built
 * sources are clickable.
 */
export function AnswerText({ text }: { text: string }) {
  return (
    <div className="grid gap-3 text-sm leading-relaxed">
      {blocksOf(plainText(text)).map((block, i) => {
        if (block.kind === "text")
          return (
            <p key={i} className="whitespace-pre-wrap">
              {block.lines.join("\n")}
            </p>
          );
        const List = block.kind === "bullets" ? "ul" : "ol";
        return (
          <List
            key={i}
            className={
              block.kind === "bullets"
                ? "grid list-disc gap-1.5 pl-5"
                : "grid list-decimal gap-1.5 pl-5"
            }
          >
            {block.lines.map((line, j) => (
              <li key={j}>{line}</li>
            ))}
          </List>
        );
      })}
    </div>
  );
}
