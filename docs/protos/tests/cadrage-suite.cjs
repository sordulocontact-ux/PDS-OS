// Run from the repository root: node docs/protos/tests/cadrage-suite.cjs (PROTO=… for a copy)
// Screenshots go to $TMPDIR/pds-protos (never into docs/).
const path = require("path"), os = require("os"), fs = require("fs");
const file = process.env.PROTO || path.resolve(__dirname, "..", "cadrage-suite.html");
const out = path.join(os.tmpdir(), "pds-protos"); fs.mkdirSync(out, { recursive: true });
const { chromium } = require(process.cwd() + "/node_modules/playwright-core");
(async()=>{
  const b=await chromium.launch({channel:"chrome",headless:true});
  const p=await b.newPage({viewport:{width:1440,height:1000},colorScheme:"dark"}); p.setDefaultTimeout(5000);
  const errs=[]; p.on("pageerror",e=>errs.push(e.message));
  await p.goto("file://"+file+"#dims");
  const log={push:(s)=>console.log(s),join:()=>""}; const title=async()=>(await p.locator("#stepTitle").textContent());
  const actor=async()=>(await p.locator(".actor").count()?await p.locator(".actor").textContent():"—");
  log.push("1 "+await title()+" | "+await actor());
  await p.screenshot({path:out+"/1-dims.png",fullPage:true});
  // empty answer error on a missing question
  await p.click('button.drow[data-v="timing"]'); await p.click('button.line:has-text("Contraintes calendaires")');
  await p.click('#question button:has-text("Confirmer")');
  log.push("err: "+await p.locator("#ansE").textContent());
  await p.fill("#ans","Tournée de Mona Lys du 10 au 20/11");
  await p.click('#question button:has-text("Confirmer")');
  log.push("flash: "+await p.locator('.callout[role="status"]').textContent());
  log.push("eyebrow: "+await p.locator("#question .eyebrow").textContent()+" | nav: "+await p.locator("#question .qnav .cap").textContent());
  await p.click('#question button[aria-label="Question précédente"]');
  log.push("prev: "+await p.locator("#question .ask").textContent()+" | btns: "+(await p.locator("#question .actions button").allTextContents()).join(","));
  await p.click('#question button[aria-label="Question suivante"]');
  await p.screenshot({path:out+"/1b-nav.png",fullPage:true});
  // confirm everything else
  for(let i=0;i<30;i++){
    if(!(await p.locator("#question").count())) break;
    if(await p.locator('#question textarea#ans').count()){await p.fill("#ans","Rien de prévu");}
    await p.click('#question button:has-text("Confirmer")');
  }
  log.push("2 "+await title()+" | "+await actor());
  await p.screenshot({path:out+"/2-brief.png",fullPage:true});
  await p.click('button.srow[data-v="dims"]');
  await p.click('button.drow[data-v="objective"]');
  await p.click('button.line:has-text("Critère de réussite")');
  await p.click('#question button:has-text("Modifier")');
  await p.fill("#ans","400 000 écoutes cumulées le premier mois");
  await p.click('#question button:has-text("Enregistrer")');
  log.push("after-edit flash: "+await p.locator('.callout[role="status"]').textContent());
  await p.screenshot({path:out+"/2b-dims-open.png",fullPage:true});
  await p.click('button.srow[data-v="brief"]');
  log.push("brief has 400 000: "+await p.locator('text=400 000 écoutes').count());
  await p.click('button:has-text("Envoyer en validation")');
  await p.selectOption("#roleSel","claire");
  log.push("3 "+await title()+" | "+await actor());
  await p.click('button:has-text("Demander une modification")');
  await p.click('button:has-text("Envoyer la demande")');
  log.push("errs: "+(await p.locator(".err").allTextContents()).join(" / "));
  await p.click('button.toggle[data-v="budget"]');
  await p.fill("#note","L'enveloppe passe à 28 000 € HT.");
  await p.screenshot({path:out+"/3-request.png",fullPage:true});
  await p.click('button:has-text("Envoyer la demande")');
  await p.selectOption("#roleSel","lina");
  log.push("4 "+await title()+" | "+await actor());
  await p.screenshot({path:out+"/4-rework.png",fullPage:true});
  await p.click('#question button:has-text("Modifier")');
  await p.fill("#ans","28 000 € HT");
  await p.click('#question button:has-text("Confirmer")');
  for(let i=0;i<5;i++){ if(!(await p.locator("#question").count())) break; await p.click('#question button:has-text("Confirmer")'); }
  log.push("5 "+await title()+" | changed: "+(await p.locator(".changed").count()?await p.locator(".changed").textContent():"none"));
  await p.click('button:has-text("Envoyer en validation")');
  await p.selectOption("#roleSel","claire");
  await p.click('button[data-act="approve"]');
  await p.selectOption("#roleSel","lina");
  log.push("6 "+await title()+" | "+await actor());
  await p.click('button[aria-label="Modifier Production"]');
  await p.selectOption("#pc","along"); await p.click('button[data-act="psave"]');
  await p.screenshot({path:out+"/6-plan.png",fullPage:true});
  await p.click('button[data-act="launch"]');
  log.push("7 "+await p.locator('.callout[role="status"]').textContent());
  await p.setViewportSize({width:390,height:844});
  for(const m of ["dims","validation","plan"]){await p.selectOption("#momSel",m); const w=await p.evaluate(()=>document.documentElement.scrollWidth); log.push(`mobile ${m}: ${w}`);}
  await p.screenshot({path:out+"/8-mobile.png",fullPage:true});
  await p.emulateMedia({colorScheme:"light"}); await p.setViewportSize({width:1440,height:1000}); await p.selectOption("#momSel","validation");
  await p.screenshot({path:out+"/9-light.png",fullPage:true});
  console.log(log.join("\n")); console.log("errors:",errs);
  await b.close();
})().catch(e=>{console.error(e.message);process.exit(1);});
