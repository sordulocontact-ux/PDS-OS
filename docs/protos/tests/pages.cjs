// Run from the repository root: node docs/protos/tests/pages.cjs (PROTO=… for a copy)
// Réseau, Contrats, Fichiers, Calls, Artistes. Screenshots go to $TMPDIR/pds-protos.
const path = require("path"), os = require("os"), fs = require("fs");
const file = process.env.PROTO || path.resolve(__dirname, "..", "pages.html");
const out = path.join(os.tmpdir(), "pds-protos"); fs.mkdirSync(out, { recursive: true });
const { chromium } = require(process.cwd() + "/node_modules/playwright-core");
const LOG = [], ERRS = [];
(async () => {
  const b = await chromium.launch({ channel: "chrome", headless: true });
  const p = await b.newPage({ viewport: { width: 1440, height: 1000 } }); p.setDefaultTimeout(8000);
  p.on("pageerror", e => ERRS.push(e.message)); p.on("console", m => { if (m.type() === "error") ERRS.push(m.text()); });
  await p.goto("file://" + file);
  const log = s => LOG.push(s);
  const click = sel => p.locator(sel).first().click();
  const page = async v => p.selectOption("#pageSel", v);
  const h1 = async () => (await p.locator("h1").first().innerText()).replace(/\n/g, " ");
  const shot = n => p.screenshot({ path: `${out}/pages-${n}.png`, fullPage: true });

  // RÉSEAU
  log("réseau rows: " + await p.locator(".tbl tbody tr").count() + " · work sections: " + await p.locator("section.hs, section.now").count());
  log("underlined rows: " + await p.locator(".tbl tbody tr").first().evaluate(e => getComputedStyle(e).textDecorationLine));
  await shot("network");
  await p.fill('[data-search="net"]', "studio"); log("search studio: " + await p.locator(".tbl tbody tr").count());
  await p.fill('[data-search="net"]', "");
  await click('.tabs [data-v="scouted"]'); log("scouted: " + await p.locator(".tbl tbody tr").count());
  await click('.tabs [data-v="all"]');
  await click('tr[data-id="karim"]'); log("contact: " + await h1());
  await click('[data-m="relance"]'); await click('[data-act="save"]');
  log("relance: " + (await p.locator("#toast").innerText()));
  await shot("contact");
  await page("network"); await click('[data-m="newContact"]'); await click('[data-act="save"]'); log("contact name error: " + await p.locator("#e-n-name").count());
  await p.fill("#n-name", "Karim Haddou"); await p.fill("#n-mail", "x"); await click('[data-act="save"]');
  log("mail error: " + await p.locator("#e-n-mail").count());
  await click('[data-act="close"]');
  await page("network"); await click('[data-m="newContact"]'); await p.fill("#n-name", "Karim Haddou"); await click('[data-act="save"]');
  log("duplicate warning: " + await p.locator(".dialog .callout").count());
  await click('[data-act="save"]'); log("created: " + await h1());
  await page("network"); await click('tr[data-id="julie"]'); await click('[data-m="reading"]'); await p.fill("#r-v", "190 k"); await click('[data-act="save"]');
  log("readings: " + await p.locator('section.sc:has(h2:text("Relevés datés")) li').count());

  // CONTRATS : DG validates k1 after a refused empty reason
  await page("contracts"); log("contracts work sections: " + await p.locator("section.hs, section.now").count());
  await shot("contracts");
  await click('tr[data-id="k1"]'); log("contract: " + await h1());
  await click('[data-act="fixOpen"]'); await click('[data-act="fixSend"]'); log("fix error: " + await p.locator("#e-fix-note").count());
  await click('[data-act="fixCancel"]'); await click('[data-act="validateC"]');
  log("after validate: " + (await p.locator('section[aria-label="Maintenant"] h2').innerText()));
  await p.selectOption("#roleSel", "cp");
  log("cp now: " + (await p.locator('section[aria-label="Maintenant"] h2').innerText()));
  await click('[data-m="sendC"]'); await shot("send");
  await click('[data-act="save"]');
  log("sent: " + (await p.locator('section[aria-label="Maintenant"] h2').innerText()));
  await click('[data-act="returnSigned"]'); await p.selectOption("#roleSel", "dg");
  await click('[data-m="countersign"]'); await click('[data-act="save"]');
  log("signed: " + await h1());
  await shot("contract");
  await page("contracts"); await click('[data-act="ui"][data-v="sign"]'); log("tab à signer: " + await p.locator(".tbl tbody tr").count());
  await click('[data-p="templates"]'); log("templates: " + await h1());

  // FICHIERS
  await page("files"); await shot("files");
  log("files columns: " + (await p.locator(".tbl thead").innerText()).replace(/\s+/g, " "));
  await click('tr[data-id="f2"]'); log("file dialog: " + (await p.locator(".dialog h2").innerText()));
  await click('[data-act="newVersion"]'); log("versions: " + (await p.locator(".dialog summary").innerText()));
  await click('[data-act="close"]');

  // CALLS
  await p.selectOption("#roleSel", "cp"); await page("calls");
  log("calls work sections: " + await p.locator("section.hs, section.now").count());
  await shot("calls");
  await click('[data-act="ui"][data-v="list"]'); log("call list rows: " + await p.locator(".tbl tbody tr").count());
  await click('tr[data-id="cl1"]'); log("call: " + await h1());
  await click('[data-m="task"]'); await click('[data-act="save"]'); log("task errors: " + await p.locator(".dialog .err").count());
  await p.selectOption("#t-who", "Tom Mercier"); await p.fill("#t-due", "2026-11-03"); await click('[data-act="save"]');
  await shot("call");
  await page("calls"); await click('[data-act="ui"][data-v="cal"]'); await click('.ev >> text=Échange stratégique');
  await click('[data-act="recordCall"]'); await click('[data-act="processCall"]');
  log("processed: " + (await p.locator('section[aria-label="Maintenant"] h2').innerText()));

  // ARTISTES
  await p.selectOption("#roleSel", "dg"); await page("artists"); await shot("artists");
  log("artists work sections: " + await p.locator("section.hs, section.now").count());
  await click('tr[data-id="monalys"]'); log("artist: " + await h1());
  await click('[data-act="idRefuseOpen"]'); await click('[data-act="idRefuse"]'); log("refuse error: " + await p.locator("#e-id-why").count());
  await click('[data-act="idCancel"]'); await click('[data-act="idApprove"]');
  await click('.tabs [data-sub="overview"]'); await shot("artist");
  log("artist tabs: " + (await p.locator(".tabs").last().innerText()).replace(/\n/g, " "));

  // Mobile and dark, every page
  await p.setViewportSize({ width: 390, height: 900 });
  let widest = 0;
  for (const v of ["network", "contracts", "files", "calls", "artists"]) { await page(v); widest = Math.max(widest, await p.evaluate(() => document.documentElement.scrollWidth)); }
  await page("network"); await click('tr[data-id="sami"]'); widest = Math.max(widest, await p.evaluate(() => document.documentElement.scrollWidth));
  await shot("mobile-contact");
  log("mobile scrollWidth: " + widest);
  await p.emulateMedia({ colorScheme: "dark" }); await p.setViewportSize({ width: 1440, height: 1000 });
  await page("contracts"); await shot("dark");
  console.log(LOG.join("\n")); console.log("errors:", ERRS); await b.close();
})().catch(e => { console.log(LOG.join("\n")); console.error("FAIL", e.message.split("\n").slice(0, 3).join(" "), "errors:", ERRS); process.exit(1); });
