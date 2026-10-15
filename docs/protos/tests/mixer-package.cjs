// Run from the repository root: node docs/protos/tests/mixer-package.cjs
// Screenshots go to $TMPDIR/pds-protos (never into docs/).
const path = require("path"), os = require("os"), fs = require("fs");
const html = path.resolve(__dirname, "..");
const out = path.join(os.tmpdir(), "pds-protos"); fs.mkdirSync(out, { recursive: true });
const { chromium } = require(process.cwd() + "/node_modules/playwright-core");
(async () => { const b = await chromium.launch({ channel: "chrome", headless: true }); const p = await b.newPage({ viewport:{width:1440,height:1300} }); p.setDefaultTimeout(15000);
 const errs=[]; p.on("pageerror", e => errs.push(e.message));
 await p.goto("file://" + html + "/pds-app.html");
 const go = t => p.locator("button.btn", { hasText: t }).first().click();
 const op = async () => { const l = p.locator("button.btn", { hasText: "Ouvrir" }); if (await l.count()) await l.first().click(); };
 await p.selectOption("#scenSel","framing"); await p.selectOption("#roleSel","dg"); await op(); await go("Valider le Brief"); await p.selectOption("#roleSel","cp"); await op(); await go("Lancer le plan");
 await p.locator('.pitem', { hasText: "Master" }).click(); await go("Confirmer la version source"); await p.locator('.step[data-step="m2"]').click(); await go("Confirmer le Brief");
 await p.locator('.step[data-step="m3"]').click();
 console.log("package rows:", (await p.locator(".vers .row b").allInnerTexts()).join(" | "));
 console.log("rates hidden:", !(await p.locator(".vers .rows").innerText()).includes("800"), "| note prefilled:", (await p.locator("#packNote").inputValue()).slice(0,30));
 await p.locator(".card").filter({ hasText: "Dossier pour le mixeur" }).last().screenshot({ path: out + "/pack.png" });
 await p.fill("#packNote", "Merci Karim, voix devant sur les refrains !"); await go("Créer le lien");
 console.log("flash:", (await p.locator(".flash").innerText()).replace(/\n/g," | "));
 await p.screenshot({ path: out + "/pack-link.png" });
 await p.locator(".flash button[data-act=unflash]").click();
 console.log("link shown again:", await p.locator("code").count(), "| sent:", (await p.locator(".vers").first().innerText()).replace(/\n/g," | "));
 await go("Relancer l'ingénieur"); console.log("renew:", await p.locator(".flash b").first().innerText());
 await p.selectOption("#roleSel","mix");
 console.log("mixer note:", await p.locator(".callout.info").first().innerText(), "| downloads:", await p.locator('[data-act="dl"]').count());
 await p.screenshot({ path: out + "/pack-mixer.png", fullPage: true });
 console.log("errors:", errs); await b.close(); })();
