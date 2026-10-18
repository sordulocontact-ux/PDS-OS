// Run from the repository root: node docs/protos/tests/projet.cjs — the whole project in one shell.
const {chromium}=require(process.cwd()+"/node_modules/playwright-core");const SP=require("os").tmpdir();
(async()=>{const b=await chromium.launch({channel:"chrome",headless:true});const p=await b.newPage({viewport:{width:1280,height:900}});p.setDefaultTimeout(5000);
 const errs=[];p.on("pageerror",e=>errs.push(e.message+" @ "+(e.stack||"").split("\n")[1]));await p.goto("file://"+process.cwd()+"/docs/protos/projet.html");
 const log=(...a)=>console.log(a.join(" "));const T=s=>s.replace(/\n/g," / ");const page=v=>p.locator(`[data-hact="page"][data-v="${v}"]`).first().click();
 for(const sc of ["start","plan","launched","mid","prod","pre","release","after"]){await p.selectOption("#scenSel",sc);
   const cards=await p.locator(".wfcard").allInnerTexts();log(sc,"→",cards.length?cards.map(T).join(" || "):T(await p.locator("main").innerText()).slice(0,160));
   for(const w of ["framing","master","legal","marketing","distribution"]){await page(w);const t=T(await p.locator("main").innerText());if(t.length<40) log("  EMPTY",w);}
   await page("overview");}
 // clicks inside each engine
 await p.selectOption("#scenSel","mid");
 await page("master");const ms=await p.locator(".spine .step").count();await p.locator(".spine .step").nth(1).click();log("master step click:",T(await p.locator("#dtitle").innerText()),"steps",ms);
 await page("legal");await p.locator(".spine .step").nth(2).click();log("legal step:",T(await p.locator("#dtitle").innerText()));
 await page("distribution");await p.locator(".spine .step").nth(1).click();log("dist step:",T(await p.locator("#dtitle").innerText()));
 await page("marketing");await p.locator('.chev[data-v="design"]').click();log("mk chevron:",T(await p.locator("#dtitle").innerText()));
 await page("framing");log("framing title:",T(await p.locator("#dtitle").innerText()));
 // a gesture: Master brief start
 await page("master");const btn=await p.locator('main [data-act]').evaluateAll(x=>x.slice(0,8).map(e=>e.dataset.act+":"+e.textContent.trim().slice(0,30)));log("master acts:",btn.join(" | "));
 // roles
 for(const r of ["dg","da","charge"]){await p.selectOption("#roleSel",r);await page("overview");log("role",r,"now:",T(await p.locator(".card.now").innerText()).slice(0,160));}
 for(const r of ["karim","mona","sami","societe","lea","mgmt"]){await p.selectOption("#roleSel",r);log("portal",r,":",T(await p.locator("#app").innerText()).slice(0,260));}
 await p.selectOption("#roleSel","cp");await page("work");log("work:",T(await p.locator("main").innerText()).slice(0,400));
 await p.screenshot({path:SP+"/g-work.png",fullPage:true});
 await p.setViewportSize({width:390,height:900});await p.locator(".mnav [data-v=overview]").click();log("mobile:",await p.evaluate(()=>document.documentElement.scrollWidth));
 console.log("errors:",errs.slice(0,8));await b.close();})().catch(e=>{console.error("FAIL",e.message.split("\n")[0]);process.exit(1);});
