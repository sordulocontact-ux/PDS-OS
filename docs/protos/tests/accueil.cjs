// Run from the repository root: node docs/protos/tests/accueil.cjs (PROTO=… for a copy)
// Screenshots go to $TMPDIR/pds-protos (never into docs/).
const path = require("path"), os = require("os"), fs = require("fs");
const file = process.env.PROTO || path.resolve(__dirname, "..", "accueil.html");
const out = path.join(os.tmpdir(), "pds-protos"); fs.mkdirSync(out, { recursive: true });
const { chromium } = require(process.cwd() + "/node_modules/playwright-core");
(async () => {
  const b = await chromium.launch({ channel: "chrome", headless: true });
  const p = await b.newPage({ viewport: { width: 1440, height: 1000 } }); p.setDefaultTimeout(8000);
  const errs = []; p.on("pageerror", e => errs.push(e.message)); p.on("console", m => { if (m.type() === "error") errs.push(m.text()); });
  await p.goto("file://" + file);
  const log = [];
  const now = async () => (await p.locator('section[aria-label="Maintenant"] h2').first().textContent()).trim();
  const sub = async () => (await p.locator(".greet p").textContent()).trim();
  const role = async r => { await p.selectOption("#roleSel", r); };
  const moment = async m => { await p.selectOption("#scenSel", m); };

  for (const r of ["dg", "cp", "da", "charge"]) {
    await role(r);
    log.push(`${r}: « ${await sub()} » · now: ${await now()} · attend: ${await p.locator("#h-wait").count() ? (await p.locator("#h-wait").textContent()).trim() : "—"} · projets: ${await p.locator(".row.proj:not(.head-row)").count()}`);
    await p.screenshot({ path: `${out}/accueil-${r}.png`, fullPage: true });
  }

  // DG validates the overdue contract: the home moves on, Lina gets the next gesture.
  await role("dg");
  await p.locator('section[aria-label="Maintenant"] button', { hasText: "Ouvrir" }).click();
  log.push("dg opened: " + (await p.locator(".page h1").textContent()).trim());
  await p.locator('button[data-act="altOpen"]').click();
  await p.locator('button[data-act="altSend"]').click();
  log.push("motif error shown: " + await p.locator("#altErr").count());
  await p.locator('button[data-act="altCancel"]').click();
  await p.locator('button[data-act="do"]').click();
  log.push("banner: " + (await p.locator(".banner").textContent()).trim());
  await p.locator('button[data-act="go"][data-v="home"]').first().click();
  log.push("dg now after: " + await now());
  await role("cp");
  log.push("cp now after: " + await now() + " · « " + await sub() + " »");

  // A project handed over comes first for Lina.
  await moment("handover");
  log.push("handover cp now: " + await now());
  await p.locator('section[aria-label="Maintenant"] button', { hasText: "Ouvrir" }).click();
  await p.locator('button[data-act="do"]').click();
  log.push("auto-open: " + (await p.locator(".banner").textContent()).trim());

  // Nothing left, then a first day.
  await moment("clear");
  log.push("clear cp: " + await now() + " · « " + await sub() + " »");
  await moment("first");
  log.push("first cp: welcome " + await p.locator('section[aria-label="Bienvenue dans PDS OS"]').count() + " · " + await now());
  await p.screenshot({ path: `${out}/accueil-first.png`, fullPage: true });

  // Travail from the « Tout voir » link (DG has the most actions).
  await moment("day"); await role("dg");
  await p.locator('.nav a[data-v="work"]').click();
  log.push("travail groups: " + (await p.locator(".groups .sec-head h2").allTextContents()).join(" | "));

  await moment("day"); await role("cp");
  await p.setViewportSize({ width: 390, height: 900 });
  await p.screenshot({ path: `${out}/accueil-mobile.png`, fullPage: true });
  log.push("mobile scrollWidth: " + await p.evaluate(() => document.documentElement.scrollWidth));
  await p.emulateMedia({ colorScheme: "dark" }); await p.setViewportSize({ width: 1440, height: 1000 });
  await p.screenshot({ path: `${out}/accueil-dark.png`, fullPage: true });
  console.log(log.join("\n")); console.log("errors:", errs); await b.close();
})().catch(e => { console.error("FAIL", e.message.split("\n").slice(0, 3).join(" ")); process.exit(1); });
