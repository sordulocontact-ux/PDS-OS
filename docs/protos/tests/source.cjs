// Run from the repository root: node docs/protos/tests/source.cjs
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
 await p.selectOption("#scenSel","framing"); await p.selectOption("#roleSel","dg"); await op(); await go("Valider le Brief"); await p.selectOption("#roleSel","cp"); await op(); await go("Lancer le plan"); await p.locator('[data-act="wf"][data-v="master"]').first().click();
 console.log("status:", await p.locator(".dhead .pill").first().innerText(), "| now card:", await p.locator("section.now").count(), "| buttons:", await p.locator('[data-act="edit"]').allInnerTexts());
 await p.screenshot({ path: out + "/source.png" });
 await p.locator('[data-act="edit"]').first().click();
 console.log("options:", await p.locator('.opt b').allInnerTexts());
 await p.locator('[data-act="listen"]').nth(1).click(); console.log("playing:", await p.locator('[data-act="listen"][aria-pressed="true"]').innerText());
 await go("Importer une version"); console.log("after import checked:", await p.locator('input[name=pick]:checked').inputValue());
 await p.locator('.opt').nth(1).click();
 await p.locator(".card").filter({ hasText: "Versions audio" }).last().screenshot({ path: out + "/source-pick.png" });
 await go("Utiliser cette version");
 console.log("row:", (await p.locator('.rows .row').first().innerText()).replace(/\n/g," | "));
 await p.locator('[data-act="edit"]').nth(1).click(); console.log("stems options:", await p.locator('.opt b').allInnerTexts()); await go("Annuler");
 await go("Confirmer la version source"); console.log("done:", await p.locator(".callout.ok").first().innerText(), "| buttons after:", await p.locator('[data-act="edit"]').count());
 console.log("errors:", errs); await b.close(); })();
