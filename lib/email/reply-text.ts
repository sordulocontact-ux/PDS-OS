// What a reply says, without the history it quotes: an e-mail client
// appends the message answered (« Le 8 nov. 2026, Lina a écrit : »,
// « On … wrote: », Outlook's « De : … Envoyé : … », « > » lines). Cut at
// the first of those, so the journal keeps their words only. Pure.

const QUOTE_HEADERS = [
  /^\s*Le .{1,200}a écrit\s*:\s*$/im,
  /^\s*On .{1,200}wrote\s*:\s*$/im,
  /^\s*-{2,}\s*(Original Message|Message d'origine|Forwarded message|Message transféré)\s*-{2,}\s*$/im,
  /^\s*(De|From)\s*:.*\n\s*(Envoyé|Sent|Date)\s*:/im,
];

export function replyText(text: string): string {
  let end = text.length;
  for (const header of QUOTE_HEADERS) {
    const found = header.exec(text);
    if (found && found.index < end) end = found.index;
  }
  return text
    .slice(0, end)
    .split(/\r?\n/)
    .filter((line) => !line.trimStart().startsWith(">"))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
