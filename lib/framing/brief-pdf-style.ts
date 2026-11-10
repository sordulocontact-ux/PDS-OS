import "server-only";

import { GOOGLE_SANS_FLEX_FACES } from "@/lib/pdf/fonts/google-sans-flex";

// The Brief de cadrage's PDF styles (retours d'Ibé du 02/11 and 07/11/2026 :
// « un document professionnel partageable, pas une exportation brute »). A
// cover page (the project, the version, the three facts read first, the
// contents), then what to act on (Synthèse), the six dimensions numbered,
// each value with its label beside it and its source under it, and the
// sources and validation history to close. The app's look
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
  .cover { min-height: 250mm; display: flex; flex-direction: column;
    break-after: page; }
  .head { padding: 64px 0 28px; }
  .version { margin-top: 14px; font-size: 13px; line-height: 18px; color: #6b6b6b; }
  .facts { border-top: 1.5px solid #111111; margin-bottom: 22px; }
  .facts div { display: grid; grid-template-columns: 34% 1fr; gap: 16px;
    padding: 12px 0; border-bottom: 1px solid #e4e4e4; }
  .facts dt { color: #6b6b6b; }
  .facts dd { font-size: 16px; line-height: 22px; font-weight: 600; }
  .facts dd.empty { font-weight: 500; color: #9a9a9a; }
  .contents { margin-top: 8px; }
  .contents h2 { font-size: 15px; line-height: 20px; font-weight: 600; margin-bottom: 10px; }
  .contents ol { list-style: decimal-leading-zero; padding-left: 28px;
    color: #111111; }
  .contents li { padding: 5px 0; border-bottom: 1px solid #ececec; }
  .contents li::marker { color: #9a9a9a; font-variant-numeric: tabular-nums; }
  .confidential { margin-top: auto; padding-top: 24px; font-size: 11px;
    line-height: 16px; color: #8a8a8a; }
  .intro { font-size: 13px; line-height: 18px; color: #6b6b6b; margin: -6px 0 14px; }
  .closing { break-before: page; }
  .closing h2 { font-size: 18px; line-height: 24px; font-weight: 600;
    letter-spacing: -0.02em; padding-bottom: 8px; border-bottom: 1.5px solid #111111;
    margin-bottom: 14px; }
  .closing h3 { font-size: 12px; line-height: 16px; color: #6b6b6b; font-weight: 600;
    margin: 14px 0 6px; }
  .closing .list li { position: relative; padding: 4px 0 4px 12px; }
  .closing .list li::before { content: ""; position: absolute; left: 0; top: 12px;
    width: 4px; height: 4px; border-radius: 50%; background: #9a9a9a; }
  .history div { display: grid; grid-template-columns: 34% 1fr; gap: 16px;
    padding: 8px 0; border-bottom: 1px solid #ececec; }
  .history dt { color: #6b6b6b; }
  .history dd { font-weight: 600; }
  .muted { color: #8a8a8a; }
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
  .summary h2 { font-size: 18px; line-height: 24px; font-weight: 600; margin-bottom: 10px;
    letter-spacing: -0.02em; }
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
