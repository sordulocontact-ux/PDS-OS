import "server-only";

import { GOOGLE_SANS_FLEX_FACES } from "@/lib/pdf/fonts/google-sans-flex";

// The Brief de cadrage's PDF styles (retour d'Ibé du 02/11/2026 : « niveau
// hiérarchie, il n'est pas fou »). A working document read on paper or on a
// phone: the project and where the Brief stands first, what to act on next
// (Synthèse), then the six dimensions, numbered, each value on its own line
// with its label beside it and its source under it. The app's look
// (docs/DESIGN.md: Google Sans Flex, medium minimum, ink and grey, the state
// tones) in fixed values: the tokens of app/globals.css do not exist here.
export const BRIEF_PDF_STYLE = `
${GOOGLE_SANS_FLEX_FACES}
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: "Google Sans Flex", system-ui, sans-serif; font-weight: 500;
    color: #111111; letter-spacing: -0.01em; font-size: 14px; line-height: 20px; }
  .top { display: flex; justify-content: space-between; align-items: baseline;
    padding-bottom: 10px; border-bottom: 1px solid #e4e4e4;
    font-size: 11px; line-height: 16px; color: #6b6b6b; }
  .top b { color: #111111; font-weight: 600; letter-spacing: 0; }
  .head { padding: 28px 0 20px; }
  .eyebrow { font-size: 12px; line-height: 16px; color: #6b6b6b; }
  h1 { font-size: 34px; line-height: 38px; font-weight: 600; letter-spacing: -0.04em;
    margin: 6px 0 6px; }
  .kind { font-size: 15px; line-height: 21px; color: #4a4a4a; }
  .meta { display: flex; border: 1px solid #e4e4e4; border-radius: 10px;
    background: #f7f7f6; margin-bottom: 28px; }
  .meta div { flex: 1; padding: 10px 14px; border-left: 1px solid #e4e4e4; }
  .meta div:first-child { border-left: 0; }
  .meta dt { font-size: 11px; line-height: 15px; color: #6b6b6b; }
  .meta dd { font-size: 13px; line-height: 19px; font-weight: 600; margin-top: 2px; }
  .pill { display: inline-block; padding: 1px 8px; border-radius: 999px;
    font-size: 12px; line-height: 18px; font-weight: 600; }
  .pill.success { background: #e6f4ea; color: #17633a; }
  .pill.warning { background: #fff2dc; color: #8a4b00; }
  .pill.info { background: #e6effc; color: #1d4f9c; }
  .pill.neutral { background: #ececeb; color: #3d3d3d; }
  .summary { background: #f7f7f6; border-radius: 10px; padding: 16px 18px;
    margin-bottom: 30px; break-inside: avoid; }
  .summary h2 { font-size: 15px; line-height: 20px; font-weight: 600; margin-bottom: 10px; }
  .summary .groups { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 28px; }
  .summary h3 { font-size: 11px; line-height: 15px; color: #6b6b6b; font-weight: 600;
    margin-bottom: 3px; }
  ul { list-style: none; }
  .summary li, dd li { position: relative; padding-left: 12px; }
  .summary li::before, dd li::before { content: ""; position: absolute; left: 0; top: 8px;
    width: 4px; height: 4px; border-radius: 50%; background: #9a9a9a; }
  .dimension { margin-bottom: 24px; }
  .dimension header { display: flex; align-items: baseline; gap: 10px;
    padding-bottom: 8px; border-bottom: 1.5px solid #111111; break-after: avoid; }
  .dimension .number { font-size: 13px; line-height: 20px; color: #9a9a9a;
    font-weight: 600; font-variant-numeric: tabular-nums; }
  .dimension h2 { font-size: 18px; line-height: 24px; font-weight: 600;
    letter-spacing: -0.02em; }
  .row { display: grid; grid-template-columns: 34% 1fr; gap: 16px; padding: 9px 0;
    border-bottom: 1px solid #ececec; break-inside: avoid; }
  .row dt { color: #6b6b6b; }
  .row dd { font-weight: 600; white-space: pre-line; }
  .row dd.empty { font-weight: 500; color: #9a9a9a; }
  .source { display: block; margin-top: 3px; font-size: 11px; line-height: 15px;
    font-weight: 500; color: #8a8a8a; }
  .sources { margin-top: 8px; padding-top: 12px; border-top: 1px solid #e4e4e4;
    font-size: 11px; line-height: 16px; color: #6b6b6b; break-inside: avoid; }
  .sources b { color: #111111; font-weight: 600; }
`;
