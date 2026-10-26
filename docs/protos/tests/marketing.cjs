// Run from the repository root: node docs/protos/tests/marketing.cjs
// Screenshots go to $TMPDIR/pds-protos (never into docs/).
const path = require("path"), os = require("os"), fs = require("fs");
const html = path.resolve(__dirname, "..");
const out = path.join(os.tmpdir(), "pds-protos"); fs.mkdirSync(out, { recursive: true });
const { chromium } = require(process.cwd() + "/node_modules/playwright-core");
(async () => { const b = await chromium.launch({ channel: "chrome", headless: true }); const p = await b.newPage({ viewport:{width:1440,height:1100} }); p.setDefaultTimeout(8000);
 const errs=[]; p.on("pageerror", e => errs.push(e.message));
 await p.goto("file://" + html + "/marketing.html");
 const L=globalThis.__L=[]; const log=(...a)=>{L.push(a.join(" "));};
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
 await p.fill("#ad-text", "150 000 streams à 4 semaines"); await act('[data-act="itmadd"]'); log("objective without target:", await errTxt());
 await p.fill("#ad-target", "150 000"); await act('[data-act="itmadd"]'); log("objective line:", await p.locator(".irow .cap", { hasText: "cible 150 000" }).first().textContent());
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
 await role("lea"); await act('[data-act="cinvoice"]'); log("invoice empty:", await errTxt()); await act('[data-act="crinvsample"]'); await act('[data-act="cinvoice"]');
 await role("dg"); await step(infl); await act('[data-act="cpay"][data-k="lea"]'); log("lea pay:", await p.getByText("Bon à payer · 950 € HT").count());
 await role("dg"); await step(infl); log("computed proof:", (await p.locator("details.infos").first().evaluate(e=>e.textContent)).match(/\d+ publications? vérifiées? sur \d+ créateurs? engagés?/)[0]);
 await role("cp"); await step(infl); await p.fill("#sV", "312000"); await p.fill("#sPer", "du 12/12 au 19/12"); await go("Enregistrer le relevé"); await go("Clôturer l'activation"); log("influence:", await sub(infl), "| INF-001 close refused:", await errTxt(), "| matrix:", await p.locator(".vers h3", { hasText: "Chaque créateur" }).count());
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
 log("na offered for open activations:", (await Promise.all(ids.map(i=>p.locator(`#ra-${i} option[value="na"]`).count()))).join(","));
 const naId = (await Promise.all(ids.map(async i=>[i, await p.locator(`#ra-${i} option[value="na"]`).count()]))).find(x=>x[1])?.[0];
 if (naId) { await p.selectOption(`#ra-${naId}`, "na"); await act(`[data-act="rarb"][data-id="${naId}"]`); log("na without reason:", await errTxt()); await p.fill(`#ry-${naId}`, "Déjà couvert par le bilan de l'agence"); await act(`[data-act="rarb"][data-id="${naId}"]`); }
 for (const i of ids.filter(x=>x!==naId)) { await p.selectOption(`#ra-${i}`, "follow"); await act(`[data-act="rarb"][data-id="${i}"]`); log("follow without channel:", await errTxt()); await p.selectOption(`#rc-${i}`, "Tâche dans Travail"); await act(`[data-act="rarb"][data-id="${i}"]`); }
 log("bi2:", await sub("bi2"));
 await step("bi3"); await go("Demander la clôture"); await role("dg"); await go("Clôturer avec réserves");
 await go("Rouvrir le Marketing"); log("reopen no reason:", await errTxt()); await p.fill("#cReopen", "Retombées presse arrivées après la clôture"); await go("Rouvrir le Marketing");
 log("reopened:", (await p.locator(".note", { hasText: "Rouvert" }).first().innerText()));
 // 8. Ibé's review of 23/10
 const toastTxt = async () => (await p.locator("#toast").innerText());
 const hasErr = async () => errTxt();
 // CONC-001: an empty date looks empty; the call keeps its date when a participant is removed
 await p.selectOption("#scenSel", "designstart"); await go("Désigner"); await act('[data-act="depath"][data-v="call"]');
 log("CONC empty date marked:", await p.locator("#pcDate.empty").count(), await p.locator("#pcHour.empty").count());
 await p.fill("#pcDate", "2026-10-23"); await p.fill("#pcHour", "12:30"); await act('[data-act="prepwhodel"]');
 log("CONC kept after removing a participant:", await p.inputValue("#pcDate"), await p.inputValue("#pcHour"));
 // PROD-001: organisation required, error visible, choices kept, focus on the field
 await p.selectOption("#scenSel", "prodstart"); await p.locator('input[name="pqCo"]').nth(1).check(); await act('[data-act="pqset"]');
 log("PROD-001:", (await p.locator(".formmsg").innerText()).slice(0,70), "| company kept:", await p.locator('input[name="pqCo"]').nth(1).isChecked(), "| focus:", await p.evaluate(()=>document.activeElement.name), "| legend:", await p.locator(".orgset legend").innerText());
 // Stratégie: four states, with their reason
 await p.selectOption("#scenSel", "strat"); for (const i of [0,1,2,3,4,5,6,7,8,9]) { const b = p.locator(`[data-act="itm"][data-v="keep"][data-id="sp${i}"]`); if (await b.count()) await b.click(); }
 await act('[data-act="lever"][data-k="pub"][data-v="non"]'); await act('[data-act="lever"][data-k="live"][data-v="retenu"]');
 await p.locator("summary", { hasText: "Livrables engagés" }).click(); await act('[data-act="form"][data-v="add:strat:Livrables engagés"]'); await p.fill("#ad-text", "Session acoustique"); await act('[data-act="itmadd"]');
 log("STR states:", (await p.locator("summary", { hasText: "Livrables engagés" }).innerText()).replace(/\n/g," "), "|", await p.locator(".note b", { hasText: "complétées" }).innerText());
 // Activations: a single selection, a filter that never lies (ACT-002, ACT-003), measure by lever (MKT-ACT-002, ACT-001)
 await p.selectOption("#scenSel", "acts"); await p.locator(".spine .step", { hasText: "Pitching playlists" }).click();
 log("ACT playlists measure:", (await p.locator("#sP option").allInnerTexts()).join(", "));
 await p.locator("details.levers summary").click(); await act('[data-act="apcreate"]'); log("ACT created:", await p.locator("#dtitle").innerText());
 await p.locator('[data-act="actview"][data-v="done"]').click();
 log("ACT-003 filter:", (await p.locator('[data-act="actview"][data-v="done"]').innerText()).replace(/\n/g," "), "| listed:", (await p.locator(".alist .arow .t").allInnerTexts()).join(" / ").replace(/\n/g," "), "| open stays:", await p.locator("#dtitle").innerText());
 await go("Désigner"); await p.fill("#aDue", "2026-11-01"); await go("Fixer l'échéance"); log("MKT-ACT-001 past due:", await hasErr());
 await p.fill("#aDue", "2027-03-01"); await go("Fixer l'échéance"); log("after campaign:", await hasErr()); await p.fill("#aDue", "2026-12-19"); await go("Fixer l'échéance");
 await go("Lancer l'activation"); await go("Déclarer réalisée"); await act('[data-act="aproofsample"]'); await go("Enregistrer la preuve");
 await role("dg"); await go("Vérifier la preuve"); await role("cp");
 log("ACT-001 showcase measure:", await p.locator('label[for="sP"]').innerText(), "·", (await p.locator("#sP option").allInnerTexts()).join(", "), "| still on:", await p.locator("#dtitle").innerText());
 // Press relations by an agency: not done while lines are to examine, unless a reserve (MKT-ACT-001)
 await p.selectOption("#scenSel", "acts"); await p.locator(".spine .step", { hasText: "Relations presse" }).click(); await act('[data-act="agrefresh"]'); await act('[data-act="agimport"]');
 log("RP blocked by:", (await p.locator(".nowbox .callout.warn").first().innerText()).slice(0,140));
 await go("Déclarer réalisée"); log("RP done refused:", await hasErr());
 await p.check("#aExc"); await go("Déclarer réalisée"); log("RP exception needs:", await hasErr());
 await p.fill("#aExcWhy", "Plume envoie les retombées le 12/12"); await p.fill("#aExcD", "2026-12-20"); await go("Déclarer réalisée");
 log("RP done with reserve:", (await p.locator(".callout.warn", { hasText: "Réalisée avec une réserve" }).innerText()).slice(0,90));
 // Influence: nothing before launch, the agreement sent from the lead's view (MKT-INF-001, MKT-INF-002)
 await p.selectOption("#scenSel", "acts"); const inf = await p.locator(".spine .step", { hasText: "Influence" }).getAttribute("data-step"); await step(inf);
 await act('[data-act="ccounter"][data-k="noa"]'); await act('[data-act="caccept"][data-k="noa"]');
 log("INF-002 card:", await p.locator(".vers h3", { hasText: "Envoyer l'accord" }).innerText(), "| link in the card:", await p.locator('.linkbox code').count());
 await p.locator('[data-act="form"][data-v="aprev:noa"]').click(); log("preview:", await p.locator(".card .cap", { hasText: "verra sur sa page" }).innerText());
 await p.locator('[data-act="copytext"][data-from="ag-msg-noa"]').click(); await p.waitForTimeout(200); log("copy says:", await toastTxt());
 await act('[data-act="csend"][data-k="noa"]'); log("sent:", (await p.locator(".vers .src", { hasText: "Envoyé par e-mail" }).first().innerText()).slice(0,120));
 await act('[data-act="cproto"][data-k="noa"]'); log("noa after proto:", (await p.locator("summary", { hasText: "Noa Bessa" }).innerText()).replace(/\n/g," "));
 await act('[data-act="areason"][data-v="suspend"]'); await p.fill("#arWhy", "Budget gelé jusqu'au 20/12"); await act('[data-act="areasonok"]');
 log("INF-001 suspended:", (await p.locator(".callout.info", { hasText: "suspendue" }).innerText()).slice(0,90), "| gestures left:", await p.locator('[data-act="cpay"],[data-act="cconcept"],[data-act="cbrief"],[data-act="csend"]').count());
 // Budget per activation (MKT-BIL-002)
 await act('[data-act="aresume"]'); await p.locator("details.infos summary", { hasText: "Dépenses" }).click(); await act('[data-act="form"][data-v^="cost:"]');
 await act('[data-act="cadd"]'); log("cost needs:", await hasErr()); await p.fill("#cLabel", "Boost Spark Ads"); await p.fill("#cAmount", "200"); await act('[data-act="cadd"]');
 log("costs:", (await p.locator("details.infos summary", { hasText: "Dépenses" }).innerText()));
 // Bilan with open activations: always included, never « non applicable », the closure waits (MKT-BIL-001)
 await mod("review"); await step("bi1"); await p.fill("#bSum", "Campagne en cours, bilan intermédiaire"); await p.locator("details.infos summary", { hasText: "Options" }).click();
 log("BIL open always included:", await p.locator('input[id^="bi-"]:disabled').count()); await go("Générer la version"); await go("Soumettre à"); await role("dg"); await go("Approuver le bilan provisoire");
 await role("cp"); await step("bi2"); const rids = await p.locator('[data-act="rarb"]').evaluateAll(x=>x.map(e=>e.dataset.id));
 log("BIL na offered:", (await Promise.all(rids.map(i=>p.locator(`#ra-${i} option[value="na"]`).count()))).join(","));
 for (const i of rids) { await p.selectOption(`#ra-${i}`, "follow"); await p.selectOption(`#rc-${i}`, "Réunion de suivi"); await act(`[data-act="rarb"][data-id="${i}"]`); }
 await mod("activations"); await p.locator("details.levers summary").click(); await p.locator('[data-act="apcreate"]').first().click(); await mod("review"); await step("bi3");
 log("BIL uncovered:", (await p.locator(".rows .row", { hasText: "sans réserve suivie" }).innerText()).replace(/\n/g," ").slice(0,120));
 await go("Demander la clôture"); log("BIL closure refused:", await hasErr());
 log("BIL objectives:", (await p.locator(".srow", { hasText: "streams" }).first().innerText()).replace(/\n/g," "));
 // Seen as someone else, the same step stays open (MKT-UX-001)
 await p.selectOption("#scenSel", "ready"); await step("ready"); await role("charge"); log("UX-001 charge on:", await p.locator("#dtitle").innerText());
 await p.setViewportSize({ width: 390, height: 900 }); for (const k of ["strat","design","quote","acts","agency","rpint","bilan"]) { await p.selectOption("#scenSel", k); log("mobile", k + ":", await p.evaluate(() => document.documentElement.scrollWidth)); }
 await p.emulateMedia({ colorScheme: "dark" }); await p.setViewportSize({ width: 1440, height: 1100 }); await p.selectOption("#scenSel", "design"); await p.screenshot({ path: out + "/mk-dark.png" });
 console.log(L.join("\n")); console.log("errors:", errs); await b.close(); })().catch(e=>{console.log((globalThis.__L||[]).join("\n"));console.error("FAIL", e.message.split("\n")[0]); process.exit(1);});
