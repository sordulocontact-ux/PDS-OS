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
 const go = async t => { try { await p.locator("button.btn", { hasText: t }).first().click(); } catch(e){ console.log("FAIL click", t, (await p.locator("#app").innerText()).slice(0,1500).replace(/\n/g," / ")); throw e; } };
 const role = r => p.selectOption("#roleSel", r);
 const step = id => p.locator(`.step[data-step="${id}"]`).click();
 const errTxt = async () => (await p.locator(".err, .formmsg").allInnerTexts()).join(" | ").replace(/\n/g," / ");
 const flash = async () => (await p.locator(".flash").count()) ? (await p.locator(".flash").innerText()).replace(/\n/g," / ") : "-";
 const radio = (name,v) => p.locator(`input[name="${name}"][value="${v}"]`).check();
 const chk = (k,v="compliant") => p.locator(`[data-act="chk"][data-k="${k}"][data-v="${v}"]`).click();
 const pill = async () => p.locator(".h1row .pill").innerText();
 const open = t => p.locator("details.vcard summary", { hasText: t }).first().click();
 // 1. Parameters: required values in red only after trying, then filled by choosing.
 log("start:", await p.locator("#dtitle").innerText(), "| now:", await p.locator("section.now").count(), "| status:", await pill());
 log("red before trying:", await p.locator(".fact.missing").count());
 await go("Confirmer les paramètres"); log("errors:", await errTxt(), "| red:", await p.locator(".fact.missing").count());
 await p.locator('[data-act="edit"][data-k="listen"]').click(); await radio("ed-on","no"); await go("Enregistrer");
 await p.locator('[data-act="edit"][data-k="pre"]').click(); await p.fill("#ed-date","2026-12-08"); await go("Enregistrer"); log("date after release:", await errTxt());
 await go("Annuler");
 await p.locator('[data-act="edit"][data-k="tier"]').click(); await radio("ed-tier","front"); await go("Enregistrer");
 await go("Confirmer les paramètres"); log("params:", await flash());
 await step("dossier"); await go("Soumettre la V1"); log("submit blocked by Préparation:", await errTxt());
 // 2. Nadia: her part is elsewhere (Master, Conception).
 await role("ds"); await go("Proto : le faire dans"); await go("Proto : le faire dans");
 await role("cp"); await step("prep"); await go("Proto : la licence signée revient"); log("prep:", await flash());
 // 3. DIST-001 case A: no check recorded → no submission; each missing check in red, counted.
 await step("dossier"); log("before trying, info only:", await p.locator(".callout.info", { hasText: "encore à enregistrer" }).count(), "| red:", await p.locator(".formmsg").count());
 await go("Soumettre la V1"); log("A · 0/6:", await p.locator(".formmsg").innerText().then(t=>t.replace(/\n/g," / ")), "| red rows:", await p.locator(".fact.missing").count(), "| focused:", await p.evaluate(()=>document.activeElement&&document.activeElement.dataset.k));
 // A non-compliant check needs a note and is never waived.
 await chk("visual","non_compliant"); await go("Enregistrer le contrôle"); log("no note:", await errTxt());
 await p.fill("#chkNote","Pochette en 1:1 attendue en 3000 px"); await go("Enregistrer le contrôle");
 await go("Soumettre la V1"); log("non compliant:", await errTxt(), "| derogation offered:", await p.locator("summary", { hasText: "Demander une dérogation" }).count());
 await p.locator('[data-act="chkedit"][data-k="visual"]').click();
 for (const k of ["audio","identity","identifiers","visual","calendar"]) await chk(k);
 log("value and source shown:", (await p.locator(".fact", { hasText: "Identifiants et crédits" }).innerText()).replace(/\n/g," / ").slice(0,220));
 // 4. Derogation: asked by Lina for the one unchecked control, granted by the DG alone.
 await go("Soumettre la V1"); log("1 left:", await errTxt());
 await open("Demander une dérogation"); await go("Demander la dérogation"); log("derogation empty:", await errTxt());
 await go("Remplir avec un exemple"); await go("Demander la dérogation"); log("asked:", await flash());
 await role("ds"); log("ds cannot grant:", await p.locator('[data-act="derogok"]').count());
 await role("dg"); log("dg now:", (await p.locator("section.now h2").count()) ? await p.locator("section.now h2").innerText() : "(on the step) "+await p.locator("#dtitle").innerText());
 await open("Refuser la dérogation"); await go("Refuser la dérogation"); log("refuse without reason:", await errTxt());
 await go("Accorder la dérogation"); log("granted:", await flash());
 await role("cp"); await step("dossier"); await go("Soumettre la V1"); log("submit with derogation:", await flash());
 // 5. DIST-001 case B: Claire refuses on the presale; the V2 is held until it changes.
 await role("dg"); log("validator sees derogation:", await p.locator(".docchg", { hasText: "Dérogation de Claire Morel" }).count());
 await open("Refuser"); await p.locator('button[data-act="alt"]').click(); log("refuse empty:", await errTxt());
 await p.locator('button[data-act="altex"]').click(); await p.locator('button[data-act="alt"]').click(); log("refused:", await flash());
 await role("cp"); log("ret:", (await p.locator(".callout.ret").innerText()).replace(/\n/g," / "));
 log("checks carried, with their version:", await p.locator(".dhead .cap").first().innerText(), "|", (await p.locator(".vers .fact", { hasText: "Le master final référencé" }).first().innerText()).match(/sur la V\d[^\n]*/)[0]);
 await go("Soumettre la V2"); log("B · presale unchanged:", await errTxt());
 await chk("rights");
 await go("Soumettre la V2"); log("B · rights done, still held:", await errTxt());
 await p.locator('[data-act="edit"][data-k="pre"]').click(); await p.fill("#ed-date","2026-11-21"); await go("Enregistrer");
 log("only calendar reopened:", await p.locator(".dhead .cap").first().innerText(), "|", (await p.locator(".vers .fact", { hasText: "Calendrier et paramètres" }).first().innerText()).match(/À refaire[^/\n]*/)[0]);
 log("diff V1→V2:", await p.locator(".docchg").first().innerText());
 await go("Soumettre la V2"); log("calendar to redo:", await errTxt());
 await chk("calendar"); await go("Soumettre la V2"); log("V2 submitted:", await flash());
 await role("dg"); await go("Valider la V2"); log("validated:", await flash());
 await open("Versions précédentes"); await open("Voir la V1 telle que soumise"); log("V1 snapshot rows:", await p.locator("details.snap .fact").count(), "| V1 presale:", (await p.locator("details.snap .fact", { hasText: "Précommande" }).first().innerText()).replace(/\n/g," "));
 // 6. Deposit declared with its source; a date in the future is refused.
 await role("cp"); await step("deposit"); log("copy buttons:", await p.locator('[data-act="copy"]').count());
 await p.fill("#dd-date","2026-12-30"); await go("Déclarer le dépôt"); log("future date:", await errTxt());
 await p.fill("#dd-date","2026-10-19"); await p.selectOption("#dd-src","Portail The Orchard"); await p.locator('[data-act="proof"]').click(); await go("Déclarer le dépôt"); log("deposit:", await flash());
 await step("orchard"); await go("Enregistrer"); log("nothing ticked:", await errTxt());
 await p.check("#oc-received"); await p.fill("#od-received","2026-10-12"); await go("Enregistrer"); log("received before deposit:", await errTxt());
 await p.fill("#od-received","2026-10-19"); await p.selectOption("#os-received","E-mail de The Orchard"); await go("Enregistrer"); log("received:", (await p.locator(".track").innerText()).replace(/\n/g," / "));
 // DIST-004: the last declaration can be withdrawn, with a reason kept in the history.
 await p.locator('[data-act="drm"][data-k="received"]').click(); await go("Retirer la déclaration"); log("withdraw without reason:", await errTxt());
 await p.fill("#rmNote","C'était l'accusé du portail, pas la réception."); await go("Retirer la déclaration"); log("withdrawn:", await flash(), "| track:", (await p.locator(".track li").nth(1).innerText()).replace(/\n/g," / "));
 await p.check("#oc-received"); await go("Enregistrer");
 // 7. DIST-001 case C: The Orchard asks for corrections; the V3 is held until the source is fixed.
 await open("demande des corrections");
 await go("Déclarer les corrections demandées"); log("no corrections text:", await errTxt());
 await go("Remplir avec un exemple"); await go("Déclarer les corrections demandées"); log("corrections:", await flash(), "| sel:", await p.locator("#dtitle").innerText());
 log("drift before fix:", await p.locator(".docchg").first().innerText(), "| checks:", await p.locator(".dhead .cap").first().innerText());
 await go("Soumettre la V3"); log("C · not fixed:", await errTxt());
 await go("Proto : faire la correction dans Catalogue"); log("after fix:", await p.locator(".docchg").first().innerText());
 await chk("identifiers"); await go("Soumettre la V3"); log("V3 submitted:", await flash());
 await role("dg"); await go("Valider la V3"); await role("cp");
 await step("deposit"); await go("Déclarer le dépôt"); await step("orchard");
 await p.check("#oc-received"); await p.check("#oc-accepted"); await p.check("#oc-delivered");
 await p.locator('[data-act="oproofown"][data-k="accepted"]').click(); await go("Enregistrer"); log("delivered:", await flash());
 // 8. Platforms: a person checks each one, with a capture, a date and a territory.
 await step("platforms"); await go("Proto : la détection passe");
 await go("Déclarer la disponibilité publique");
 await p.locator('[data-act="pver"][data-v="ok"][data-k="spotify"]').click(); await go("Enregistrer : disponible et conforme"); log("no capture:", await errTxt());
 await p.locator('[data-act="pcap"]').click(); await go("Enregistrer : disponible et conforme");
 log("verified with proof:", (await p.locator(".plat", { hasText: "Spotify" }).innerText()).replace(/\n/g," / "));
 for (const k of ["apple","deezer"]) { await p.locator(`[data-act="pver"][data-v="ok"][data-k="${k}"]`).click(); await p.locator('[data-act="pcap"]').click(); await go("Enregistrer : disponible et conforme"); }
 // A platform that is there but differs is not counted as verified.
 await p.locator('[data-act="pver"][data-v="pb"][data-k="youtube"]').click(); await radio("pp","non_compliant"); await p.fill("#pnote","La pochette affichée est l'ancienne."); await go("Enregistrer le problème");
 log("non compliant not counted:", (await p.locator(".fact").first().innerText()).replace(/\n/g," / "));
 await p.locator('[data-act="plink"][data-k="amazon"]').click(); await p.fill("#plinkIn","https://music.amazon.fr/albums/B0DNEONS26"); await p.locator('[data-act="plinksave"]').click();
 await p.locator('[data-act="pver"][data-v="pb"][data-k="amazon"]').click(); await radio("pp","unavailable"); await p.fill("#pnote","Ce titre n'est pas disponible dans votre pays");
 await go("Enregistrer le problème"); log("unavailable needs follow-up:", await errTxt());
 await p.selectOption("#pcause","Pas encore livrée par The Orchard"); await p.fill("#paction","Relancer The Orchard pour une nouvelle livraison"); await p.fill("#pdue","2026-10-26"); await go("Enregistrer le problème");
 log("unavailable row:", (await p.locator(".plat", { hasText: "Amazon Music" }).innerText()).replace(/\n/g," / "));
 // Anomalies: a state change needs a reason.
 await p.locator('[data-act="view"][data-v="anomalies"]').first().click();
 await p.locator(".fact", { hasText: "Crédit ou ISRC incorrect" }).locator('[data-act="anomedit"]').click();
 await radio("an-st","resolved"); await p.fill("#an-why","Corrigé au Catalogue, V3 acceptée par The Orchard"); await go("Enregistrer");
 await go("← Parcours");
 // 9. Closure with reserves: each has an owner, a date, the proof that lifts it.
 await step("closure"); log("reserve fields:", await p.locator('[id^="ro-"]').count());
 await go("Proposer une clôture avec réserves"); log("closure errors:", await errTxt());
 await go("Remplir avec un exemple"); await go("Proposer une clôture avec réserves"); log("proposed:", await flash());
 await role("dg"); await go("Valider la clôture"); log("closed:", await pill(), "|", await p.locator('.step[data-step="closure"] .s').innerText());
 // DIST-007: lifting needs a proof and a check by someone else; a late reserve alerts.
 await role("cp"); await step("closure");
 await p.locator('[data-act="rlift"]').first().click(); await go("Lever la réserve"); log("lift empty:", await errTxt());
 await p.locator('[data-act="rlproof"]').click(); await p.fill("#rlNote","Relivré par The Orchard le 26/10, vérifié depuis la France."); await go("Lever la réserve");
 log("lifter cannot check:", await p.locator('[data-act="rctrl"]').count());
 await role("dg"); log("dg now:", await p.locator("section.now h2").count() ? await p.locator("section.now h2").innerText() : "-");
 await step("closure"); await p.locator('[data-act="rctrl"]').first().click(); await go("Confirmer la levée"); log("controlled:", (await p.locator(".rows .fact").first().innerText()).replace(/\n/g," / ").slice(0,200));
 await go("Proto : trois semaines plus tard"); log("late:", await p.locator(".pill.bad", { hasText: "Échue" }).count(), "| dg now:", await p.locator("section.now h2").count() ? await p.locator("section.now h2").innerText() : "(on the step)");
 await p.locator('[data-act="rdue"]').first().click(); await go("Reporter"); log("postpone without reason:", await errTxt());
 log("header still not green:", await pill());
 await p.screenshot({ path: path.join(out, "distribution-desktop.png"), fullPage: true });
 // 10. DIST-003: before The Orchard accepts, no closure with reserves; only the DG can stop.
 await p.goto("file://" + file + "#orchard"); await p.reload(); await step("closure");
 log("before acceptance (cp):", (await p.locator("#app .card").last().innerText()).match(/La clôture se propose[^.]*/)[0], "| stop offered:", await p.locator("summary", { hasText: "Arrêter le suivi" }).count());
 await role("dg"); await step("closure"); await open("Arrêter le suivi"); await go("Confirmer la décision"); log("stop empty:", await errTxt());
 await radio("stopKind","cancelled"); await p.fill("#stopWhy","Mona Lys retire le single : la sortie est reportée sans date."); await go("Confirmer la décision");
 log("cancelled:", await pill(), "|", await p.locator('.step[data-step="closure"] .s').innerText());
 // Bonus: a normal closure proposed, then an anomaly: the DG's decision checks again.
 await p.goto("file://" + file + "#closing"); await p.reload(); await step("platforms");
 await p.locator('[data-act="plink"][data-k="amazon"]').click(); await p.fill("#plinkIn","https://music.amazon.fr/albums/B0DNEONS26"); await p.locator('[data-act="plinksave"]').click();
 await p.locator('[data-act="pver"][data-v="ok"][data-k="amazon"]').click(); await p.locator('[data-act="pcap"]').click(); await go("Enregistrer : disponible et conforme");
 log("DIST-002 text:", (await p.locator(".fact").first().innerText()).replace(/\n/g," / "));
 await step("closure"); await go("Proposer une clôture normale");
 await p.locator('[data-act="view"][data-v="anomalies"]').first().click(); await go("Signaler une anomalie"); await go("Remplir avec un exemple"); await go("Signaler"); await go("← Parcours");
 await role("dg"); await go("Valider la clôture"); log("normal closure rechecked:", await errTxt());
 // Edge case of the ticket (§ 13): the cover changes after the dossier was validated; only Visuel reopens.
 await p.goto("file://" + file + "#orchard"); await p.reload(); await step("dossier");
 await go("Proto : la pochette change"); log("drift:", await flash());
 await go("Préparer la V2"); log("v2:", await flash(), "| change:", await p.locator(".docchg").first().innerText(), "| checks:", await p.locator(".dhead .cap").first().innerText());
 // 11. Mobile, dark.
 const m = await b.newPage({ viewport:{width:390,height:844}, colorScheme:"dark" }); m.on("pageerror", e => errs.push(e.message));
 for (const sc of ["start","review","online","closing"]) { await m.goto("file://" + file + "#" + sc); await m.reload(); log("mobile", sc, "scrollWidth:", await m.evaluate(() => document.documentElement.scrollWidth)); }
 await m.goto("file://" + file + "#closing"); await m.reload(); await m.locator('.step[data-step="platforms"]').click(); await m.locator('[data-act="pver"][data-v="pb"][data-k="spotify"]').click().catch(async()=>{await m.locator('[data-act="rechk"][data-k="spotify"]').click();await m.locator('[data-act="pver"][data-v="pb"][data-k="spotify"]').click();}); await m.locator('input[name="pp"][value="unavailable"]').check(); log("mobile form scrollWidth:", await m.evaluate(() => document.documentElement.scrollWidth));
 await m.screenshot({ path: path.join(out, "distribution-mobile.png"), fullPage: true });
 console.log(L.join("\n")); console.log("errors:", errs); await b.close();
})();
