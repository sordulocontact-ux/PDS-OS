// Run from the repository root: node docs/protos/tests/finance-midday.cjs (PROTO=… for a copy)
// Finance « à la Midday » (15/11/2026) : tout le ticket d'Ibé, parcours par parcours, trois rôles, mobile, sombre.
const path = require("path"), os = require("os"), fs = require("fs");
const file = process.env.PROTO || path.resolve(__dirname, "..", "finance-midday.html");
const out = path.join(os.tmpdir(), "pds-protos"); fs.mkdirSync(out, { recursive: true });
const { chromium } = require(process.cwd() + "/node_modules/playwright-core");
(async () => {
  const b = await chromium.launch({ channel: "chrome", headless: true });
  const p = await b.newPage({ viewport: { width: 1440, height: 1000 } }); p.setDefaultTimeout(6000);
  const errs = []; p.on("pageerror", e => errs.push(e.message)); p.on("console", m => { if (m.type() === "error") errs.push(m.text()); });
  await p.goto("file://" + file); await p.waitForTimeout(500);
  const log = [], shot = n => p.screenshot({ path: `${out}/fm-${n}.png`, fullPage: true });
  const txt = async s => (await p.locator(s).first().textContent()).replace(/\s+/g, " ").trim();
  log.push("cartes v6: " + await p.locator(".c6").count() + " · " + (await txt(".c6:nth-child(2) .c6s")).slice(0, 70)); await shot("1-overview");
  await p.selectOption("#verSel", "5"); log.push("v5 phrase: " + await txt("#rot")); await p.selectOption("#verSel", "6");
  await p.click('button.c6:has(.c6l:text-is("Factures"))'); log.push("carte factures → " + await txt('[data-invv][aria-pressed="true"]')); await p.click('.nav [data-go="overview"]');
  // PO
  await p.click('[data-act="sugg"]'); await p.click('[data-ask*="point bas"]'); await p.waitForTimeout(1100);
  log.push("PO: " + (await txt(".chat .po p")).slice(0, 90)); await shot("2-po");
  await p.click('[data-act="chatClose"]');
  // Justificatifs : grille par défaut, rattacher depuis la carte, liste, filtres
  await p.click('.nav [data-go="inbox"]'); log.push("grille: " + await p.locator(".rc").count() + " cartes"); await shot("2b-grille");
  await p.click('.rc:has-text("Studio Grande Armée") [data-attach]'); log.push("rattachée: " + await txt('.rc:has-text("Studio Grande Armée") .st'));
  await p.click('[data-inf="all"]'); log.push("tous: " + await p.locator(".rc").count());
  await p.click('[data-inview="list"]'); log.push("liste: " + await p.locator("tbody tr").count() + " lignes"); await shot("2c-liste");
  await p.click('tbody tr:has-text("G7")'); log.push("fiche: " + await txt(".sheet h2")); await p.keyboard.press("Escape");
  await p.click('[data-inview="grid"]');
  // Transactions
  await p.click('.nav [data-go="tx"]'); await shot("3-tx");
  await p.click('tr:has-text("JULIEN MARTIN") [data-accept]');
  log.push("Julien: " + await txt('tr:has-text("JULIEN MARTIN") td:last-child'));
  await p.click('tr:has-text("PUBLICIS CONSEIL")'); await p.click('.sheet [data-accept]');
  log.push("Publicis: " + await txt(".sheet .done"));
  await p.keyboard.press("Escape");
  await p.click('tr:has-text("LOCA IMAGES") >> nth=1'); log.push("doublon: " + (await txt(".sheet .notice")).slice(0, 60));
  await p.click('.sheet [data-act="ignore"]'); await p.keyboard.press("Escape");
  await p.click('tr:has-text("FREE PRO")'); await p.click('[data-act="txToSpend"]'); await p.click('[data-act="saveNew"]');
  log.push("créer depuis Qonto: " + await txt(".sheet .fmsg"));
  await p.selectOption("#n-b", "fg"); await p.click('[data-act="saveNew"]'); log.push("dépense créée: " + await txt(".sheet h2"));
  await p.keyboard.press("Escape");
  // Dépenses : fiche, statut, montant facturé avec justification, ↑↓
  await p.click('.nav [data-go="spend"]'); await p.click('tr:has-text("Location caméra")');
  await p.click('.sheet [data-ed="ht"]'); await p.fill("#edv", "600"); await p.keyboard.press("Enter");
  await p.click('[data-act="doJustify"]'); log.push("justif vide: " + await txt(".dlg .err"));
  await p.fill("#why", "Avoir de Loca Images sur l'optique non livrée"); await p.click('[data-act="doJustify"]');
  log.push("historique: " + (await txt(".sheet .hist li")).slice(0, 80));
  await p.keyboard.press("ArrowDown"); log.push("suivante: " + await txt(".sheet h2")); await shot("4-sheet");
  await p.keyboard.press("Escape");
  // Budget J4Y : filtre, part PDS, révision par Lina puis validation par Claire
  await p.click('.nav [data-go="budget"]'); await p.click('tr[data-budget="j4y"]'); await shot("5-budget");
  await p.click('[data-bf="payé"]'); log.push("filtre payé: " + await txt(".card .g3"));
  await p.click('[data-bf=""]');
  await p.selectOption("#roleSel", "cp"); await p.click('.nav [data-go="budget"]'); await p.click('tr[data-budget="j4y"]');
  await p.click('[data-act="revise"]'); await p.fill("#rva", "2000"); await p.fill("#rvw", "Deuxième jour de tournage demandé par le réalisateur"); await p.click('[data-act="doRevise"]');
  log.push("Lina: " + (await txt(".notice")).slice(0, 70));
  log.push("nav Lina: " + (await p.locator(".nav button").allTextContents()).join(","));
  await p.selectOption("#roleSel", "dg"); await p.click('.nav [data-go="budget"]'); await p.click('tr[data-budget="j4y"]'); await p.click('[data-act="revOk"]');
  log.push("après validation: " + await txt(".big"));
  // Factures : relance, encaissement partiel
  await p.click('.nav [data-go="invoice"]'); await shot("6-invoices");
  await p.click('tr:has-text("F-2026-041")'); await p.click('[data-act="remind"]'); await p.click('[data-act="sendRemind"]');
  log.push("relance: " + await txt(".sheet .done"));
  await p.click('[data-act="receive"]'); await p.fill("#rcv", "2000"); await p.click('[data-act="doReceive"]'); log.push("encaissement: " + await txt(".sheet .done"));
  await p.keyboard.press("Escape");
  // Planning : déplacer l'émission #10
  await p.click('.nav [data-go="plan"]'); log.push("alerte réserve: " + (await p.locator(".bell i").count()));
  await p.selectOption('[data-move="m10"]', "4"); log.push("décalage: " + await txt(".card .done")); await shot("7-planning");
  // Financements, rapports
  await p.click('.nav [data-go="fund"]'); await shot("8-fund");
  await p.click('.nav [data-go="reports"]'); await p.click('[data-horizon="30"]'); await shot("9-reports");
  // ⌘K, alertes, import, export
  await p.keyboard.press("Meta+k"); await p.keyboard.type("dioo"); log.push("⌘K: " + await txt(".palette .it")); await p.keyboard.press("Enter");
  log.push("→ " + await txt("h1"));
  await p.click('[data-act="alerts"]'); log.push("alertes: " + await p.locator(".alerts li").count()); await shot("10-alerts"); await p.click('[data-act="closeAlerts"]');
  await p.click("#importBtn"); await p.waitForTimeout(1500); log.push("import: " + await p.locator('tr:has-text("NOVA SAS")').count());
  await p.click('[data-txv="ready"]'); await p.click('[data-act="export"]'); await p.click('[data-act="doExport"]'); log.push("export: " + await txt("#toast b"));
  // Mobile, sombre
  await p.setViewportSize({ width: 390, height: 844 }); const widths = [];
  for (const g of ["overview","inbox","tx","spend","budget","invoice","plan"]) { await p.evaluate(x => go(x), g); await p.waitForTimeout(120); widths.push(g + ":" + await p.evaluate(() => document.documentElement.scrollWidth)); }
  await p.emulateMedia({ colorScheme: "dark" }); await p.evaluate(() => go("overview")); await p.waitForTimeout(300); await shot("11-mobile-dark");
  await p.setViewportSize({ width: 1440, height: 1000 }); await shot("12-dark");
  console.log(log.join("\n")); console.log({ widths, errors: errs });
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
