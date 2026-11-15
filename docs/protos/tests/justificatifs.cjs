// Run from the repository root: node docs/protos/tests/justificatifs.cjs (PROTO=… for a copy)
// Boîte à justificatifs (15/11/2026) : rattacher, photo à vérifier, créer la dépense, doublon, Dépenses en fiche et en modale, mobile.
const path = require("path"), os = require("os"), fs = require("fs");
const file = process.env.PROTO || path.resolve(__dirname, "..", "justificatifs.html");
const out = path.join(os.tmpdir(), "pds-protos"); fs.mkdirSync(out, { recursive: true });
const { chromium } = require(process.cwd() + "/node_modules/playwright-core");
(async () => {
  const b = await chromium.launch({ channel: "chrome", headless: true });
  const p = await b.newPage({ viewport: { width: 1440, height: 1000 } }); p.setDefaultTimeout(6000);
  const errs = []; p.on("pageerror", e => errs.push(e.message)); p.on("console", m => { if (m.type() === "error") errs.push(m.text()); });
  await p.goto("file://" + file);
  const log = [];
  const count = async () => (await p.locator(".pnav .cnt").first().textContent().catch(() => "0")).trim();
  log.push("à traiter au départ: " + await count());
  await p.screenshot({ path: `${out}/just-1-boite.png`, fullPage: true });
  // SNCF : rattacher à la dépense proposée.
  await p.click('.item:has-text("SNCF")');
  await p.click('text=Rattacher à cette dépense');
  log.push("après SNCF: " + await count() + " · " + (await p.locator(".result b").textContent()));
  await p.click("text=Justificatif suivant");
  log.push("suivant: " + (await p.locator(".dhead h2").textContent()));
  // Loca Images : deux dépenses possibles.
  await p.click('.item:has-text("Loca Images")');
  log.push("Loca: aussi possible = " + await p.locator(".alt").count());
  // Photo : à vérifier, corriger le montant, confirmer, aucune dépense, créer.
  await p.click('.item:has-text("Brasserie")');
  await p.click('.fact:has-text("Montant TTC") >> text=Modifier');
  await p.fill(".fact input", "23,50"); await p.keyboard.press("Enter");
  log.push("modifié: " + (await p.locator('.fact:has-text("Montant TTC") .src').textContent()));
  await p.click("text=Confirmer les valeurs");
  await p.click("text=Créer la dépense");
  await p.fill("#c-label", ""); await p.click('[data-act="createsave"]');
  log.push("erreur: " + (await p.locator(".fmsg").textContent()));
  await p.screenshot({ path: `${out}/just-2-creer.png` });
  await p.fill("#c-label", "Repas après le tournage test"); await p.selectOption("#c-target", "neons");
  await p.click('[data-act="usepost"]');
  await p.click('[data-act="createsave"]');
  log.push("créée: " + (await p.locator(".result b").textContent()));
  // Un e-mail arrive : doublon de la SNCF.
  await p.click("#mailBtn"); await p.waitForTimeout(2600);
  log.push("doublon: " + (await p.locator(".dhead .badge").first().textContent()));
  await p.click("text=Écarter le doublon");
  // Contrat : pas une pièce comptable.
  await p.click('button[data-act="view"][data-v="other"]');
  await p.click("text=Ranger dans les Fichiers de Néons");
  // Dépenses : fiche latérale, flèches.
  await p.click('.pnav [data-v="spends"]');
  await p.click('tbody tr >> nth=0');
  const t1 = await p.locator(".sheet h2").textContent(); await p.keyboard.press("ArrowDown");
  log.push("fiche: " + t1 + " → " + (await p.locator(".sheet h2").textContent()));
  await p.screenshot({ path: `${out}/just-3-fiche.png` });
  await p.keyboard.press("Escape");
  await p.selectOption("#detSel", "modal");
  await p.click('tbody tr >> nth=0');
  log.push("modale: " + (await p.locator(".dlg h2").textContent()));
  await p.screenshot({ path: `${out}/just-4-modale.png` });
  await p.keyboard.press("Escape");
  // Lina ne voit que Néons.
  await p.selectOption("#roleSel", "cp");
  await p.click('.pnav [data-v="inbox"]');
  log.push("Lina voit Adobe: " + await p.locator('.item:has-text("Adobe")').count());
  // Tout est traité.
  await p.selectOption("#roleSel", "dg"); await p.selectOption("#momSel", "clear");
  log.push("tout traité: " + (await p.locator(".empty b").first().textContent()));
  // Mobile et sombre.
  await p.setViewportSize({ width: 390, height: 844 }); await p.selectOption("#momSel", "morning"); await p.waitForTimeout(200);
  const sw = await p.evaluate(() => document.documentElement.scrollWidth);
  await p.click('.item:has-text("Studio Ressac")');
  await p.screenshot({ path: `${out}/just-5-mobile.png`, fullPage: true });
  await p.emulateMedia({ colorScheme: "dark" });
  await p.screenshot({ path: `${out}/just-6-mobile-sombre.png`, fullPage: true });
  console.log(log.join("\n")); console.log({ scrollWidth: sw, errors: errs });
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
