import { AnswerTable } from "@/components/assistant/answer-table";
import { plainText } from "@/components/assistant/tool-output";
import { MarkedText } from "@/components/ui/marked-text";
import type { Source } from "@/lib/assistant/sources";

type Block =
  | { kind: "text"; lines: string[] }
  | { kind: "bullets" | "steps"; lines: string[] }
  | { kind: "table"; lines: string[]; rows: string[][] };

const BULLET = /^\s*[-•*]\s+/;
const STEP = /^\s*\d+[.)]\s+/;
const TABLE = /^\s*\|/;
// « |---|:--:| », the line under a table's header.
const RULE = /^\s*\|?\s*:?-{2,}/;

const cellsOf = (line: string) =>
  line
    .trim()
    .replace(/^\||\|$/g, "")
    .split("|")
    .map((cell) => cell.trim());

// Paragraphs, the lists the model writes as « - … » or « 1. … » lines, and
// its tables (« | a | b | »).
function blocksOf(text: string): Block[] {
  const blocks: Block[] = [];
  for (const line of text.split("\n")) {
    if (TABLE.test(line)) {
      const last = blocks.at(-1);
      if (RULE.test(line)) continue;
      if (last?.kind === "table") last.rows.push(cellsOf(line));
      else blocks.push({ kind: "table", lines: [line], rows: [cellsOf(line)] });
      continue;
    }
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
 * PO's answer as read: paragraphs, lists and tables, its « **gras** » in
 * bold (MarkedText). No link from the model (`plainText`): only code-built
 * sources are clickable, `links` opening a table's rows (AnswerTable).
 */
export function AnswerText({
  text,
  links = [],
}: {
  text: string;
  links?: Source[];
}) {
  return (
    <div className="grid gap-3 text-sm leading-relaxed">
      {blocksOf(plainText(text)).map((block, i) => {
        if (block.kind === "table")
          return <AnswerTable key={i} rows={block.rows} links={links} />;
        if (block.kind === "text")
          return (
            <p key={i} className="whitespace-pre-wrap">
              <MarkedText text={block.lines.join("\n")} />
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
              <li key={j}>
                <MarkedText text={line} />
              </li>
            ))}
          </List>
        );
      })}
    </div>
  );
}
