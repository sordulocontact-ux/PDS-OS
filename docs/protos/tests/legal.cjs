// Run from the repository root: node docs/protos/tests/legal.cjs
// Screenshots go to $TMPDIR/pds-protos (never into docs/).
const path = require("path"), os = require("os"), fs = require("fs");
const html = path.resolve(__dirname, "..");
const fixtures = path.join(__dirname, "fixtures");
const out = path.join(os.tmpdir(), "pds-protos"); fs.mkdirSync(out, { recursive: true });
const { chromium } = require(process.cwd() + "/node_modules/playwright-core");
(async () => { const b = await chromium.launch({ channel: "chrome", headless: true }); const p = await b.newPage({ viewport:{width:1440,height:1200} }); p.setDefaultTimeout(15000);
 const errs=[]; p.on("pageerror", e => errs.push(e.message));
 await p.goto("file://" + html + "/pds-app.html");
 const go = t => p.locator("button.btn", { hasText: t }).first().click();
 const op = async () => { const l = p.locator("button.btn", { hasText: "Ouvrir" }); if (await l.count()) await l.first().click(); };
 await p.selectOption("#scenSel","framing"); await p.selectOption("#roleSel","dg"); await op(); await go("Valider le Brief"); await p.selectOption("#roleSel","cp"); await op(); await go("Lancer le plan");
 await p.locator('.pitem', { hasText: "Juridique" }).click(); await go("Compléter l'état des lieux"); await p.locator('.step[data-step="j2"]').click();
 console.log("po callout before answering:", await p.locator(".callout .po").count());
 console.log("q1:", await p.locator(".qh").innerText(), "| prefilled:", JSON.stringify(await p.locator("#qaText").inputValue()));
 await p.screenshot({ path: out + "/legal-q1.png" });
 await go("Compléter avec un exemple"); await go("Lire ma réponse");
 console.log("understood:", (await p.locator(".qa .row").allInnerTexts()).map(t=>t.replace(/\n/g," ")));
 await p.locator('[data-act="qaremove"]').nth(2).click(); console.log("after remove:", await p.locator(".qa .row").count());
 await p.locator(".card").filter({ hasText: "Ce que PO a compris" }).last().screenshot({ path: out + "/legal-understood.png" });
 await go("Enregistrer"); console.log("q2:", await p.locator(".qh").innerText());
 await p.fill("#qaText", "Je ne sais pas trop"); await go("Lire ma réponse"); console.log("nothing:", await p.locator(".qa .callout").innerText());
 await go("Revoir ma réponse"); await p.fill("#qaText", ""); await go("Lire ma réponse"); console.log("empty:", await p.locator(".qa .err").innerText());
 await p.fill("#qaText","Il y a un sample de 4 s"); await go("Compléter avec un exemple"); await go("Lire ma réponse"); await go("Enregistrer");
 console.log("done:", await p.locator(".callout.ok").first().innerText()); console.log("saved:", (await p.locator(".vers").innerText()).replace(/\n/g," / "));
 await p.selectOption("#scenSel","running"); await p.locator('.pitem', { hasText: "Juridique" }).click(); await p.locator('.step[data-step="j2"]').click();
 console.log("running saved rows:", await p.locator(".vers .row").count());
 console.log("errors:", errs); await b.close(); })();
