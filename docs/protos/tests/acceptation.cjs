// Run from the repository root: node docs/protos/tests/acceptation.cjs
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
 await op(); await go("Créer et transmettre"); await p.selectOption("#roleSel","cp"); await op();
 console.log("artist shown:", await p.getByText("Mona Lys").count() > 0, "| edit buttons:", await p.locator('[data-act="edit"]').count());
 await p.locator(".card").filter({ hasText: "Ce que vous acceptez" }).screenshot({ path: out + "/accept.png" });
 await go("Demander une précision"); console.log("motif error:", await p.locator("#alterr:not([hidden])").count());
 await p.fill("#altnote", "Le budget inclut-il le clip ?"); await go("Demander une précision");
 await p.selectOption("#roleSel","dg"); await op();
 console.log("dg sees:", (await p.locator(".callout.warn").first().innerText()).trim(), "| button:", await p.locator("button.btn", { hasText: "Répondre et transmettre" }).count());
 await go("Répondre et transmettre"); await p.selectOption("#roleSel","cp"); await op(); await go("Accepter le projet");
 console.log("after accept:", (await p.locator(".flash b").first().innerText()).trim());
 console.log("errors:", errs); await b.close(); })();
