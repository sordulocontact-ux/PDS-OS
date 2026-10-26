// Run from the repository root: node docs/protos/tests/production-v2.cjs
// Screenshots go to $TMPDIR/pds-protos (never into docs/).
const path = require("path"), os = require("os"), fs = require("fs");
const html = path.resolve(__dirname, "..");
const out = path.join(os.tmpdir(), "pds-protos"); fs.mkdirSync(out, { recursive: true });
const { chromium } = require(process.cwd() + "/node_modules/playwright-core");
(async () => { const b = await chromium.launch({ channel: "chrome", headless: true }); const p = await b.newPage({ viewport:{width:1440,height:1100} }); p.setDefaultTimeout(8000);
 const errs=[]; p.on("pageerror", e => errs.push(e.message));
 await p.goto("file://" + html + "/production-v2.html");
 const L=globalThis.__L=[]; const log=(...a)=>{L.push(a.join(" "));};
 const go = async t => { try { await p.locator("button.btn", { hasText: t }).first().click(); } catch(e){ console.log("FAIL click", t, (await p.locator("#app").innerText()).slice(0,900).replace(/\n/g," / ")); throw e; } };
 const role = r => p.selectOption("#roleSel", r);
 const step = id => p.locator(`.step[data-step="${id}"]`).click();
 const errTxt = async () => (await p.locator(".err").allInnerTexts()).join(" | ");
 // 1. Quote
 log("start detail:", await p.locator("#dtitle").innerText(), "| now:", await p.locator("section.now").count());
 await go("Soumettre à"); log("no checks:", await errTxt());
 await p.check("#qc1"); await p.check("#qc2"); await go("Soumettre à");
 await role("dg"); await go("Demander une modification"); log("no comment:", await errTxt());
 await p.fill("#qComment","Détailler la régie, svp."); await go("Demander une modification");
 await role("societe"); log("portal h1:", await p.locator("h1").first().innerText());
 await go("Remplir avec un exemple"); await go("Déposer le devis V2");
 await role("charge"); await p.check("#qc1"); await p.check("#qc2"); await go("Soumettre à");
 await role("dg"); await go("Valider le devis V2"); log("active:", await p.locator(".callout.ok").first().innerText());
 // 2. Creative
 await role("realExt"); await go("Joindre les fichiers"); await go("Déposer la V1");
 await role("da"); await step("creative"); await go("Valider la V1");
 await role("mgmt"); log("mgmt portal sees envelope:", (await p.locator("#app").innerText()).includes("18 000"));
 await go("Valider la V1");
 await role("cp"); await step("creative"); log("creative:", await p.locator(".callout.ok").first().innerText());
 // 3. Locations
 await role("societe"); await go("Proposer un lieu"); await go("Remplir avec un exemple"); await go("Proposer ce lieu");
 await role("cp"); await step("locs"); await go("Retenir ce lieu"); log("loc:", await p.locator(".callout.ok").first().innerText());
 // 4. Change of place
 await p.selectOption("#scenSel","change"); log("strip:", (await p.locator(".strip").first().innerText()).replace(/\n/g," | "));
 await go("Remplacer le lieu retenu"); log("prefilled reason:", await p.inputValue("#rpReason"), "| linked info checked:", await p.locator('[id^="lk-"]').first().isChecked());
 await p.fill("#rpReason",""); await go("Remplacer le lieu"); log("no reason:", await errTxt());
 await p.fill("#rpReason","La copropriété refuse le tournage sur le toit"); await go("Remplacer le lieu");
 log("info confirmed by the replacement:", await p.evaluate(()=>document.body.innerText.includes("2 informations à confirmer")) ? "no" : "yes");
 log("after replace:", await p.locator(".flash b").first().innerText(), "| spine:", (await p.locator(".step.rework .t").allInnerTexts()).join(","));
 await p.screenshot({ path: out + "/v2-change.png", fullPage: true });
 await p.locator('.tab[data-v="decisions"]').click(); log("contra:", await p.locator(".contra .row").count());
 await p.locator('[data-act="foi"]').nth(1).click(); log("contra after:", await p.locator(".contra").count());
 await p.screenshot({ path: out + "/v2-decisions.png", fullPage: true });
 await go("Noter une information"); await p.fill("#dText","Le camion doit se garer avant 7 h"); await p.selectOption("#dSource","Appel"); await go("Noter"); log("noted:", await p.locator(".dec .row").count());
 await p.locator('.tab[data-v="tasks"]').click(); log("tasks open:", await p.locator(".card .rows .row").count());
 // 5. Ready
 await p.selectOption("#scenSel","ready"); log("syn:", (await p.locator(".syn .pill").allInnerTexts()).join(","));
 await p.screenshot({ path: out + "/v2-ready.png", fullPage: true });
 log("ready first:", (await p.locator(".layout section.card .vers").first().innerText()).split("\n")[0], "| folded:", await p.locator("details.vers").count());
 await go("Demander la dérogation"); log("force err:", await errTxt());
 await p.check("#rForce"); await p.fill("#rpD-0",""); await go("Demander la dérogation"); log("reason err:", await errTxt(), "| still checked:", await p.isChecked("#rForce"), "| focus:", await p.evaluate(()=>document.activeElement.id));
 await p.fill("#rpD-0","2026-10-22"); await p.fill("#rReason","Autorisation promise par la mairie pour le 22/10"); await go("Demander la dérogation");
 log("pending:", (await p.locator(".callout.warn").first().innerText()).slice(0,120), "| shoot:", await p.locator('.step[data-step="shoot"] .s').innerText());
 await role("charge"); log("same step for charge:", await p.locator("#dtitle").innerText());
 await role("dg"); await go("Refuser"); log("refuse no note:", await errTxt());
 await go("Valider la dérogation"); log("ready:", await p.locator(".callout.ok").first().innerText());
 log("plan tasks:", (await p.locator(".rows .row", { hasText: "Avant le" }).count()) || (await p.evaluate(()=>document.body.innerText.match(/Réglé par/g)||[]).length));
 await role("cp");
 await role("societe"); log("societe sees:", await p.locator(".callout.ok").first().innerText());
 // 6. After the shoot
 await role("cp"); await step("shoot"); await go("Confirmer que le tournage a eu lieu");
 await role("societe"); await go("Utiliser un lien d'exemple"); await go("Transmettre le lien");
 await role("charge"); await step("rushes"); await go("Rushes reçus");
 await role("societe"); await go("Utiliser un lien d'exemple"); await go("Déposer le montage V1");
 await role("da"); await step("post"); await p.fill("#pComment","Raccourcir l'intro de 4 s."); await go("Demander des modifications");
 await role("societe"); await go("Utiliser un lien d'exemple"); await go("Déposer le montage V2");
 await role("da"); await step("post"); await go("Valider le montage V2"); await role("mgmt"); await go("Valider le montage V2");
 await role("societe"); await go("Déposer le fichier final");
 await role("cp"); await step("delivery"); await go("Confirmer la livraison"); await go("Clôturer la production");
 log("closed:", await p.locator(".callout.ok").last().innerText());
 // 7. Roles and links
 await step("org"); await p.locator('[aria-label="Changer Validation créative externe"]').click(); await p.selectOption("#roleNew",""); await go("Enregistrer");
 log("role hist:", await p.locator(".hist li").first().innerText());
 await p.locator('[data-act="revoke"][data-v="realExt"]').click(); await role("realExt"); log("revoked:", await p.locator("h1").innerText());
 // 8. Blocker
 await p.selectOption("#scenSel","change"); await step("prep"); await go("Signaler un blocage"); await p.fill("#bText","Le loueur n'a plus de FX6"); await p.fill("#bNext","Trouver un autre loueur"); await go("Signaler");
 await role("charge"); log("charge stays on:", await p.locator("#dtitle").innerText(), "| blocker here:", await p.locator(".layout .callout.bad").count());
 await step("prep"); await p.locator('[data-act="lift"]').first().click(); await p.locator('[data-act="liftok"]').click(); log("lift without note:", await errTxt()); await p.fill("#liftNote","Un autre loueur a une FX6"); await p.locator('[data-act="liftok"]').click(); log("lifted, blockers:", await p.locator('.step[data-step="prep"] .flag').count());
 // 9. A change after the check reopens it (MKT-PROD-001), a minor point alone needs no second approval
 await p.selectOption("#scenSel","ready"); await role("charge"); await step("ready"); await p.locator('[data-act="lift"]').first().click(); await p.fill("#liftNote","Autorisation reçue"); await p.locator('[data-act="liftok"]').click();
 await role("societe"); while (await p.locator('[data-act="taskdone"]').count()) await p.locator('[data-act="taskdone"]').first().click();
 await role("cp"); await step("ready"); log("ready now:", (await p.locator(".layout section.card .callout").first().innerText()).slice(0,100));
 await p.check("#rForce"); await p.fill("#rReason","Garder le 23/10, le 24 reste une option"); await p.locator("button.btn", { hasText: /Confirmer|Demander/ }).first().click(); log("minor only:", await p.locator(".flash b").first().innerText());
 await step("creative"); await go("Demander une nouvelle version"); await p.fill("#crReason","Le découpage ne tient plus avec le nouveau lieu"); await go("Demander à");
 log("ready after change:", await p.locator('.step[data-step="ready"] .s').innerText(), "| shoot:", await p.locator('.step[data-step="shoot"] .s').innerText());
 await step("ready"); log("reopened says:", (await p.locator(".layout section.card .callout.warn").first().innerText()).slice(0,110));
 await p.setViewportSize({ width: 390, height: 900 }); log("mobile:", await p.evaluate(() => document.documentElement.scrollWidth));
 await p.emulateMedia({ colorScheme: "dark" }); await p.setViewportSize({ width: 1440, height: 1100 }); await p.selectOption("#scenSel","ready"); await p.screenshot({ path: out + "/v2-dark.png" });
 console.log(L.join("\n")); console.log("errors:", errs); await b.close(); })().catch(e=>{console.log((globalThis.__L||[]).join("\n"));console.error("FAIL", e.message.split("\n")[0]); process.exit(1);});
