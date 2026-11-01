// Run from the repository root: node docs/protos/tests/onboarding.cjs (PROTO=… for a copy)
// Screenshots go to $TMPDIR/pds-protos (never into docs/).
const path = require("path"), os = require("os"), fs = require("fs");
const file = process.env.PROTO || path.resolve(__dirname, "..", "onboarding.html");
const out = path.join(os.tmpdir(), "pds-protos"); fs.mkdirSync(out, { recursive: true });
const { chromium } = require(process.cwd() + "/node_modules/playwright-core");
(async () => {
  const b = await chromium.launch({ channel: "chrome", headless: true });
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } }); p.setDefaultTimeout(8000);
  const errs = []; p.on("pageerror", e => errs.push(e.message)); p.on("console", m => { if (m.type() === "error") errs.push(m.text()); });
  await p.goto("file://" + file);
  const log = [];
  const title = async () => (await p.locator("#obTitle").textContent()).trim();
  const role = async r => { await p.selectOption("#roleSel", r); };

  // Each position walks the four screens with the mouse, then lands on its « Maintenant ».
  for (const r of ["cp", "dg", "da"]) {
    await role(r);
    const titles = [];
    for (let i = 0; i < 4; i++) {
      titles.push(await title());
      await p.waitForTimeout(i === 1 ? 2600 : 2300);
      await p.screenshot({ path: `${out}/onboarding-${r}-${i + 1}.png` });
      await p.locator("#obNext").click();
    }
    const now = (await p.locator('section[aria-label="Maintenant"] h2').first().textContent()).trim();
    log.push(`${r}: ${titles.join(" → ")} · open after: ${await p.locator(".ob").count()} · spot: ${await p.locator(".now.spot").count()} · now: ${now}`);
  }

  // Keyboard: arrows move, Escape skips with the toast saying where to find it again.
  await role("cp");
  await p.keyboard.press("ArrowRight"); await p.keyboard.press("ArrowRight");
  log.push("arrows → " + await title());
  await p.keyboard.press("ArrowLeft");
  log.push("back ← " + await title());
  await p.keyboard.press("ArrowRight");
  await p.locator('[data-act="obPush"]').click();
  await p.waitForTimeout(900);
  log.push("push: " + (await p.locator("#obPush").textContent()).trim().replace(/\s+/g, " "));
  await p.keyboard.press("Escape");
  log.push("escape closed: " + ((await p.locator(".ob").count()) === 0) + " · toast: " + (await p.locator("#toast").textContent()).trim());

  // Replay from the account menu.
  await p.waitForTimeout(400);
  await p.locator(".me-btn").click();
  await p.locator('[data-act="obReplay"]').click();
  log.push("replayed: " + await title());

  // Mobile: a sheet from the bottom, no horizontal scroll.
  await p.setViewportSize({ width: 390, height: 844 });
  await p.locator("#obNext").click();
  await p.waitForTimeout(2600);
  await p.screenshot({ path: `${out}/onboarding-mobile.png` });
  log.push("scrollWidth: " + await p.evaluate(() => document.documentElement.scrollWidth));

  // Dark theme.
  await p.setViewportSize({ width: 1440, height: 900 });
  await p.emulateMedia({ colorScheme: "dark" });
  await p.locator("#obNext").click();
  await p.locator("#obNext").click();
  await p.waitForTimeout(2400);
  await p.screenshot({ path: `${out}/onboarding-dark.png` });

  console.log(log.join("\n"));
  console.log("errors:", errs);
  await b.close();
})();
