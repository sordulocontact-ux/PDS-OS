// Run from the repository root: node docs/protos/tests/distribution.cjs
// (PROTO=/path/to/file.html to test a copy). Screenshots go to $TMPDIR/pds-protos.
const path = require("path"), os = require("os"), fs = require("fs");
const file = process.env.PROTO || path.resolve(__dirname, "..", "distribution.html");
const out = path.join(os.tmpdir(), "pds-protos"); fs.mkdirSync(out, { recursive: true });
const { chromium } = require(process.cwd() + "/node_modules/playwright-core");
process.on("unhandledRejection", e => { console.log(globalThis.__L.join("\n")); console.log(String(e).slice(0,400)); process.exit(1); });
(async () => { const b = await chromium.launch({ channel: "chrome", headless: true }); const p = await b.newPage({ viewport:{width:1440,height:1100} }); p.setDefaultTimeout(8000);
 const errs=[]; p.on("pageerror", e => errs.push(e.message));
 await p.goto("file://" + file + "#start");
 const L=globalThis.__L=[]; const log=(...a)=>{L.push(a.join(" "));};
 const go = async t => { try { await p.locator("button.btn", { hasText: t }).first().click(); } catch(e){ console.log("FAIL click", t, (await p.locator("#app").innerText()).slice(0,1200).replace(/\n/g," / ")); throw e; } };
 const role = r => p.selectOption("#roleSel", r);
 const step = id => p.locator(`.step[data-step="${id}"]`).click();
 const errTxt = async () => (await p.locator(".err, .formmsg").allInnerTexts()).join(" | ");
 const flash = async () => (await p.locator(".flash").count()) ? (await p.locator(".flash").innerText()).replace(/\n/g," / ") : "-";
 const radio = (name,v) => p.locator(`input[name="${name}"][value="${v}"]`).check();
 // 1. Parameters: required values in red only after trying, then filled by choosing.
 log("start:", await p.locator("#dtitle").innerText(), "| now:", await p.locator("section.now").count(), "| status:", await p.locator(".h1row .pill").innerText());
 log("red before trying:", await p.locator(".fact.missing").count());
 await go("Confirmer les paramètres"); log("errors:", await errTxt(), "| red:", await p.locator(".fact.missing").count());
 await p.locator('[data-act="edit"][data-k="listen"]').click(); await radio("ed-on","no"); await go("Enregistrer");
 await p.locator('[data-act="edit"][data-k="pre"]').click(); await p.fill("#ed-date","2026-12-08"); await go("Enregistrer"); log("date after release:", await errTxt());
 await go("Annuler");
 await p.locator('[data-act="edit"][data-k="tier"]').click(); await radio("ed-tier","front"); await go("Enregistrer");
 await go("Confirmer les paramètres"); log("params:", await flash());
 await step("dossier"); log("dossier open while sources missing:", await p.locator('.step[data-step="dossier"] .s').innerText());
 await go("Soumettre la V1"); log("submit blocked by Préparation:", await errTxt());
 // 2. Nadia: her part is elsewhere (Master, Conception).
 await role("ds"); log("ds now:", (await p.locator("section.now").innerText()).replace(/\n/g," / "));
 await go("Proto : le faire dans"); await go("Proto : le faire dans");
 await role("cp"); await step("prep"); await go("Proto : la licence signée revient"); log("prep:", await flash());
 // 3. Dossier: a non-compliant check needs a note and blocks; then V1 submitted.
 await step("dossier");
 await p.locator('[data-act="chk"][data-k="visual"][data-v="non_compliant"]').click(); await go("Enregistrer le contrôle"); log("no note:", await errTxt());
 await p.fill("#chkNote","Pochette en 1:1 attendue en 3000 px"); await go("Enregistrer le contrôle");
 await go("Soumettre la V1"); log("non compliant blocks:", await errTxt());
 await p.locator('[data-act="chkedit"][data-k="visual"]').click();
 for (const k of ["audio","identity","identifiers","rights","visual"]) await p.locator(`[data-act="chk"][data-k="${k}"][data-v="compliant"]`).click();
 log("unchecked said:", await p.locator(".callout.info").last().innerText());
 await go("Soumettre la V1"); log("submit:", await flash());
 // 4. Claire refuses (reason required), Lina changes the parameter, V2 validated.
 await role("dg"); await p.locator("details.vcard summary", { hasText: "Refuser" }).click();
 await p.locator('button[data-act="alt"]').click(); log("no reason:", await errTxt());
 await go("Remplir avec un exemple"); await p.locator('button[data-act="alt"]').click(); log("refused:", await flash());
 await role("cp"); log("ret:", (await p.locator(".callout.ret").innerText()).replace(/\n/g," / "));
 await p.locator('[data-act="edit"][data-k="pre"]').click(); await p.fill("#ed-date","2026-11-21"); await go("Enregistrer");
 await go("Soumettre la V2"); await role("dg"); await go("Valider la V2"); log("validated:", await flash());
 // 5. Deposit declared with proof; The Orchard asks for corrections → V3.
 await role("cp"); await step("deposit"); log("copy buttons:", await p.locator('[data-act="copy"]').count());
 await p.locator('[data-act="proof"]').click(); await go("Déclarer le dépôt"); log("deposit:", await flash());
 await step("orchard"); await go("Enregistrer"); log("nothing ticked:", await errTxt());
 await p.check("#oc-received"); await go("Enregistrer"); log("received:", await flash(), "| track:", (await p.locator(".track").innerText()).replace(/\n/g," / "));
 log("flash next to the form:", await p.locator(".card .flash").count());
 await p.locator("details.vcard summary", { hasText: "demande des corrections" }).click();
 await go("Déclarer les corrections demandées"); log("no corrections text:", await errTxt());
 await go("Remplir avec un exemple"); await go("Déclarer les corrections demandées"); log("corrections:", await flash(), "| sel:", await p.locator("#dtitle").innerText());
 log("drift before fix:", await p.locator(".docchg").innerText());
 await go("Proto : faire la correction"); log("drift after fix:", await p.locator(".docchg").innerText(), "| checks reset:", await p.locator(".dhead .cap").first().innerText());
 for (const c of ["audio","identity","identifiers","rights","visual","calendar"]) await p.locator(`[data-act="chk"][data-k="${c}"][data-v="compliant"]`).click();
 await go("Soumettre la V3"); await role("dg"); await go("Valider la V3"); await role("cp");
 await step("deposit"); await go("Déclarer le dépôt"); await step("orchard");
 log("delivered row disabled:", await p.locator("#oc-delivered").isDisabled());
 await p.check("#oc-received"); await p.check("#oc-accepted"); await p.check("#oc-delivered");
 await p.locator('[data-act="oproofown"][data-k="accepted"]').click();
 log("proof offered to other rows:", (await p.locator(".tell").innerText()).replace(/\n/g," / "));
 await p.locator('[data-act="oproofrm"][data-k="received"]').click();
 await go("Enregistrer"); log("delivered:", await flash(), "| track:", (await p.locator(".track").innerText()).replace(/\n/g," / "));
 await p.locator('[data-act="nodeproof"][data-k="received"]').click(); log("proof added later:", (await p.locator(".track li").nth(1).innerText()).replace(/\n/g," / "));
 // 6. Platforms: detection suggests, a person verifies; Amazon unavailable → anomaly.
 await step("platforms"); log("platforms wait:", await p.locator(".callout.warn").first().innerText());
 await go("Proto : la détection passe");
 await go("Déclarer la disponibilité publique"); log("availability:", (await p.locator(".fact").first().innerText()).replace(/\n/g," / "));
 await go("Ajouter une plateforme"); await go("Ajouter"); log("no name:", await errTxt()); await p.fill("#paddName","Tidal"); await go("Ajouter"); log("extra platform:", await p.locator(".plat", { hasText: "Tidal" }).count());
 log("links filled by detection:", await p.locator(".plat code").count(), "| one-click buttons:", await p.locator('[data-act="pok"]').count());
 for (const k of ["spotify","apple","deezer","youtube"]) await p.locator(`[data-act="pok"][data-k="${k}"]`).click();
 log("verified in one click:", (await p.locator(".plat", { hasText: "Spotify" }).innerText()).replace(/\n/g," / "));
 await p.locator('[data-act="plink"][data-k="amazon"]').click(); await p.fill("#plinkIn","music.amazon.fr"); await go("Enregistrer"); log("bad link:", await errTxt());
 await p.fill("#plinkIn","https://music.amazon.fr/albums/B0DNEONS26"); await p.locator('[data-act="plinksave"]').click();
 await p.locator('[data-act="pver"][data-k="amazon"]').click(); await go("Enregistrer le problème"); log("no problem chosen:", await errTxt()); await radio("pp","unavailable"); await go("Enregistrer le problème"); log("no note:", await errTxt());
 await p.fill("#pnote","Ce titre n'est pas disponible dans votre pays"); await go("Enregistrer le problème");
 log("anomalies:", await p.locator(".fact", { hasText: "Titre indisponible" }).count(), "| spine:", await p.locator('.step[data-step="platforms"] .s').innerText());
 // Anomalies: reported anywhere, with type, gravity, module; a state change needs a reason.
 await p.locator('[data-act="view"][data-v="anomalies"]').first().click();
 await go("Signaler une anomalie"); await go("Signaler"); log("no description:", await errTxt());
 await go("Remplir avec un exemple"); await go("Signaler");
 await p.locator(".fact", { hasText: "Crédit ou ISRC incorrect" }).locator('[data-act="anomedit"]').click();
 await radio("an-st","resolved"); await go("Enregistrer"); log("no reason:", await errTxt());
 await p.fill("#an-why","Corrigé au Catalogue, V3 acceptée par The Orchard"); await go("Enregistrer");
 log("anomalies link:", await p.locator('[data-act="view"][data-v="anomalies"]').count() ? "-" : "-", "| list:", (await p.locator(".card .rows").innerText()).replace(/\n/g," / ").slice(0,260));
 await go("← Parcours");
 // 7. Closure with reserves: arbitration and acknowledgement required; Claire validates.
 await step("closure"); await go("Proposer une clôture avec réserves"); log("closure errors:", await errTxt());
 await go("Remplir avec un exemple"); await go("Proposer une clôture avec réserves"); log("proposed:", await flash());
 await role("dg"); await go("Valider la clôture"); log("closed:", await p.locator(".h1row .pill").innerText(), "|", await p.locator('.step[data-step="closure"] .s').innerText(), "| mark not green:", await p.locator('.step[data-step="closure"].reserve').count());
 await p.screenshot({ path: path.join(out, "distribution-desktop.png"), fullPage: true });
 // Edge case of the ticket (§ 13): the cover changes after the dossier was validated.
 await p.goto("file://" + file + "#orchard"); await p.reload(); await step("dossier");
 await go("Proto : la pochette change"); log("drift:", await flash(), "| spine:", await p.locator('.step[data-step="dossier"] .s').innerText());
 log("drift line:", await p.locator(".docchg").first().innerText());
 await go("Préparer la V2"); log("v2:", await flash(), "| change:", await p.locator(".docchg").first().innerText());
 // 8. Mobile, dark.
 const m = await b.newPage({ viewport:{width:390,height:844}, colorScheme:"dark" }); m.on("pageerror", e => errs.push(e.message));
 for (const sc of ["start","review","online","closing"]) { await m.goto("file://" + file + "#" + sc); await m.reload(); log("mobile", sc, "scrollWidth:", await m.evaluate(() => document.documentElement.scrollWidth)); }
 await m.screenshot({ path: path.join(out, "distribution-mobile.png"), fullPage: true });
 console.log(L.join("\n")); console.log("errors:", errs); await b.close();
})();
