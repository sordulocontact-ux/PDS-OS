// Run from the repository root: node docs/protos/tests/titre.cjs (PROTO=… for a copy)
// Screenshots go to $TMPDIR/pds-protos (never into docs/).
const path = require("path"), os = require("os"), fs = require("fs");
const file = process.env.PROTO || path.resolve(__dirname, "..", "titre.html");
const out = path.join(os.tmpdir(), "pds-protos"); fs.mkdirSync(out, { recursive: true });
const { chromium } = require(process.cwd() + "/node_modules/playwright-core");
let LOG = [], ERRS = [];
(async () => {
  const b = await chromium.launch({ channel: "chrome", headless: true });
  const p = await b.newPage({ viewport: { width: 1440, height: 1000 } }); p.setDefaultTimeout(8000);
  const errs = ERRS; p.on("pageerror", e => errs.push(e.message)); p.on("console", m => { if (m.type() === "error") errs.push(m.text()); });
  await p.goto("file://" + file);
  const log = LOG;
  const now = async () => (await p.locator('section[aria-label="Maintenant"] h2').textContent()).trim();
  const count = async () => (await p.locator(".meter").textContent()).trim();
  const click = async sel => p.locator(sel).first().click();
  const tab = async t => click(`.tabs [data-t="${t}"]`);
  log.push("new now: " + await now() + " · " + await count());
  // First version from « Maintenant »: no file → error, then a sample.
  await click('[data-act="now"]'); await click('[data-act="save"]');
  log.push("audio error: " + await p.locator(".dialog .err").count());
  await click('[data-act="sample"]'); await click('[data-act="save"]');
  log.push("after add: " + await now());
  // In Audio: corrections without a reason, then validate.
  await tab("audio");
  await click('[data-act="askFix"]'); await click('[data-act="save"]');
  log.push("motif error: " + await p.locator("#e-note").count());
  await click('[data-act="close"]'); await click('[data-act="validateV"]'); await click('[data-act="save"]');
  log.push("audio summary: " + (await p.locator(".factgrid").first().innerText()).replace(/\n/g, " / "));
  await click('[data-act="addSession"]'); await p.fill("#f4", "Studio Ressac"); await click('[data-act="save"]');
  await click('[data-act="addLink"]'); await p.fill("#f1", "Stems V1"); await p.fill("#f2", "ftp://x"); await click('[data-act="save"]');
  log.push("link error: " + (await p.locator("#e-f2").textContent()).trim());
  await p.fill("#f2", "https://wetransfer.com/abc"); await click('[data-act="save"]');
  log.push("audio tables: " + await p.locator("table.dt").count());
  // Overview: ISRC on the spot.
  await tab("overview");
  await click('#row-isrc [data-act="edit"]'); await p.fill("#f1", "FR123"); await click('[data-act="save"]');
  log.push("isrc error: " + (await p.locator("#e-f1").textContent()).trim());
  await p.fill("#f1", "fr z03 26 00007"); await click('[data-act="save"]');
  log.push("isrc row: " + (await p.locator("#row-isrc .v").textContent()).trim() + " · " + await count());
  // Crédits: a contributor, master parts one by one, over 100 refused, validate.
  await tab("credits");
  await click('[data-act="addContrib"]'); await click('[data-act="save"]');
  log.push("contrib errors: " + await p.locator(".dialog .err").count());
  await p.selectOption("#f1", "Zéphyr Vega"); await p.check("#r0"); await click('[data-act="save"]');
  await click('[data-act="addPart"][data-t="master"]'); await p.selectOption("#f1", "PDS Records"); await p.fill("#f3", "60"); await click('[data-act="save"]');
  await click('[data-act="addPart"][data-t="master"]'); await p.selectOption("#f1", "Zéphyr Vega"); await p.selectOption("#f2", "Artiste"); await p.fill("#f3", "50"); await click('[data-act="save"]');
  log.push("part error: " + (await p.locator("#e-f3").textContent()).trim());
  await p.fill("#f3", "40"); await click('[data-act="save"]');
  await click('[data-act="validateSplit"][data-t="master"]'); await click('[data-act="save"]');
  log.push("master card: " + (await p.locator(".sc").nth(2).locator(".sc-acts").innerText()).replace(/\n/g, " "));
  // Droits: modify, confirm, qualify SACEM.
  await tab("rights");
  await click('[data-act="edit"][data-k="rights"]');
  log.push("holder proposed: " + await p.inputValue("#f1"));
  await p.fill("#f2", "2026"); await click('[data-act="save"]');
  await click('[data-act="confirmHolder"]');
  await click('[data-act="qualify"][data-o="sacem"]'); await p.selectOption("#f1", "to_do"); await click('[data-act="save"]');
  log.push("rights: " + (await p.locator(".sc").first().innerText()).split("\n").slice(-1)[0]);
  await tab("projects");
  await click('[data-act="attachProject"]'); await p.selectOption("#f1", { index: 1 }); await click('[data-act="save"]');
  log.push("projects rows: " + await p.locator(".sc").first().locator("tbody tr").count());
  await tab("files");
  await click('[data-act="addFile"]'); await click('[data-act="sample"]'); await click('[data-act="save"]');
  log.push("files tabs: " + (await p.locator(".ftabs").innerText()).replace(/\n/g, " "));
  await tab("overview");
  log.push("overview after: " + await count() + " · now: " + await now());
  log.push("activity rows: " + await p.locator(".act-row").count());
  await p.selectOption("#roleSel", "da");
  log.push("da now: " + await now() + " · buttons: " + await p.locator('[data-act="edit"]').count());
  await p.selectOption("#roleSel", "dg"); await p.selectOption("#scenSel", "ready");
  log.push("ready now: " + await now() + " · " + await count());
  await click('#row-decl [data-act="edit"]');
  for (const k of ["sacem", "scpp", "sppf", "adami", "spedidam"]) await p.selectOption("#o-" + k, k === "sacem" || k === "scpp" ? "submitted" : "not_applicable");
  await click('[data-act="save"]');
  log.push("all done: " + await now() + " · " + await count());
  for (const t of ["overview", "audio", "credits", "rights", "projects", "files"]) { await tab(t); await p.screenshot({ path: `${out}/titre-${t}.png`, fullPage: true }); }
  await p.setViewportSize({ width: 390, height: 900 });
  let widest = 0; for (const t of ["overview", "audio", "credits", "rights", "projects", "files"]) { await tab(t); widest = Math.max(widest, await p.evaluate(() => document.documentElement.scrollWidth)); }
  log.push("mobile scrollWidth: " + widest);
  await tab("credits"); await p.screenshot({ path: out + "/titre-mobile.png", fullPage: true });
  await p.emulateMedia({ colorScheme: "dark" }); await p.setViewportSize({ width: 1440, height: 1000 });
  await tab("audio"); await p.screenshot({ path: out + "/titre-dark.png", fullPage: true });
  console.log(log.join("\n")); console.log("errors:", errs); await b.close();
})().catch(e => { console.log(LOG.join("\n")); console.error("FAIL", e.message.split("\n").slice(0, 3).join(" "), "errors:", ERRS); process.exit(1); });
