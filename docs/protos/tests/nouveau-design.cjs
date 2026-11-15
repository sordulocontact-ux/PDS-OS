// Run from the repository root: node docs/protos/tests/nouveau-design.cjs (PROTO=… for a copy)
// Nouveau design (15/11/2026) : six pages dans les deux designs, colonnes, Brief transmis, modale avec erreurs, mobile, sombre.
const path = require("path"), os = require("os"), fs = require("fs");
const file = process.env.PROTO || path.resolve(__dirname, "..", "nouveau-design.html");
const out = path.join(os.tmpdir(), "pds-protos"); fs.mkdirSync(out, { recursive: true });
const { chromium } = require(process.cwd() + "/node_modules/playwright-core");
(async () => {
  const b = await chromium.launch({ channel: "chrome", headless: true });
  const p = await b.newPage({ viewport: { width: 1440, height: 1000 } }); p.setDefaultTimeout(6000);
  const errs = []; p.on("pageerror", e => errs.push(e.message)); p.on("console", m => { if (m.type() === "error") errs.push(m.text()); });
  await p.goto("file://" + file); await p.waitForTimeout(400);
  const log = [];
  for (const pg of ["home","projects","overview","brief","contact","finance"]) {
    await p.selectOption("#goSel", pg);
    for (const d of ["old","new"]) {
      await p.click(d === "old" ? "#dOld" : "#dNew"); await p.waitForTimeout(250);
      await p.screenshot({ path: `${out}/nd-${pg}-${d}.png`, fullPage: true });
    }
    log.push(pg + " · h1 " + (await p.locator("main h1").first().evaluate(e => getComputedStyle(e).fontSize)));
  }
  await p.selectOption("#goSel", "projects");
  await p.click('[data-act="cols"]'); await p.check('[data-col="step"]'); await p.uncheck('[data-col="owner"]');
  log.push("colonnes: " + (await p.locator("thead th").allTextContents()).join(", "));
  await p.keyboard.press("Escape");
  await p.click('tbody tr:has-text("Néons")'); log.push("ligne → " + (await p.locator("main h1").first().textContent()));
  await p.click('.wfl button:has-text("Master")');
  await p.click('[data-act="sendbrief"]'); await p.waitForTimeout(700);
  log.push("brief: " + (await p.locator(".result").textContent()).trim());
  await p.selectOption("#goSel", "finance");
  await p.click('[data-modal="spend"]'); await p.click('[data-act="savespend"]');
  log.push("modale: " + (await p.locator(".fmsg").textContent()));
  await p.screenshot({ path: `${out}/nd-modal-new.png` });
  await p.keyboard.press("Escape");
  await p.setViewportSize({ width: 390, height: 844 });
  const widths = [];
  for (const pg of ["home","projects","brief","finance"]) { await p.selectOption("#goSel", pg); await p.waitForTimeout(150); widths.push(pg + ":" + await p.evaluate(() => document.documentElement.scrollWidth)); }
  await p.emulateMedia({ colorScheme: "dark" }); await p.selectOption("#goSel", "home"); await p.waitForTimeout(300);
  await p.screenshot({ path: `${out}/nd-mobile-dark.png`, fullPage: true });
  console.log(log.join("\n")); console.log({ widths, errors: errs });
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
