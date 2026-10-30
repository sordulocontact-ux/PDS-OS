// Run from the repository root: node docs/protos/tests/maintenant.cjs (PROTO=… for a copy)
// The « Maintenant » card proposed on 30/10: every contract state, both cards.
const path = require("path"), os = require("os"), fs = require("fs");
const file = process.env.PROTO || path.resolve(__dirname, "..", "maintenant.html");
const out = path.join(os.tmpdir(), "pds-protos"); fs.mkdirSync(out, { recursive: true });
const { chromium } = require(process.cwd() + "/node_modules/playwright-core");
const LOG = [], ERRS = [];
(async () => {
  const b = await chromium.launch({ channel: "chrome", headless: true });
  const p = await b.newPage({ viewport: { width: 1440, height: 1000 } }); p.setDefaultTimeout(8000);
  p.on("pageerror", e => ERRS.push(e.message)); p.on("console", m => { if (m.type() === "error") ERRS.push(m.text()); });
  await p.goto("file://" + file);
  const card = async () => (await p.locator("section.now2").first().innerText()).replace(/\n+/g, " | ");
  for (const role of ["dg", "cp"]) {
    await p.selectOption("#roleSel", role);
    for (const k of ["k1", "k3", "k6", "k2", "k4", "k7"]) {
      await p.selectOption("#ctrSel", k);
      LOG.push(`${role} ${k}: ${await card()}`);
      await p.screenshot({ path: `${out}/now-${role}-${k}.png`, clip: { x: 0, y: 0, width: 1440, height: 620 } });
    }
  }
  await p.selectOption("#roleSel", "dg"); await p.selectOption("#ctrSel", "k1");
  await p.click('[data-act="fixOpen"]'); await p.click('[data-act="fixSend"]');
  LOG.push("fix error: " + await p.locator("#e-fix-note").count());
  await p.selectOption("#cardSel", "old"); LOG.push("old card: " + await p.locator("section.now").count());
  await p.selectOption("#cardSel", "new");
  await p.setViewportSize({ width: 390, height: 900 }); await p.selectOption("#ctrSel", "k2");
  LOG.push("mobile scrollWidth: " + await p.evaluate(() => document.documentElement.scrollWidth));
  await p.screenshot({ path: `${out}/now-mobile.png`, fullPage: false });
  await p.emulateMedia({ colorScheme: "dark" }); await p.setViewportSize({ width: 1440, height: 1000 });
  await p.screenshot({ path: `${out}/now-dark.png`, clip: { x: 0, y: 0, width: 1440, height: 620 } });
  console.log(LOG.join("\n")); console.log("errors:", ERRS); await b.close();
})().catch(e => { console.log(LOG.join("\n")); console.error("FAIL", e.message.split("\n").slice(0, 3).join(" "), "errors:", ERRS); process.exit(1); });
