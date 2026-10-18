// Run from the repository root: node docs/protos/tests/marketing.cjs
// Screenshots go to $TMPDIR/pds-protos (never into docs/).
const path = require("path"), os = require("os"), fs = require("fs");
const html = path.resolve(__dirname, "..");
const out = path.join(os.tmpdir(), "pds-protos"); fs.mkdirSync(out, { recursive: true });
const { chromium } = require(process.cwd() + "/node_modules/playwright-core");
(async () => { const b = await chromium.launch({ channel: "chrome", headless: true }); const p = await b.newPage({ viewport:{width:1440,height:1100} }); p.setDefaultTimeout(8000);
 const errs=[]; p.on("pageerror", e => errs.push(e.message));
 await p.goto("file://" + html + "/marketing.html");
 const L=[]; const log=(...a)=>{L.push(a.join(" "));};
 log("opens on:", await p.locator("#scenSel").inputValue(), "|", (await p.locator('.step[data-step="st1"] .t').innerText()));
 await p.selectOption("#scenSel", "strat");
 const go = async t => { try { await p.locator("button.btn:visible", { hasText: t }).first().click(); } catch(e){ console.log("FAIL click", t, (await p.locator("#app").innerText()).slice(0,700).replace(/\n/g," / ")); throw e; } };
 const act = sel => p.locator(sel).first().click();
 const role = r => p.selectOption("#roleSel", r);
 const step = id => p.locator(`.step[data-step="${id}"]`).click();
 const mod = m => p.locator(`.chev[data-v="${m}"]`).click();
 const errTxt = async () => (await p.locator(".err").allInnerTexts()).filter(Boolean).join(" | ");
 const sub = async id => (await p.locator(`.step[data-step="${id}"] .s`).innerText()).replace(/\n/g," ");
 const itm = (id, v) => act(`[data-act="itm"][data-v="${v}"][data-id="${id}"]`);
 // 0. Transverse: breadcrumb, no violet
 log("crumbs:", await p.locator(".crumbs").innerText(), "| accent token:", await p.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--act-fg").trim()));
 // 1. Stratégie: proposals confirmed one by one, corrected, set aside, completed
 log("st2 start:", await sub("st2"), "| pre-checked:", await p.locator('#app input[type="checkbox"]:checked').count());
 for (const i of [0,2,3,4,5,6,7,8]) await itm("sp"+i, "keep");
 await act('[data-act="form"][data-v="edit:sp1"]'); await p.fill("#ie-sp1", "Cœur de cible : 18–25 ans, R&B alternatif et pop urbaine"); await p.press("#ie-sp1", "Enter");
 await itm("sp9", "discard"); log("kpi dim:", (await p.locator("summary", { hasText: "Objectifs & KPIs" }).innerText()).replace(/\n/g," "));
 await go("Ajouter un objectif"); await act('[data-act="itmadd"]'); log("empty add:", await errTxt());
 await p.fill("#ad-text", "150 000 streams à 4 semaines"); await act('[data-act="itmadd"]');
 await act('[data-act="lever"][data-k="pub"][data-v="non"]'); await act('[data-act="lever"][data-k="live"][data-v="retenu"]');
 log("st2 done:", await sub("st2"));
 await step("st3"); log("brief blocks:", (await p.locator(".doc h4").allInnerTexts()).join(" / ")); await go("Envoyer en validation");
 await go("Relancer Nadia Benali"); log("relance:", await p.locator(".irow", { hasText: "Relancée" }).count());
 await role("dg"); await go("Valider le Brief de sortie"); await role("da"); await go("Valider le Brief de sortie");
 await role("cp"); await step("st4"); log("st4:", await sub("st4"), "| docs:", (await p.locator(".irow b", { hasText: /Brief|Plan de sortie|Dossier/ }).allInnerTexts()).join(", "));
 // 2. Activations: levers proposed, created by a person
 await mod("activations"); log("levers:", (await p.locator("details.levers summary b").innerText()));
 await p.selectOption("#apm-1", "Agence externe"); await act('[data-act="apcreate"][data-i="1"]'); await act('[data-act="aplater"][data-i="0"]');
 log("created:", (await p.locator(".spine .step .t").allInnerTexts()).join(" · "));
 // Influence given to an agency: its Google Sheets read, columns mapped, refreshed with a preview
 await p.locator(".spine .step", { hasText: "Influence" }).click(); await act('[data-act="aglink"]'); log("bad sheet:", await errTxt());
 await act('[data-act="agsample"]'); await act('[data-act="aglink"]'); await p.selectOption("#agM-1", "ignore"); await act('[data-act="agmap"]'); log("no key column:", await errTxt());
 await p.selectOption("#agM-1", "handle"); await act('[data-act="agmap"]'); await act('[data-act="agrefresh"]');
 log("first refresh:", (await p.locator(".card b", { hasText: /ligne/ }).allInnerTexts()).join(" / ")); await act('[data-act="agimport"]');
 log("profiles:", await p.locator(".agcard").count(), "| next:", await sub(await p.locator(".spine .step", { hasText: "Influence" }).getAttribute("data-step")));
 // 3. Conception, after Ibé's ticket
 await mod("design"); log("de0:", await sub("de0"));
 await go("Désigner"); await act('[data-act="depath"][data-v="call"]'); log("creative call agenda:", (await p.locator(".agrow .grow").allInnerTexts()).join(" / "));
 await p.fill("#pcDate", "2026-10-09"); await p.fill("#pcHour", "10:00"); await act('[data-act="prepcreate"]'); await act('[data-act="prepconfirm"]'); log("call planned:", await p.locator(".kv", { hasText: "Échange prévu" }).count());
 await act('[data-act="prepheld"]'); log("de0 done:", await sub("de0"));
 await role("da"); await step("de1");
 while (await p.locator('[data-act="itm"][data-v="keep"]').count()) await act('[data-act="itm"][data-v="keep"]');
 log("de1:", await sub("de1"));
 await step("deR"); log("refs:", await p.locator(".ref").count(), "| deR:", await sub("deR"));
 await act('[data-act="form"][data-v="rl:rref6"]'); await p.check("#rg-rref6-1"); await act('[data-act="reflink"][data-id="rref6"]');
 await go("Ajouter une référence"); await act('[data-act="radd"]'); log("ref no title:", await errTxt());
 await p.fill("#rTitle", "Essai lumière, portrait"); await p.fill("#rLink", "https://drive.google.com/essai-lumiere"); await act('[data-act="radd"]');
 log("deR done:", await sub("deR"));
 await step("de2"); await go("Soumettre à Claire Morel"); await role("dg"); await go("Refuser"); log("refuse no reason:", await errTxt());
 await go("Valider la direction"); await role("da"); await step("deR"); log("refs validated:", await p.locator(".ref .pill", { hasText: "Validée" }).count());
 await step("deB"); await go("Établir le Brief créatif V1");
 await step("de3"); log("fiches before resp:", await sub("de3"));
 await role("cp"); for (const k of ["clip","teasers","pochette"]) await act(`[data-act="frset"][data-k="${k}"]`);
 await role("da"); await step("de3");
 await act('[data-act="form"][data-v="fe:clip:8"]'); await p.fill("#fe-clip-8", "2026-10-20"); await p.press("#fe-clip-8", "Enter"); log("date order:", await errTxt());
 await p.fill("#fe-clip-8", "2026-10-27"); await p.press("#fe-clip-8", "Enter"); log("date ok:", (await p.locator(".irow", { hasText: "Mar. 27/10/2026" }).innerText()).replace(/\n/g," | "));
 await act('[data-act="fsubmit"][data-k="clip"]'); log("clip missing:", await errTxt());
 await act('[data-act="form"][data-v="fe:clip:4"]'); await p.selectOption("#fe-clip-4", "Oui, intégrés aux exports"); await act('[data-act="ffsave"][data-k="clip"][data-i="4"]');
 for (const k of ["clip","teasers","pochette"]) await act(`[data-act="fsubmit"][data-k="${k}"]`);
 log("series rows:", await p.locator(".irow", { hasText: "Teaser 3" }).count());
 await role("dg"); for (const k of ["clip","teasers","pochette"]) await act(`[data-act="fdecide"][data-k="${k}"][data-v="approved"]`);
 await role("cp"); await act('[data-act="ftransfer"][data-k="pochette"]'); log("transferred alone:", await sub("de3"));
 for (const k of ["clip","teasers"]) await act(`[data-act="ftransfer"][data-k="${k}"]`);
 // 4. Production per livrable: who produces, then the cover (internal)
 await mod("production"); log("picker:", (await p.locator(".pickbar button").allInnerTexts()).map(x=>x.replace(/\n/g," ")).join(" || "));
 log("pq choices:", (await p.locator(".opt").allInnerTexts()).map(x=>x.split("\n")[0]).join(" / ")); await act('[data-act="pqset"]'); log("no organisation:", await errTxt());
 await p.check('input[name="pqOrg"][value="call"]'); await act('[data-act="pqset"]');
 await act('[data-act="prodliv"][data-v="pochette"]'); log("cover asks organisation:", await p.locator('input[name="pqOrg"]').count()); await act('[data-act="pqset"]');
 await role("da"); await act('[data-act="prodliv"][data-v="pochette"]'); await act('[data-act="cvsample"]');
 await role("dg"); await act('[data-act="prodliv"][data-v="pochette"]'); await go("Demander des modifications"); log("cover no reason:", await errTxt()); await go("Valider la V1");
 await role("charge"); await act('[data-act="prodliv"][data-v="pochette"]'); await step("lc-pochette");
 log("cover checks:", (await p.locator(".irow", { hasText: /px|JPG|Carré/ }).allInnerTexts()).map(x=>x.replace(/\n/g," ")).join(" || "));
 await go("Confirmer : fichiers conformes"); log("unchecked:", await errTxt());
 await p.check("#lc-0"); await p.check("#lc-1"); await go("Confirmer : fichiers conformes");
 await role("cp"); await act('[data-act="prodliv"][data-v="pochette"]'); await step("ld-pochette"); await go("Confirmer la livraison");
 log("cover:", await sub("ld-pochette"), "| crumbs:", await p.locator(".crumbs").innerText());
 await act('[data-act="prodliv"][data-v="clip"]'); log("clip kickoff:", await sub("kickoff"), "|", await p.locator('.step[data-step="kickoff"] .t').innerText());
 await step("kickoff"); log("call agenda:", (await p.locator(".irow", { hasText: /^\d\./ }).allInnerTexts()).map(x=>x.split("\n")[0]).join(" / "));
 await act('[data-act="prepcreate"]'); log("call no date:", await errTxt()); await p.fill("#pcDate", "2026-10-15"); await p.fill("#pcHour", "14:00"); await act('[data-act="prepcreate"]'); await act('[data-act=\"prepconfirm\"]');
 await act('[data-act="prepheld"]'); log("call proposals:", await p.locator('[data-act="itm"][data-v="keep"]').count(), "|", await sub("kickoff"));
 await p.screenshot({ path: out + "/mk-production.png", fullPage: true });
 // 5. Activations, a week after the clip
 await p.selectOption("#scenSel", "acts");
 const infl = await p.locator(".spine .step", { hasText: "Influence" }).getAttribute("data-step");
 await role("cp"); await step(infl); log("collabs:", (await p.locator("summary", { hasText: "@" }).allInnerTexts()).map(x=>x.replace(/\n/g," ")).join(" || "));
 await role("lea"); await act('[data-act="cinvoice"]'); log("invoice empty:", await errTxt()); await p.fill("#crInv", "Facture_Neons.pdf"); await act('[data-act="cinvoice"]');
 await role("dg"); await step(infl); await act('[data-act="cpay"][data-k="lea"]'); log("lea pay:", await p.getByText("Bon à payer · 950 € HT").count());
 await role("dg"); await step(infl); log("computed proof:", (await p.locator("details.infos").first().evaluate(e=>e.textContent)).match(/\d+ publications? vérifiées? sur \d+ créateurs? engagés?/)[0]);
 await role("cp"); await step(infl); await p.fill("#sV", "312000"); await p.fill("#sPer", "du 12/12 au 19/12"); await go("Enregistrer le relevé"); await go("Clôturer l'activation"); log("influence:", await sub(infl));
 // 5 bis. Press relations given to an agency: refresh with a preview, report kept with reserves
 await p.selectOption("#scenSel", "acts"); await p.locator(".spine .step", { hasText: "Relations presse" }).click();
 await act('[data-act="agrefresh"]'); await act('[data-act="agimport"]'); log("rp gap:", await p.locator(".agcard .warnc", { hasText: "pas encore décidé" }).count());
 await act('[data-act="agreport"][data-v="prov"]'); log("rp report:", (await p.locator(".kv", { hasText: "Validé provisoirement" }).count()));
 await p.selectOption("#scenSel", "rpint"); await act('[data-act="ropp"][data-v="done"]'); log("rp interview:", (await p.locator(".pill", { hasText: "Interview réalisée" }).count()));
 // 6. Suivi & bilan: Doublon, closure, reopening
 await p.selectOption("#scenSel", "bilan");
 await p.fill("#bSum", "Objectif dépassé sur les vues ; la presse a moins suivi."); await go("Générer la version 1"); await go("Soumettre à Claire Morel");
 await role("dg"); await go("Approuver le bilan provisoire");
 await role("cp"); await step("bi2"); const ids = await p.locator('[data-act="rarb"]').evaluateAll(x=>x.map(e=>e.dataset.id)); log("reserves:", ids.length);
 await p.selectOption(`#ra-${ids[0]}`, "dup"); await act(`[data-act="rarb"][data-id="${ids[0]}"]`);
 for (const i of ids.slice(1)) { await p.selectOption(`#ra-${i}`, "follow"); await act(`[data-act="rarb"][data-id="${i}"]`); }
 log("bi2:", await sub("bi2"));
 await step("bi3"); await go("Demander la clôture"); await role("dg"); await go("Clôturer avec réserves");
 await go("Rouvrir le Marketing"); log("reopen no reason:", await errTxt()); await p.fill("#cReopen", "Retombées presse arrivées après la clôture"); await go("Rouvrir le Marketing");
 log("reopened:", (await p.locator(".note", { hasText: "Rouvert" }).first().innerText()));
 await p.setViewportSize({ width: 390, height: 900 }); for (const k of ["strat","design","quote","acts","agency","rpint","bilan"]) { await p.selectOption("#scenSel", k); log("mobile", k + ":", await p.evaluate(() => document.documentElement.scrollWidth)); }
 await p.emulateMedia({ colorScheme: "dark" }); await p.setViewportSize({ width: 1440, height: 1100 }); await p.selectOption("#scenSel", "design"); await p.screenshot({ path: out + "/mk-dark.png" });
 console.log(L.join("\n")); console.log("errors:", errs); await b.close(); })().catch(e=>{console.error("FAIL", e.message.split("\n")[0]); process.exit(1);});
