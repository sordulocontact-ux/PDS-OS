// The styles of the Brief créatif's PDF (MKT-C2-12). They mirror the app's
// (docs/DESIGN.md: Google Sans Flex, medium minimum, ink and grey): the
// app's tokens do not exist outside it.
export const briefDocumentStyle = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: "Google Sans Flex", system-ui, sans-serif; font-weight: 500;
    color: #000000; letter-spacing: -0.02em; font-size: 14px; line-height: 20px; }
  .label, .muted { font-size: 12px; line-height: 17px; color: #767676; }
  h1 { font-size: 28px; line-height: 34px; font-weight: 600; letter-spacing: -0.04em; margin: 6px 0 4px; }
  .internal { background: #f2f2f2; border-radius: 10px; padding: 10px 14px; margin: 16px 0 24px; font-size: 12px; }
  nav { margin-bottom: 32px; }
  nav ol { padding-left: 28px; } nav li { margin-bottom: 4px; }
  nav a { color: #000000; text-decoration: none; }
  section { margin-bottom: 24px; }
  h2 { font-size: 17px; line-height: 22px; font-weight: 600; margin-bottom: 10px; break-after: avoid; }
  h3 { font-size: 15px; line-height: 20px; font-weight: 600; margin-bottom: 4px; }
  .deliverable { break-inside: avoid; margin-bottom: 14px; }
  dl { display: grid; grid-template-columns: 130px 1fr; gap: 6px 16px; }
  dt { color: #767676; } dd { margin: 0; }
  p { margin-bottom: 4px; white-space: pre-wrap; }
  ul { padding-left: 18px; margin-bottom: 6px; } li { margin-bottom: 2px; }
  ul.items { list-style: none; padding-left: 0; }
  .empty { color: #767676; }
`;
