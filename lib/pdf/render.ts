import "server-only";

import type { Browser } from "playwright-core";

/**
 * Single entry point for PDF exports (CLAUDE.md, stack: Playwright). The HTML
 * is complete and self-contained: the browser never visits the app, so no
 * session or cookie is ever handed to it.
 *
 * On Vercel, a Chromium built for serverless functions (@sparticuz/chromium);
 * elsewhere (local dev), the Chrome installed on the machine.
 * Playwright is loaded here, when a PDF is printed, never when a module that
 * may print one is imported: a missing file of the package made « Envoyer
 * en validation » fail before anything was sent (01/11/2026).
 */
async function launch(): Promise<Browser> {
  const { chromium: playwright } = await import("playwright-core");
  if (process.env.VERCEL) {
    const { default: chromium } = await import("@sparticuz/chromium");
    return playwright.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    });
  }
  return playwright.launch({ channel: "chrome", headless: true });
}

// « 3 / 12 » at the foot of each page; Chromium fills the two spans.
const PAGE_NUMBERS =
  '<div style="width:100%;font-size:9px;text-align:center;color:#767676;font-family:system-ui,sans-serif"><span class="pageNumber"></span> / <span class="totalPages"></span></div>';

// A contract's foot, as in Ibé's model: centered, small, the page number
// then the contract's title. Escaped: the title comes from people.
const contractFooter = (title: string) =>
  `<div style="width:100%;font-size:7.5pt;line-height:1.3;text-align:center;color:#000;font-family:Arial,'Liberation Sans',Helvetica,sans-serif"><span class="pageNumber"></span><br>${title
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")}</div>`;

// `cssPage`: the page size and margins the HTML sets itself (@page), as the
// 16:9 Plan de sortie of a title (lot 14); A4 with margins otherwise.
export async function htmlToPdf(
  html: string,
  options: {
    pageNumbers?: boolean;
    cssPage?: boolean;
    // A contract's foot (Ibé's model): its page number, then its title.
    footer?: string;
  } = {},
): Promise<Uint8Array> {
  const browser = await launch();
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    // The fonts come from Google Fonts: printed only once they are ready.
    await page.evaluate(() => document.fonts.ready);
    const pdf = await page.pdf({
      printBackground: true,
      ...(options.cssPage
        ? {
            preferCSSPageSize: true,
            margin: { top: 0, bottom: 0, left: 0, right: 0 },
          }
        : {
            format: "A4",
            margin: {
              top: "18mm",
              bottom: "18mm",
              left: "16mm",
              right: "16mm",
            },
          }),
      ...(options.footer !== undefined
        ? {
            displayHeaderFooter: true,
            headerTemplate: "<span></span>",
            footerTemplate: contractFooter(options.footer),
          }
        : options.pageNumbers
          ? {
              displayHeaderFooter: true,
              headerTemplate: "<span></span>",
              footerTemplate: PAGE_NUMBERS,
            }
          : {}),
    });
    // Never an empty file handed out as a PDF (PROJ-BUG-05).
    if (pdf.length === 0) throw new Error("empty_pdf");
    return pdf;
  } finally {
    await browser.close();
  }
}
