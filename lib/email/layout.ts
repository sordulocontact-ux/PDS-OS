/**
 * The frame of every e-mail PDS OS or Supabase Auth sends: logo, white card,
 * footer. One place for the look of all of them (docs/DESIGN.md, « E-mails »):
 * the app's e-mails (lib/email/compose.ts) and the Auth templates
 * (supabase/templates, generated from here by `pnpm email:templates`).
 *
 * E-mail clients read neither CSS variables nor external stylesheets: the
 * values are the `--po-*` tokens of app/globals.css written out, inline,
 * in tables (Outlook). No import: the generator reads this file with Node.
 */

// The app's palette (app/globals.css), light then dark (Apple Mail, iOS).
const C = {
  page: "#f4f4f4", // --po-grey-50
  card: "#ffffff",
  border: "#e2e2e2", // --po-grey-150
  text: "#000000", // --po-ink-900
  body: "#1c1c1c", // --po-ink-700
  muted: "#5e5e5e", // --po-grey-600
  darkPage: "#000000",
  darkCard: "#111111", // --po-ink-800
  darkBorder: "#282828", // --po-ink-600
  darkText: "#ededed",
  darkMuted: "#afafaf", // --po-grey-300
} as const;

// The app's typeface, from Google Fonts: Apple Mail, iOS, Outlook for Mac
// and Thunderbird load it; Gmail and Outlook for Windows ignore web fonts and
// fall back to the system one.
const FONT_URL =
  "https://fonts.googleapis.com/css2?family=Google+Sans+Flex:wght@500;600&display=swap";
const FONT =
  "'Google Sans Flex', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

// Always the production address: an e-mail sent from a local or preview
// build still lands in a real mailbox, which cannot reach localhost.
export const EMAIL_LOGO_URL = "https://pds-os.vercel.app/icon-192.png";

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const URL_PATTERN = /(https?:\/\/[^\s<>"]+[^\s<>".,;:!?)])/g;

/** Plain text written by a member: paragraphs, line breaks, links. */
export function textToHtml(text: string): string {
  return text
    .trim()
    .split(/\n\s*\n/)
    .map((block) =>
      paragraph(
        escapeHtml(block)
          .replace(
            URL_PATTERN,
            (url) =>
              `<a href="${url}" style="color: inherit; text-decoration: underline">${url}</a>`,
          )
          .replace(/\n/g, "<br />"),
      ),
    )
    .join("\n");
}

// The blocks an e-mail is made of. `html` is trusted markup: escape any
// value that comes from a person before passing it.

export function heading(html: string): string {
  return `<h1 class="e-text" style="margin: 0 0 16px; font-family: ${FONT}; font-size: 24px; line-height: 32px; font-weight: 600; letter-spacing: -0.01em; color: ${C.text}">${html}</h1>`;
}

export function paragraph(html: string): string {
  return `<p class="e-text" style="margin: 0 0 16px; font-family: ${FONT}; font-size: 16px; line-height: 24px; font-weight: 500; color: ${C.body}">${html}</p>`;
}

export function note(html: string): string {
  return `<p class="e-muted" style="margin: 0 0 8px; font-family: ${FONT}; font-size: 14px; line-height: 20px; font-weight: 500; color: ${C.muted}">${html}</p>`;
}

/** The one action of the e-mail, as a pill like the app's primary button.
 * `href` is written as given (it may hold Supabase template tags). */
export function button(label: string, href: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 8px 0 24px">
  <tr>
    <td class="e-btn" bgcolor="${C.text}" style="border-radius: 999px; background: ${C.text}">
      <a href="${href}" target="_blank" style="display: inline-block; padding: 14px 28px; font-family: ${FONT}; font-size: 16px; line-height: 20px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 999px">${label}</a>
    </td>
  </tr>
</table>`;
}

/** The link written out, for a client that blocks the button. */
export function fallbackLink(lead: string, href: string): string {
  return note(
    `${lead}<br /><a href="${href}" target="_blank" style="color: inherit; text-decoration: underline; word-break: break-all">${href}</a>`,
  );
}

export function rule(): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 24px 0">
  <tr><td class="e-rule" style="border-top: 1px solid ${C.border}; font-size: 0; line-height: 0">&nbsp;</td></tr>
</table>`;
}

export type EmailDocument = {
  // The <title>, and what the logo's alt says.
  title: string;
  brand: string;
  // The line inbox lists show after the subject.
  preheader?: string;
  blocks: string[];
  footer: string;
};

// Pads the preheader so the inbox preview does not run into the body.
const PREVIEW_PAD = "&#8199;&#65279;&#847; ".repeat(40);

export function emailDocument(doc: EmailDocument): string {
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="color-scheme" content="light dark" />
<meta name="supported-color-schemes" content="light dark" />
<title>${escapeHtml(doc.title)}</title>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link rel="stylesheet" href="${escapeHtml(FONT_URL)}" />
<style>
  body { margin: 0; padding: 0; -webkit-text-size-adjust: 100%; }
  @media (prefers-color-scheme: dark) {
    .e-page { background: ${C.darkPage} !important; }
    .e-card { background: ${C.darkCard} !important; border-color: ${C.darkBorder} !important; }
    .e-text { color: ${C.darkText} !important; }
    .e-muted { color: ${C.darkMuted} !important; }
    .e-rule { border-color: ${C.darkBorder} !important; }
    .e-btn { background: #ffffff !important; }
    .e-btn a { color: ${C.text} !important; }
  }
  @media (max-width: 560px) {
    .e-pad { padding: 32px 24px !important; }
  }
</style>
</head>
<body class="e-page" style="margin: 0; padding: 0; background: ${C.page}">
${doc.preheader ? `<div style="display: none; max-height: 0; overflow: hidden; opacity: 0; mso-hide: all">${escapeHtml(doc.preheader)}${PREVIEW_PAD}</div>` : ""}
<table role="presentation" class="e-page" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.page}" style="background: ${C.page}">
  <tr>
    <td align="center" style="padding: 40px 16px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 520px">
        <tr>
          <td class="e-card e-pad" bgcolor="${C.card}" style="background: ${C.card}; border: 1px solid ${C.border}; border-radius: 16px; padding: 40px">
            <img src="${EMAIL_LOGO_URL}" width="40" height="40" alt="${escapeHtml(doc.brand)}" style="display: block; width: 40px; height: 40px; border: 0; border-radius: 10px; margin: 0 0 32px" />
${doc.blocks.join("\n")}
          </td>
        </tr>
        <tr>
          <td class="e-muted" align="center" style="padding: 24px 16px 0; font-family: ${FONT}; font-size: 14px; line-height: 20px; font-weight: 500; color: ${C.muted}">${escapeHtml(doc.footer)}</td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>
`;
}
