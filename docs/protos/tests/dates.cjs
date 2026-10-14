// Run from the repository root: node docs/protos/tests/dates.cjs
// Screenshots go to $TMPDIR/pds-protos (never into docs/).
const path = require("path"), os = require("os"), fs = require("fs");
const html = path.resolve(__dirname, "..");
const out = path.join(os.tmpdir(), "pds-protos"); fs.mkdirSync(out, { recursive: true });
const { chromium } = require(process.cwd() + "/node_modules/playwright-core");
(async () => { const b = await chromium.launch({ channel: "chrome", headless: true }); const p = await b.newPage({ viewport:{width:1440,height:1200} }); p.setDefaultTimeout(15000);
 const errs=[]; p.on("pageerror", e => errs.push(e.message));
 await p.goto("file://" + html + "/pds-app.html");
 const go = t => p.locator("button.btn", { hasText: t }).first().click();
 const op = async () => { const l = p.locator("button.btn", { hasText: "Ouvrir" }); if (await l.count()) await l.first().click(); };
 await p.selectOption("#scenSel","framing"); await p.selectOption("#roleSel","dg"); await op(); await go("Valider le Brief"); await p.selectOption("#roleSel","cp"); await op(); await go("Lancer le plan");
 await p.locator('[data-act="wf"][data-v="master"]').first().click(); await go("Confirmer la version source");
 await p.locator('.step[data-step="m2"]').click();
 const rows = p.locator(".rows .row"); console.log((await rows.allInnerTexts()).map(t=>t.replace(/\n/g," | ")).join("\n"));
 await p.locator('[aria-label="Modifier Mix V1 attendu le"]').click();
 console.log("input type:", await p.locator("#editval").getAttribute("type"), await p.locator("#editval").inputValue());
 await p.fill("#editval","2026-11-25"); await go("Enregistrer"); console.log("order error:", await p.locator("#editerr").innerText());
 await p.fill("#editval","2026-11-14"); await go("Enregistrer");
 console.log("saved:", (await rows.nth(2).innerText()).replace(/\n/g," | "));
 await p.locator(".card").filter({ hasText: "Mix final attendu le" }).last().screenshot({ path: out + "/dates.png" });
 console.log("errors:", errs); await b.close(); })();
