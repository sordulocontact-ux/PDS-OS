import "server-only";

import { inflateRawSync } from "node:zlib";

import type { SourceExtension } from "@/lib/legal/contracts/source-rules";

// The text of a template's source file: Word (.docx, read here: a zip
// holding word/document.xml), PDF (unpdf) or plain text. Only the words come
// back; layout, automatic numbering, headers and footers are lost, and the
// person reads the result before saving it.

/** One file of a zip archive, or null. Stored or deflated entries only. */
function unzipEntry(zip: Buffer, wanted: string): Buffer | null {
  // End of central directory: its signature, searched from the end.
  let end = -1;
  for (let i = zip.length - 22; i >= Math.max(0, zip.length - 65_557); i--)
    if (zip.readUInt32LE(i) === 0x06054b50) {
      end = i;
      break;
    }
  if (end === -1) return null;
  const count = zip.readUInt16LE(end + 10);
  let at = zip.readUInt32LE(end + 16);
  for (let n = 0; n < count && at + 46 <= zip.length; n++) {
    if (zip.readUInt32LE(at) !== 0x02014b50) return null;
    const method = zip.readUInt16LE(at + 10);
    const size = zip.readUInt32LE(at + 20);
    const nameLength = zip.readUInt16LE(at + 28);
    const extra = zip.readUInt16LE(at + 30);
    const comment = zip.readUInt16LE(at + 32);
    const local = zip.readUInt32LE(at + 42);
    const name = zip.toString("utf8", at + 46, at + 46 + nameLength);
    if (name === wanted) {
      const start =
        local +
        30 +
        zip.readUInt16LE(local + 26) +
        zip.readUInt16LE(local + 28);
      const data = zip.subarray(start, start + size);
      if (method === 0) return data;
      if (method === 8) return inflateRawSync(data);
      return null;
    }
    at += 46 + nameLength + extra + comment;
  }
  return null;
}

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
};
const decode = (text: string) =>
  text.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (all, code: string) => {
    if (code[0] !== "#") return ENTITIES[code] ?? all;
    const n =
      code[1] === "x" ? parseInt(code.slice(2), 16) : Number(code.slice(1));
    return Number.isFinite(n) ? String.fromCodePoint(n) : all;
  });

/** The body of a Word document: one line per paragraph, its tabs and line
 * breaks kept; deleted revisions and field codes left out. */
export function docxText(file: Buffer): string | null {
  const xml = unzipEntry(file, "word/document.xml")?.toString("utf8");
  if (!xml) return null;
  let out = "";
  const token =
    /<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>|<w:tab\/>|<w:(?:br|cr)(?:\s[^>]*)?\/>|<\/w:p>/g;
  for (const match of xml.matchAll(token)) {
    if (match[1] !== undefined) out += decode(match[1]);
    else if (match[0].startsWith("<w:tab")) out += "\t";
    else out += "\n";
  }
  return out;
}

async function pdfText(file: Buffer): Promise<string | null> {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(new Uint8Array(file));
  const { text } = await extractText(pdf, { mergePages: true });
  return text;
}

/** The text of the file, tidied (line endings, trailing spaces, at most
 * one empty line in a row), or null when nothing could be read. */
export async function sourceText(
  file: Buffer,
  ext: SourceExtension,
): Promise<string | null> {
  const raw =
    ext === "docx"
      ? docxText(file)
      : ext === "pdf"
        ? await pdfText(file)
        : file.toString("utf8");
  if (!raw) return null;
  const text = raw
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t ]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return text || null;
}
