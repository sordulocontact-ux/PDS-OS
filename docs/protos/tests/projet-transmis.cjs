// Run from the repository root: node docs/protos/tests/projet-transmis.cjs (PROTO=… for a copy)
// Screenshots go to $TMPDIR/pds-protos (never into docs/).
const path = require("path"), os = require("os"), fs = require("fs");
const file = process.env.PROTO || path.resolve(__dirname, "..", "projet-transmis.html");
const out = path.join(os.tmpdir(), "pds-protos"); fs.mkdirSync(out, { recursive: true });
const { chromium } = require(process.cwd() + "/node_modules/playwright-core");
(async()=>{
  const b=await chromium.launch({channel:"chrome",headless:true});
  const p=await b.newPage({viewport:{width:1440,height:1000},colorScheme:"dark"});p.setDefaultTimeout(5000);
  const errs=[];p.on("pageerror",e=>errs.push(e.message));
  const actor=async()=>(await p.locator(".actor").count()?await p.locator(".actor").textContent():"—");
  const h=async()=>(await p.locator(".bt").first().textContent());
  await p.goto("file://"+file+"#transmettre");
  console.log("1",await actor(),"|",await h());
  await p.click('button[data-act="transmit"]');
  console.log("err:",await p.locator("#toE").textContent());
  await p.selectOption("#to","lina");await p.fill("#msg","Sortie début décembre.");await p.click('button[data-act="transmit"]');
  console.log("2",await actor(),"|",await h(),"|",await p.locator('.callout[role="status"]').textContent());
  await p.selectOption("#roleSel","lina");
  console.log("3",await actor(),"|",await h());
  await p.screenshot({path:out+"/acc-1.png",fullPage:true});
  await p.click('button[data-act="mode"][data-v="clarify"]');await p.click('button[data-act="clarify"]');
  console.log("errs:",(await p.locator(".err").allTextContents()).join(" / "));
  await p.click('button[data-act="subject"][data-v="budget"]');await p.fill("#resp","Le clip est-il dans les 25 000 € ?");await p.click('button[data-act="clarify"]');
  console.log("4",await actor(),"|",await p.locator('.callout[role="status"]').textContent());
  await p.selectOption("#roleSel","claire");
  console.log("5",await actor(),"|",await p.locator(".callout.t-warn").textContent());
  await p.fill("#msg","Oui, le clip est dedans.");await p.click('button[data-act="transmit"]');
  await p.selectOption("#roleSel","lina");await p.click('button[data-act="accept"]');
  console.log("6",await actor(),"|",await p.locator('.callout[role="status"]').textContent());
  await p.click("details.fold summary");console.log("hist:",(await p.locator(".hist li").allTextContents()).length);
  await p.click('button[data-act="modal"]');console.log("modal:",await p.locator(".dialog h2").textContent());await p.keyboard.press("Escape");
  await p.selectOption("#momSel","incomplet");console.log("missing:",await p.locator(".pf .none").count());
  await p.screenshot({path:out+"/acc-incomplet.png",fullPage:true});
  await p.click('#vset button[data-variant="old"]');await p.click('#vset button[data-variant="new"]');
  await p.setViewportSize({width:390,height:844});
  for(const m of ["transmettre","accepter","precision","refus"]){await p.selectOption("#momSel",m);console.log("mobile",m,await p.evaluate(()=>document.documentElement.scrollWidth));}
  await p.screenshot({path:out+"/acc-mobile.png",fullPage:true});
  console.log("errors:",JSON.stringify(errs));await b.close();
})().catch(e=>{console.error(e.message);process.exit(1);});
