import "server-only";

import { chromium as playwright, type Browser } from "playwright-core";

/**
 * Single entry point for PDF exports (CLAUDE.md, stack: Playwright). The HTML
 * is complete and self-contained: the browser never visits the app, so no
 * session or cookie is ever handed to it.
 *
 * On Vercel, a Chromium built for serverless functions (@sparticuz/chromium);
 * elsewhere (local dev), the Chrome installed on the machine.
 */
async function launch(): Promise<Browser> {
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

export async function htmlToPdf(html: string): Promise<Uint8Array> {
  const browser = await launch();
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    // The fonts come from Google Fonts: printed only once they are ready.
    await page.evaluate(() => document.fonts.ready);
    return await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "18mm", bottom: "18mm", left: "16mm", right: "16mm" },
    });
  } finally {
    await browser.close();
  }
}
