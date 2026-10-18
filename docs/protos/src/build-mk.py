import re,sys
SP=sys.argv[1]
src=open("docs/protos/production-v2.html",encoding="utf-8").read()
mk=open(SP+"/mk.js",encoding="utf-8").read()
acts=open(SP+"/mk-actions.js",encoding="utf-8").read()
scen=open(SP+"/mk-scen.js",encoding="utf-8").read()
s=src
def rep(a,b,cnt=1):
    global s
    assert s.count(a)==cnt,(s.count(a),a[:100])
    s=s.replace(a,b)
mk=mk.replace('''     ${req&&req.note?`<div class="callout warn">${I.warn}<span>${esc(req.note)}</span></div>`:""}''','''     ${S.review.corr&&!req&&!c?`<div class="callout warn">${I.warn}<span><b>${esc(S.review.corr.by)} (demander des corrections)</b> : « ${esc(S.review.corr.note)} »</span></div>`:""}''')
assert "S.review.corr&&!req" in mk
rep("<title>Production externe V2</title>","<title>Marketing complet</title>")
# CSS
rep(".src.warnc{color:var(--warn-fg)} .src.okc{color:var(--ok-fg)}",""".src.warnc{color:var(--warn-fg)} .src.okc{color:var(--ok-fg)}
/* Marketing: dashboards */
.statgrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px}
.stat{display:flex;flex-direction:column;gap:4px;padding:12px 14px;border-radius:10px;background:var(--soft);min-width:0}
.stat .k{font-size:13px;color:var(--text-3)} .stat b{font-size:18px;font-weight:600;letter-spacing:-.02em;overflow-wrap:anywhere}
.stat details summary{cursor:pointer;list-style:none;width:fit-content} .stat details summary::-webkit-details-marker{display:none}
button.chev{font:inherit;letter-spacing:inherit} .chev .mine{margin-left:2px}
/* A proposal decided one by one: the text and its quote, then Retenir / Modifier / Écarter. */
.irow{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px 14px;padding:12px 14px;border-bottom:1px solid var(--hair);font-size:15px}
.rows .irow:last-child{border-bottom:0}
.irow .grow{flex:1 1 300px;min-width:0}
.irow .src{font-size:13px;color:var(--text-3)}
.chip2{display:inline-flex;align-items:center;height:28px;padding:0 12px;border-radius:999px;border:1px solid var(--border);font-size:14px}""")
# Roles: direction validation
rep('''  {k:"creativeExt",label:"Validation créative externe"''','''  {k:"direction",label:"Validation de la direction",kind:"Valide",what:"Valide la Stratégie, la direction artistique, les fiches, les preuves, le bilan et la clôture du Marketing.",pool:MEMBERS},
  {k:"creativeExt",label:"Validation créative externe"''')
rep('''creativeInt:"da",creativeExt:"mgmt",post:"societe"},''','''creativeInt:"da",creativeExt:"mgmt",post:"societe",direction:"dg"},''')
# Steps: Production keeps its own, the org step becomes the « Rôles et liens » tab
i=s.index('  {id:"org",title:"Organisation et rôles"');j=s.index("\n",i)+1;s=s[:i]+s[j:]
rep('''const STEPS=[''','''const PROD_STEPS=[''')
rep('''valid:[],prereq:["org"]},''','''valid:[],prereq:["pq-clip"]},''')
rep('''const STEP=id=>STEPS.find(s=>s.id===id);''','''const PROD=PROD_STEPS.map(x=>({...x,mod:"production",liv:"clip"}));
Object.defineProperty(PROD.find(x=>x.id==="kickoff"),"title",{get:()=>prodOf("clip")?prepTitle("clip"):"Call de production"});
Object.defineProperty(PROD.find(x=>x.id==="kickoff"),"why",{get:()=>`Comment la préproduction s'organise avec ${nameOf(holder("exec")||"societe")} : un call, une préparation avec PO ou un document existant, puis les tâches confirmées une à une.`});
function steps(){return FR_STEPS.concat(MK_STEPS,prodSteps(),[AC0],S.acts.map(actStep),REVIEW_STEPS);}
const STEP=id=>steps().find(s=>s.id===id);''')
s=re.sub(r"(?<![A-Z_])STEPS(?=[.\[])","steps()",s)
# Shooting days come from the fiche and the decisions, not from a constant
rep('''const SHOOT_DAYS=1;''','''''')
rep('''<span class="src">Location des lieux pour ${SHOOT_DAYS} jour${SHOOT_DAYS>1?"s":""} de tournage. Le lieu retenu y sera comparé.</span>''','''<span class="src">Location des lieux pour ${shootDaysText()} <span class="t3">(${esc(shootDaysWhy())})</span>. Le lieu retenu y sera comparé.</span>''')
rep('''pour ${SHOOT_DAYS} jour${SHOOT_DAYS>1?"s":""} de tournage''','''pour ${shootDaysText()}''')
rep('''const cost=o.price*SHOOT_DAYS,''','''const cost=o.price*shootDays().n,''')
rep('''text:"Tournage possible le 24/10 en plus du 23/10",kind:"confirm",source:"Call de présentation du 15/10''','''text:"Tournage possible le 24/10 en plus du 23/10",extraDay:"2026-10-24",kind:"confirm",source:"Call de présentation du 15/10''')
assert "SHOOT_DAYS" not in s
rep('''function render(){''','''function render(){syncCallTasks();''')
# An external person only reads what follows in the clip production, never PDS's other work
rep('''  const nx=allActions().filter(a=>a.r!==me()).slice(0,3);''','''  const ext=P[me()].where!=="app",ids=PROD.map(x=>x.id).concat(["director"]);const nx=allActions().filter(a=>a.r!==me()&&(!ext||ids.includes(a.step))).slice(0,ext?1:3);''')
# Nobody directs until a director is retained (proposed by the production company)
rep('''director:"realExt",creative:"da"''','''director:null,creative:"da"''')
rep(''':k==="realExt"?["creative"]:''',''':k===holder("director")?["creative"]:''')
rep('''    case "form": {S.form=el.dataset.v||null;''','''    case "form": {S.form=el.dataset.v||null;if((S.form||"").startsWith("ag:")) focusAgenda();''')
rep('''"Déposer le devis","avant le 21/10");''','''"Déposer le devis",quoteDue());''')
assert "STEPS" not in s.replace("PROD_STEPS","").replace("MK_STEPS","").replace("REVIEW_STEPS","").replace("FR_STEPS",""), [m.start() for m in re.finditer("STEPS",s)]
# State
rep('''  return {role:"charge",tab:"parcours",''','''  return {role:"cp",mod:"strategy",liv:null,prods:{},light:{},gph:{},gby:{},actProps:[],rdraft:null,strat:{items:[],arb:{},arbBy:{},review:null,validated:null,relances:{}},
    design:{items:[],refs:[],respBy:null,path:null,pathBy:null,call:null,callDone:false,brief:null,dir:{status:"draft",rounds:[]},dirManual:{},fiches:[],transfer:null},acts:[],review:{reports:[],reserves:[],closeReq:null,closed:null,corr:null},kick:{items:[],confirmed:null},
    tab:"parcours",''')
# done / actors / summary
rep('''function done(id){
  switch(id){
    case "org":case "kickoff":return true;''','''function done(id){const m=doneMk(id);return m===undefined?!!doneProd(id):m;}
function doneProd(id){
  switch(id){''')
rep('''function actorsOf(id){
  const st=statusOf(id); if(st==="blocked"||st==="done") return [];''','''function actorsOf(id){
  const st=statusOf(id); if(st==="blocked"||st==="done") return [];
  const mk=actorsMk(id); if(mk) return mk;''')
rep('''function summary(id){''','''function summary(id){const m=summaryMk(id);return m!=null?m:summaryProd(id);}
function summaryProd(id){''')
rep('''const actTitle=a=>a.tab?"Décisions":STEP(a.step).title;''','''const actTitle=a=>a.tab?"Décisions":`${MODNAME[STEP(a.step).mod]} › ${STEP(a.step).title}`;''')
# Shell: chevrons, header, tabs, dashboards
rep('''    <div class="chevrons" aria-label="Étapes du Marketing">
      <span class="chev"><span class="ok">${I.check}</span>Stratégie</span><span class="chev"><span class="ok">${I.check}</span>Conception</span>
      <span class="chev on">Production</span><span class="chev">Activations</span><span class="chev">Suivi &amp; bilan</span></div>
    <div class="headrow"><h1 class="h1">Clip « Néons »</h1>${pill("act","Production externe · Studio Ressac")}</div>
    <div class="facts"><span>Enveloppe interne <b class="num">${euro(ENVELOPE)}</b></span><span>Tournage visé <b>Ven. 23/10/2026</b></span><span>Livraison <b>Sam. 28/11/2026</b></span><span>Sortie <b>Sam. 05/12/2026</b></span></div>''','''    <nav class="crumbs" aria-label="Fil d'Ariane">Néons › ${S.mod==="framing"?"":"Marketing › "}${esc(MODNAME[S.mod])}${S.tab==="parcours"&&S.sel&&STEP(S.sel)?` › ${S.mod==="production"&&S.liv&&ficheByKey(S.liv)?esc(ficheByKey(S.liv).name)+" › ":""}${esc(STEP(S.sel).title)}`:""}</nav>
    ${S.mod==="framing"?"":`<div class="chevrons" aria-label="Étapes du Marketing">${MODS.map(([k,l])=>{const ms=steps().filter(x=>x.mod===k), dn=ms.length>0&&ms.every(x=>statusOf(x.id)==="done"), n=allActions().filter(a=>a.r===me()&&a.step&&STEP(a.step).mod===k).length;
      return `<button class="chev ${S.mod===k?"on":""}" type="button" data-act="mod" data-v="${k}" aria-pressed="${S.mod===k}">${dn?`<span class="ok">${I.check}</span>`:""}${esc(l)}${n?`<span class="mine" aria-label="${n} à vous">${n}</span>`:""}</button>`;}).join("")}</div>`}
    <div class="headrow"><h1 class="h1">${esc(MODNAME[S.mod])}</h1>${S.mod==="production"&&S.liv&&prodOf(S.liv)&&prodOf(S.liv).mode?pill("",`${ficheByKey(S.liv).name} · ${MODE_LABEL[prodOf(S.liv).mode]}${prodOf(S.liv).who?" · "+nameOf(prodOf(S.liv).who):""}`):""}</div>
    <div class="facts">${S.mod==="production"&&S.liv==="clip"&&prodOf("clip").mode==="ext"?`<span>Clip « Néons »</span><span>Enveloppe interne <b class="num">${euro(ENVELOPE)}</b></span><span>Tournage visé <b>Ven. 23/10/2026</b></span><span>Livraison <b>Sam. 28/11/2026</b></span>`:`<span>Néons · Mona Lys · Single</span><span>Budget <b class="num">${euro(BUDGET_ENV)}</b></span><span>Responsable <b>${esc(nameOf(holder("project")))}</b></span>`}<span>Sortie <b>Sam. 05/12/2026</b></span></div>''')
rep('''["history","Historique",0]].map(''','''["history","Historique",0],["roles","Rôles et liens",0]].map(''')
rep('''    ${S.tab==="decisions"?decisionsView():S.tab==="tasks"?tasksView():S.tab==="history"?historyView():journey()}''','''    ${S.tab==="decisions"?decisionsView():S.tab==="tasks"?tasksView():S.tab==="history"?historyView():S.tab==="roles"?rolesView():(S.mod==="activations"?actBoard():S.mod==="review"?dashboard():"")+journey()}''')
# Now card: « À vous, ailleurs »
rep('''<span class="pill info">${shownHere?"Aussi à vous":"À vous"}</span>''','''<span class="pill info">${a.step&&STEP(a.step).mod!==S.mod&&S.tab==="parcours"?"À vous, ailleurs":shownHere?"Aussi à vous":"À vous"}</span>''')
# A step can also wait for a condition computed by the code (gate), shown like a prerequisite.
rep('''  if(!s.prereq.every(done)) return "blocked";''','''  if(!s.prereq.every(done)||(s.gate&&!s.gate())) return "blocked";''')
rep('''const sub=st==="blocked"?"Après : "+s.prereq.filter(p=>!done(p)).map(p=>STEP(p).title).join(", ")''','''const sub=st==="blocked"?"Après : "+s.prereq.filter(p=>!done(p)).map(p=>STEP(p).title).concat(s.gate&&!s.gate()?[s.gateText]:[]).join(", ")''')
rep('''${st==="blocked"?`<div class="callout info">${I.lock}<span>S'ouvre quand ${s.prereq.filter(p=>!done(p)).map(p=>esc(STEP(p).title)).join(" et ")} ${s.prereq.filter(p=>!done(p)).length>1?"sont faits":"est fait"}.</span></div>`:""}''','''${st==="blocked"?(w=>`<div class="callout info">${I.lock}<span>S'ouvre quand ${w.map(esc).join(" et ")} ${w.length>1?"sont faits":"est fait"}.</span></div>`)(s.prereq.filter(p=>!done(p)).map(p=>STEP(p).title).concat(s.gate&&!s.gate()?[s.gateText.toLowerCase().replace(/ réalisées$/," réalisées")]:[])):""}''')
# Journey limited to the open module
rep('''  if(!S.sel){const a=allActions().find(x=>x.r===me()&&x.step);S.sel=a?a.step:(steps().find(s=>statusOf(s.id)==="current")||steps()[0]).id;}
  return `<div class="layout"><nav class="spine" aria-label="Parcours"><h2>Parcours</h2>${steps().map(spineItem).join("")}</nav>''','''  const ms=steps().filter(x=>x.mod===S.mod);
  if(!S.sel||!ms.some(x=>x.id===S.sel)){const a=allActions().find(x=>x.r===me()&&x.step&&ms.some(y=>y.id===x.step));S.sel=a?a.step:(ms.find(x=>["current","rework"].includes(statusOf(x.id)))||ms[0]).id;}
  return `<div class="layout"><nav class="spine" aria-label="Parcours"><h2>Parcours · ${esc(MODNAME[S.mod])}</h2>${ms.map(spineItem).join("")}</nav>''')
# Detail: person as executor, prerequisites from other modules, activation body
rep('''  const slotLine=k=>k&&holder(k)?''','''  const slotLine=k=>k&&k.startsWith("p:")?(k.length>2?`${esc(nameOf(k.slice(2)))}<br><span class="cap">${s.mod==="production"?"Responsable de la production":"Responsable de l'activation"}</span>`:"À désigner"):k&&holder(k)?''')
rep('''<div><div class="k">Prérequis</div><div class="v">${s.prereq.length?s.prereq.map(p=>`<span class="${done(p)?"okc":"noc"}">${done(p)?"✓":"○"} ${esc(STEP(p).title)}</span>`).join("<br>"):"Aucun"}</div></div>''','''<div><div class="k">Prérequis</div><div class="v">${s.prereq.length||s.ext?(s.ext||[]).map(x=>`<span class="okc">✓ ${esc(x)}</span>`).concat(s.prereq.map(p=>`<span class="${done(p)?"okc":"noc"}">${done(p)?"✓":"○"} ${STEP(p).mod!==s.mod?esc(MODNAME[STEP(p).mod])+" › ":""}${esc(STEP(p).title)}</span>`)).join("<br>"):"Aucun"}</div></div>''')
rep('''<div class="v">${next.length?next.map(n=>esc(n.title)).join("<br>"):"—"}</div>''','''<div class="v">${next.length?next.map(n=>`${n.mod!==s.mod?esc(MODNAME[n.mod])+" › ":""}${esc(n.title)}`).join("<br>"):"—"}</div>''')
rep('''  ${st==="blocked"?"":BODY[s.id]()}
  ${st!=="blocked"&&isMember(me())&&!done("delivery")?blockerForm(s.id):""}`;''','''  ${st==="blocked"?"":s.act?actBody(s.act):BODY[s.id]()}
  ${st!=="blocked"&&isMember(me())&&!S.review.closed?blockerForm(s.id):""}`;''')
rep('''    case "go": S.tab="parcours"; S.sel=el.dataset.step;''','''    case "go": S.tab="parcours"; S.sel=el.dataset.step; S.mod=STEP(el.dataset.step).mod;''')
rep('''.concat(s.prereq.map(p=>''','''.concat(s.gate?[`<span class="${s.gate()?"okc":"noc"}">${s.gate()?"✓":"○"} ${esc(s.gateText)}</span>`]:[]).concat(s.prereq.map(p=>''')

# Lower-case only the first letter of an action: « confirmer les propositions de PO », not « de po ».
s=s.replace("const esc=s=>","const lcFirst=t=>t?t.charAt(0).toLowerCase()+t.slice(1):t;\nconst esc=s=>",1)
for a in ["a.todo.toLowerCase()","x.todo.toLowerCase()","b.next.toLowerCase()","acts[0].todo.toLowerCase()","todo.toLowerCase()","arb.name.toLowerCase()","todo.name.toLowerCase()"]:
    s=s.replace(a,"lcFirst("+a.replace(".toLowerCase()","")+")")
# The open step is chosen before « Maintenant » is drawn, so the card never repeats it.
rep('''function journey(){
  const ms=steps().filter(x=>x.mod===S.mod);
  if(!S.sel||!ms.some(x=>x.id===S.sel)){const a=allActions().find(x=>x.r===me()&&x.step&&ms.some(y=>y.id===x.step));S.sel=a?a.step:(ms.find(x=>["current","rework"].includes(statusOf(x.id)))||ms[0]).id;}''','''function ensureSel(){
  const ms=steps().filter(x=>x.mod===S.mod);
  if(!S.sel||!ms.some(x=>x.id===S.sel)){const a=allActions().find(x=>x.r===me()&&x.step&&ms.some(y=>y.id===x.step));S.sel=a?a.step:(ms.find(x=>["current","rework"].includes(statusOf(x.id)))||ms[0]).id;}
  return ms;
}
function journey(){
  const ms=ensureSel();''')
rep('''function shell(){''','''function shell(){
  ensureSel();''')
rep('''"La production avance sans vous pour l'instant"''','''"Le Marketing avance sans vous pour l'instant"''')
rep('''const who=acts.length?acts.map(a=>P[a.r].name).join(" et ")+" · "+lcFirst(acts[0].todo):"";''','''const who=acts.length?[...new Set(acts.map(a=>P[a.r].name))].join(" et ")+" · "+lcFirst(acts[0].todo)+((n=>n>1?` · et ${n-1} autre${n>2?"s":""}`:"")(new Set(acts.map(a=>a.todo)).size)):"";''')
rep(".stat details summary{cursor:pointer;",".stat .src{font-size:13px;color:var(--text-3)} .stat details summary{cursor:pointer;")
rep('''document.getElementById("scenSel").addEventListener("change",e=>{''','''document.getElementById("scenSel").addEventListener("change",e=>{document.getElementById("toast").hidden=true;''')
rep('''document.addEventListener("change",e=>{if(e.target.id==="lPhotos")''','''// Editing an item: Entrée enregistre, Échap annule (VISION-UX rule 2).
document.addEventListener("keydown",e=>{const t=e.target;if(!t.id||!t.id.startsWith("ie-")) return;
  if(e.key==="Enter"){e.preventDefault();const b=document.querySelector(`[data-act="itmsave"][data-id="${t.id.slice(3)}"]`);if(b) b.click();}
  if(e.key==="Escape"){e.preventDefault();S.form=null;render();}});
document.addEventListener("change",e=>{if(e.target.id==="lPhotos")''')

# No violet (ticket « Architecture globale ») : the accent tone becomes neutral.
s=s.replace("--act-bg:#ece1fb; --act-fg:#4c1d9e;","--act-bg:#ececec; --act-fg:#111;").replace("--act-bg:#2a1c47; --act-fg:#c9b2ff;","--act-bg:#262626; --act-fg:#ededed;")
assert "#ece1fb" not in s and "#2a1c47" not in s
rep(".src.warnc{color:var(--warn-fg)} .src.okc{color:var(--ok-fg)}",""".src.warnc{color:var(--warn-fg)} .src.okc{color:var(--ok-fg)}
.crumbs{font-size:14px;color:var(--text-3)}
.refgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:10px}
.ref{border:1px solid var(--hair);border-radius:10px;overflow:hidden;background:var(--raised);display:flex;flex-direction:column;min-width:0}
.ref img{display:block;width:100%;aspect-ratio:4/3;object-fit:cover}
.ref .ph.none{aspect-ratio:4/3;display:grid;place-items:center;color:var(--text-3);font-size:13px;background:var(--sunken)}
.ref .bd{padding:10px 12px;display:flex;flex-direction:column;gap:6px;font-size:14px}
.ref .src,.vers .src{font-size:13px;color:var(--text-3)}
.doc{display:flex;flex-direction:column;gap:16px}.doc h4{margin:0 0 6px;font-size:13px;font-weight:600;color:var(--text-2);text-transform:none;letter-spacing:0}
.fedit{display:flex;flex-direction:column;gap:8px;margin-top:4px}
.protobtn{height:34px;border-radius:10px;border:1px solid rgb(255 255 255 / .18);background:var(--glass);color:var(--glass-fg);padding:0 12px;font-size:14px;cursor:pointer}
.pickbar{display:flex;flex-wrap:wrap;gap:8px}
.pickbar button{display:flex;flex-direction:column;align-items:flex-start;gap:2px;min-width:180px;padding:10px 14px;border-radius:12px;border:1px solid var(--hair);background:var(--raised);cursor:pointer;text-align:left;color:var(--text)}
.pickbar button[aria-pressed="true"]{border-color:var(--text);box-shadow:0 0 0 1px var(--text)}""")
# Production : one parcours per transferred livrable, chosen above the parcours.
rep('''function ensureSel(){
  const ms=steps().filter(x=>x.mod===S.mod);''','''function modSteps(){
  if(S.mod==="production"){const tf=transferredFiches();if(!S.liv||!tf.some(f=>f.key===S.liv)){const a=allActions().find(x=>x.r===me()&&x.step&&STEP(x.step)&&STEP(x.step).mod==="production");S.liv=a?STEP(a.step).liv:(tf[0]||{}).key||null;}}
  return steps().filter(x=>x.mod===S.mod&&(x.mod!=="production"||x.liv===S.liv));
}
function prodPicker(){
  const tf=transferredFiches();if(!tf.length) return "";
  return `<div class="pickbar" role="group" aria-label="Livrables en Production">${tf.map(f=>{const p=prodOf(f.key),ms=steps().filter(x=>x.mod==="production"&&x.liv===f.key),dn=ms.length>1&&ms.every(x=>statusOf(x.id)==="done"),n=allActions().filter(a=>a.r===me()&&a.step&&STEP(a.step)&&STEP(a.step).liv===f.key).length;
    return `<button type="button" data-act="prodliv" data-v="${f.key}" aria-pressed="${S.liv===f.key}"><b>${esc(f.name)}${n?` <span class="mine" style="display:inline-grid">${n}</span>`:""}</b><span class="cap">${p&&p.mode?esc(MODE_LABEL[p.mode])+(p.who?" · "+esc(nameOf(p.who)):""):"Qui produit ? à choisir"}${dn?" · livré":""}</span></button>`;}).join("")}</div>`;
}
function ensureSel(){
  const ms=modSteps();
  if(!ms.length){S.sel=null;return ms;}''')
rep('''function journey(){
  const ms=ensureSel();''','''function journey(){
  const ms=ensureSel();
  if(!ms.length) return `<section class="card"><h2 style="font-size:18px">Aucun livrable en Production</h2><p class="note">La Production commence quand une fiche validée y est transférée depuis la Conception.</p><div class="btnrow"><button class="btn out" type="button" data-act="mod" data-v="design">Ouvrir la Conception</button></div></section>`;''')
rep('''(S.mod==="activations"?actBoard():S.mod==="review"?dashboard():"")+journey()''','''(S.mod==="activations"?actPage():(S.mod==="review"?dashboard():S.mod==="production"?prodPicker():"")+journey())''')
rep('''  ${st==="blocked"?"":s.act?actBody(s.act):BODY[s.id]()}''','''  ${st==="blocked"?"":s.act?actBody(s.act):s.prep?prepBody(s):s.generic?genericBody(s):s.light?lightBody(s):s.id.startsWith("pq-")?pqBody(s):BODY[s.id]()}''')
rep('''    case "go": S.tab="parcours"; S.sel=el.dataset.step; S.mod=STEP(el.dataset.step).mod;''','''    case "go": S.tab="parcours"; S.sel=el.dataset.step; S.mod=STEP(el.dataset.step).mod; if(STEP(el.dataset.step).liv) S.liv=STEP(el.dataset.step).liv; if(actById(el.dataset.step)) S.actOpen=el.dataset.step;''')
# Files picked for a reference or a cover; the cover's real size is read by the code.
rep('''document.addEventListener("change",e=>{if(e.target.id==="lPhotos")''','''document.addEventListener("change",e=>{
  if(e.target.id==="rFile"){const f=e.target.files[0];if(!f) return;if(f.type.startsWith("image/")){const r=new FileReader();r.onload=()=>{S.rdraft={name:f.name,url:r.result};const t=document.getElementById("rThumb");if(t) t.innerHTML=`<span class="thumb"><img src="${r.result}" alt=""></span>`;};r.readAsDataURL(f);}else{S.rdraft={name:f.name,url:null};const t=document.getElementById("rThumb");if(t) t.textContent=f.name;}return;}
  if(e.target.id==="cvFile"){const f=e.target.files[0],k=STEP(S.sel).liv;if(!f) return;if(!f.type.startsWith("image/")){S.err.cvFile="Une image est attendue (JPG ou PNG).";render();return;}
    const r=new FileReader();r.onload=()=>{const im=new Image();im.onload=()=>{const L=lightOf(k);L.versions.push({n:L.versions.length+1,img:r.result,name:f.name,w:im.naturalWidth,h:im.naturalHeight,type:f.type,by:P[me()].name,at:stamp(),status:"review"});log(`Pochette : V${L.versions.length} déposée (${im.naturalWidth} × ${im.naturalHeight} px)`);after(`Pochette V${L.versions.length} déposée`);render();};im.src=r.result;};r.readAsDataURL(f);return;}
  if(e.target.id==="lPhotos")''')
rep('''document.addEventListener("keydown",e=>{const t=e.target;if(!t.id||!t.id.startsWith("ie-")) return;''','''document.addEventListener("keydown",e=>{const t=e.target;
  if(t.closest&&t.closest(".fedit")&&t.tagName!=="TEXTAREA"){if(e.key==="Enter"){e.preventDefault();t.closest(".fedit").querySelector("[data-save]").click();}if(e.key==="Escape"){e.preventDefault();S.form=null;render();}return;}
  if(!t.id||!t.id.startsWith("ie-")) return;''')
# Rushes recovered and backup verified are two distinct checks (ticket Production).
rep('''    case "rushes":return !!S.rushes.received&&(!needsTransfer()||S.rushes.transfer==="received"||S.post.versions.length>0);''','''    case "rushes":return !!S.rushes.received&&!!S.rushes.backup&&(!needsTransfer()||S.rushes.transfer==="received"||S.post.versions.length>0);''')
rep('''      if(!S.rushes.received) return A("production","Vérifier que les rushes sont arrivés");''','''      if(!S.rushes.received) return A("production","Vérifier que les rushes sont arrivés");
      if(!S.rushes.backup) return A("production","Vérifier la sauvegarde des rushes");''')
rep('''      ["Rushes reçus",R.received?`Oui, accès vérifié · ${esc(R.received)}`:"Pas encore"]];''','''      ["Rushes reçus",R.received?`Oui, vidéo et audio · ${esc(R.received)}`:"Pas encore"],["Sauvegarde vérifiée",R.backup?`Oui · ${esc(R.backup)}`:"Pas encore"]];''')
rep('''if(!R.received) act=`<button class="btn" type="button" data-act="rreceive">Rushes reçus</button><span class="cap">Le lien fonctionne et les fichiers sont complets. Sinon : signalez un blocage.</span>`;''','''if(!R.received) act=`<button class="btn" type="button" data-act="rreceive">Rushes vidéo et audio reçus</button><span class="cap">Le lien fonctionne et les fichiers sont complets. Sinon : signalez un blocage.</span>`;else if(!R.backup) act=`<button class="btn" type="button" data-act="rbackup">Sauvegarde vérifiée</button><span class="cap">Les rushes sont copiés à deux endroits au moins, et les copies s'ouvrent.</span>`;''')
rep('''${R.received&&!tr?`<p class="note">''','''${R.received&&R.backup&&!tr?`<p class="note">''')
s=s.replace('s.rushes={link:','s.rushes={backup:"Tom Mercier, 24/10, 11:20",link:',1)
rep('''${rest.slice(1,3).map(x=>esc(x.todo.toLowerCase())).join(" · ")}''','''${rest.slice(1,3).map(x=>esc(lcFirst(x.todo))+(x.step?` <span class="t3">(${esc(STEP(x.step).title)})</span>`:"")).join(" · ")}''') if '''${rest.slice(1,3).map(x=>esc(x.todo.toLowerCase())).join(" · ")}''' in s else rep('''${rest.slice(1,3).map(x=>esc(lcFirst(x.todo))).join(" · ")}''','''${rest.slice(1,3).map(x=>esc(lcFirst(x.todo))+(x.step?` <span class="t3">(${esc(STEP(x.step).title)})</span>`:"")).join(" · ")}''')
rep('''S.modal.kind==="sched"?schedModal():retainModal()''','''S.modal.kind==="sched"?schedModal():S.modal.kind==="pqchange"?pqChangeModal():retainModal()''')
# No tabs under the chevrons (ticket « Architecture globale »): decisions live in their step,
# Travail and Activité in the project bar, « Qui fait quoi » in the modal.
_ls=s.split("\n");_ix=[i for i,l in enumerate(_ls) if l.startswith('    <div class="tabs" role="tablist">')];assert len(_ix)==1;del _ls[_ix[0]];s="\n".join(_ls)
rep('''    ${S.tab==="decisions"?decisionsView():S.tab==="tasks"?tasksView():S.tab==="history"?historyView():S.tab==="roles"?rolesView():''','''    ${S.tab==="tasks"?pilotView("Travail",tasksView()):S.tab==="history"?pilotView("Activité",historyView()):''')
rep('''<button class="pitem on" type="button"><span class="dot run"></span><span class="grow">Marketing</span>''','''<button class="pitem ${S.tab==="parcours"?"on":""}" type="button" data-act="tab" data-v="parcours"><span class="dot run"></span><span class="grow">Marketing</span>''')
rep('''<div class="group">Pilotage</div><button class="pitem" type="button">Travail</button><button class="pitem" type="button">Validations</button><button class="pitem" type="button">Activité</button>''','''<div class="group">Pilotage</div><button class="pitem ${S.tab==="tasks"?"on":""}" type="button" data-act="tab" data-v="tasks">Travail</button><button class="pitem" type="button">Validations</button><button class="pitem ${S.tab==="history"?"on":""}" type="button" data-act="tab" data-v="history">Activité</button>''')
rep('''<h1 class="h1">${esc(MODNAME[S.mod])}</h1>${S.mod==="production"&&S.liv&&prodOf(S.liv)&&prodOf(S.liv).mode?pill("",`${ficheByKey(S.liv).name} · ${MODE_LABEL[prodOf(S.liv).mode]}${prodOf(S.liv).who?" · "+nameOf(prodOf(S.liv).who):""}`):""}</div>''','''<h1 class="h1">${esc(MODNAME[S.mod])}</h1><span class="btnrow">${S.mod==="production"&&S.liv&&prodOf(S.liv)&&prodOf(S.liv).mode?pill("",`${ficheByKey(S.liv).name} · ${MODE_LABEL[prodOf(S.liv).mode]}${prodOf(S.liv).who?" · "+nameOf(prodOf(S.liv).who):""}`):""}<button class="btn ghost sm" type="button" data-act="rolespanel">Qui fait quoi</button></span></div>''')
rep('''const actBtn=(a,label,cls)=>a.tab?`<button class="btn ${cls}" type="button" data-act="tab" data-v="${a.tab}">${label}</button>`''','''const actBtn=(a,label,cls)=>a.tab?`<button class="btn ${cls}" type="button" data-act="decpanel">${label}</button>`''')
rep('''function decisionForm(){
  if(S.form!=="decision") return `<div><button class="btn out" type="button" data-act="form" data-v="decision">Noter une information</button></div>`;''','''function decisionForm(stepId){
  const key="decision"+(stepId?":"+stepId:"");
  if(S.form!==key) return `<div><button class="btn out" type="button" data-act="form" data-v="${key}">Noter une information</button></div>`;''')
rep('''<option value="${s.id}" ${s.id==="ready"?"selected":""}>${esc(s.title)}</option>''','''<option value="${s.id}" ${s.id===(stepId||"ready")?"selected":""}>${esc(MODNAME[s.mod])} › ${esc(s.title)}</option>''')
rep('''  ${st!=="blocked"&&isMember(me())&&!S.review.closed?blockerForm(s.id):""}`;''','''  ${stepDecisions(s)}
  ${st!=="blocked"&&isMember(me())&&!S.review.closed?(S.form==="blocker:"+s.id?blockerForm(s.id):S.form==="decision:"+s.id?decisionForm(s.id):`<div class="btnrow"><button class="btn ghost sm" type="button" data-act="form" data-v="blocker:${s.id}">Signaler un blocage</button><button class="btn ghost sm" type="button" data-act="form" data-v="decision:${s.id}">Noter une information</button></div>`):""}`;''')
rep('''.crumbs{font-size:14px;color:var(--text-3)}''','''.crumbs{font-size:14px;color:var(--text-3)}
dialog.modal.wide{width:min(900px,calc(100% - 32px))}
.tr .pill{white-space:normal;height:auto;min-height:24px;padding:3px 10px;line-height:1.25}
.aggrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:10px}
.agcard{border:1px solid var(--hair);border-radius:12px;padding:12px;display:flex;flex-direction:column;gap:8px;min-width:0;overflow-wrap:anywhere}
.agcard.gone{opacity:.6} .agcard .kv{margin:0}
.agav{width:36px;height:36px;border-radius:50%;background:var(--soft);display:grid;place-items:center;font-size:13px;font-weight:600;color:var(--text-2);flex:none}
.pqwrap:has(input[name="pqMode"][value="decl"]:checked) .orgset{display:none}
.pqwrap:not(:has(input[name="pqMode"][value="ext"]:checked)) .coset{display:none}
/* Spacing: every stack of blocks breathes the same way (Sacha 18/10 : « tout est trop collé »). */
.pqwrap{display:flex;flex-direction:column;gap:20px}
.vers{gap:12px} .vers>.vers,.vcard .vb>.vers{margin-top:6px}
.vcard .vb{gap:12px;padding:4px 16px 16px}
.vcard+.vcard{margin-top:2px}
.kv{gap:8px 16px}
.pick{gap:12px} .pick>.src{margin-top:-2px}
.opt{padding:12px 16px}
.agcard{gap:10px;padding:14px}
.aggrid{gap:12px}
.card .card{gap:12px}
.irow .grow>div{margin-top:4px}
.hist{gap:8px}
/* Attendees field (Teams / Outlook) */
.attend{position:relative}
.chips{display:flex;flex-wrap:wrap;gap:6px;align-items:center;min-height:44px;padding:6px 8px;border:1px solid var(--field);border-radius:8px;background:var(--raised)}
.chips.ro{border:0;padding:0;min-height:0;background:transparent}
.chips:focus-within{outline:2px solid var(--sel);outline-offset:1px}
.chip{display:inline-flex;align-items:center;gap:6px;height:30px;padding:0 6px 0 3px;border-radius:999px;background:var(--soft);font-size:14px;max-width:100%}
.chip .cap{font-size:12px}
.chipx{display:grid;place-items:center;width:24px;height:24px;margin-right:-3px;border-radius:50%;border:0;background:transparent;color:var(--text-3);cursor:pointer}
.chipx svg{width:12px;height:12px}
@media (hover:hover) and (pointer:fine){.chipx:hover{background:var(--sunken);color:var(--text)}}
.chipin{flex:1 1 140px;min-width:120px;border:0;background:transparent;height:30px;font:inherit;color:inherit;outline:none}
.sugg{display:none;position:absolute;left:0;right:0;top:calc(100% + 4px);z-index:20;max-height:280px;overflow:auto;background:var(--raised);border:1px solid var(--hair);border-radius:10px;box-shadow:0 8px 24px rgb(0 0 0 / .18);padding:4px}
.attend:focus-within .sugg{display:block}
.sugg button{display:flex;align-items:center;gap:10px;width:100%;padding:8px 10px;border:0;background:transparent;border-radius:8px;text-align:left;font:inherit;color:inherit;cursor:pointer}
.sugg button[hidden]{display:none} .sugg .newwho{border-top:1px solid var(--hair);border-radius:0 0 8px 8px} .sugg button .grow{flex:1;min-width:0}
.sugg button:hover,.sugg button:focus-visible{background:var(--soft);outline:none}
.iconrow{display:flex;gap:2px;flex:none}
.ib{width:36px;height:36px;border-radius:8px;border:0;background:none;color:var(--text-3);display:grid;place-items:center;cursor:pointer;transition:background-color 150ms ease,color 150ms ease}
.ib:focus-visible{outline:2px solid var(--sel);outline-offset:1px}
@media (hover:hover) and (pointer:fine){.ib:hover{background:var(--soft);color:var(--text)}}
.agrow{padding-left:6px;gap:6px 8px}
.agrow .grow{flex:1 1 200px}
.grip{cursor:grab;width:32px} .grip:active{cursor:grabbing}
.agrow.dragging{opacity:.45}
.agrow.over{box-shadow:inset 0 -2px 0 var(--sel)} .agrow.over.before{box-shadow:inset 0 2px 0 var(--sel)}
.ib[data-touch]{display:none}
@media (pointer:coarse){.ib[data-touch]{display:grid}}
.pgroup{font-size:15px;font-weight:600;color:var(--text-3);margin:10px 0 -4px}
.pdone>summary{list-style:none;cursor:pointer;display:flex;align-items:center;gap:8px}
.pdone>summary::-webkit-details-marker{display:none}
.pdone>summary::after{content:"";width:8px;height:8px;border-right:1.6px solid var(--text-3);border-bottom:1.6px solid var(--text-3);transform:rotate(-45deg);margin-top:8px;transition:transform 160ms ease}
.pdone[open]>summary::after{transform:rotate(45deg);margin-top:4px}
.pdonebody{display:flex;flex-direction:column;gap:16px;margin-top:12px}
.choices2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
@media (max-width:640px){.choices2{grid-template-columns:1fr}}
.choice{display:flex;flex-direction:column;gap:6px;text-align:left;padding:18px;border:1px solid var(--border);border-radius:12px;background:var(--raised);font:inherit;color:inherit;cursor:pointer;transition:border-color 150ms ease,background-color 150ms ease}
.choice b{font-size:16px} .choice .src{font-size:14px;color:var(--text-2);line-height:1.45} .choice:focus-visible{outline:2px solid var(--sel);outline-offset:2px}
@media (hover:hover) and (pointer:fine){.choice:hover{border-color:var(--text-3);background:var(--soft)}}
/* Activations page */
.spine .step.arow{display:flex;flex-direction:column;gap:4px;padding:12px} .step.arow::after{display:none}
.step.arow .src{font-size:13px;color:var(--text-3)}
.step.arow.me .s{color:var(--sel);font-weight:600}
.fchips{flex-wrap:wrap;gap:6px;margin:2px 0 6px} .fchips .chipbtn[aria-pressed="true"]{border-color:var(--text);background:var(--soft)}
.frise{display:flex;align-items:center;gap:3px;margin:2px 0}
.frise .ph{width:18px;height:4px;border-radius:2px;background:var(--hair)}
.frise .ph.done{background:var(--ok-fg)} .frise .ph.cur{background:var(--sel)}
.frise .phl{margin-left:6px;font-size:12.5px;color:var(--text-2)}
.frise.big{gap:6px;width:100%}
.frise.big .ph{flex:1;width:auto;height:auto;border-radius:0;background:none;border-top:4px solid var(--hair);padding-top:6px;font-size:13px;color:var(--text-3)}
.frise.big .ph.done{border-color:var(--ok-fg)} .frise.big .ph.cur{border-color:var(--sel);color:var(--text);font-weight:600}
.nowbox{border-radius:12px;padding:16px;display:flex;flex-direction:column;gap:10px;background:var(--soft)}
.nowbox h3{font-size:14px;color:var(--text-3);font-weight:600}
details.infos>summary,details.levers>summary{cursor:pointer;list-style:none;display:flex;align-items:center;gap:10px}
details.infos>summary::-webkit-details-marker,details.levers>summary::-webkit-details-marker{display:none}
details.infos>summary{font-weight:600;font-size:15px;color:var(--text-2)}
details.infos>summary::after,details.levers>summary::after{content:"";width:8px;height:8px;border-right:1.6px solid var(--text-3);border-bottom:1.6px solid var(--text-3);transform:rotate(-45deg);transition:transform 160ms ease;flex:none}
details.infos[open]>summary::after,details.levers[open]>summary::after{transform:rotate(45deg)}
details.levers>summary>.grow{flex:1;min-width:0} details.levers>summary .src{font-size:14px;color:var(--text-2)} details.levers:not([open]){padding-top:14px;padding-bottom:14px}
details.infos[open]>summary{margin-bottom:10px} details.levers[open]>summary{margin-bottom:6px}
.sumbox{border:1px solid var(--hair);border-radius:12px;padding:16px}
.sumtext{color:var(--text);line-height:1.55}
.srow{display:flex;align-items:center;gap:12px;width:100%;padding:14px 16px;border:0;border-bottom:1px solid var(--hair);background:transparent;font:inherit;font-size:16px;color:inherit;text-align:left;cursor:pointer}
.rows .srow:last-child{border-bottom:0} .srow .grow{flex:1;min-width:0} .srow .src{font-size:14px;color:var(--text-3)}
@media (hover:hover) and (pointer:fine){.srow:hover{background:var(--soft)}}
.srow:focus-visible{outline:2px solid var(--sel);outline-offset:-2px}
.dgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px}
.dtile{display:flex;flex-direction:column;gap:4px;align-items:flex-start;padding:12px 14px;border-radius:10px;border:1px solid transparent;background:var(--soft);font:inherit;color:inherit;text-align:left;cursor:pointer;transition:border-color 150ms ease}
.dtile .k{font-size:13px;color:var(--text-3)} .dtile b{font-size:20px;font-weight:600}
.dtile:focus-visible{outline:2px solid var(--sel);outline-offset:2px}
@media (hover:hover) and (pointer:fine){.dtile:hover{border-color:var(--border)}}
@media print{body *{visibility:hidden} dialog.modal,dialog.modal *{visibility:visible} dialog.modal{position:absolute;inset:0 auto auto 0;width:100%;max-width:none;box-shadow:none;border:0;background:#fff;color:#000} .mx,.noprint,.proto{display:none!important}}
.plan4{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:12px}
.src{font-size:14px;color:var(--text-3)}
.pcol{display:flex;flex-direction:column;gap:8px;padding:12px;border-radius:12px;background:var(--soft);min-width:0}
.pcol h3{font-size:15px}
.pcard{display:flex;flex-direction:column;gap:4px;padding:12px;border-radius:10px;background:var(--raised);border:1px solid var(--hair);min-width:0}
.grid3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
@media (max-width:640px){.grid3{grid-template-columns:1fr 1fr}}
/* A module inside a step (campaign, press relations, agency) and its parts are set apart. */
.mod{border-top:1px solid var(--hair);padding-top:20px;margin-top:4px}
.mod>.vers,.mod>.mod{border-top:1px solid var(--hair);padding-top:16px;margin-top:6px}
.mod>.vers:first-child{border-top:0;padding-top:0;margin-top:0}
.protobtn{font:inherit;font-size:14px;height:32px;padding:0 12px;border-radius:999px;border:1px dashed var(--border);background:transparent;color:var(--text-2);cursor:pointer}
@media (hover:hover) and (pointer:fine){.protobtn:hover{background:var(--soft)}}''')
rep('''<h1 class="h1">${acts.length?"Ce que PDS attend de vous":"Rien à faire pour l'instant"}</h1></div>
  ${S.flash?flash():""}''','''<h1 class="h1">${acts.length?"Ce que PDS attend de vous":portalInvited(k)?"Votre prochain rendez-vous avec PDS":"Rien à faire pour l'instant"}</h1></div>
  ${S.flash?flash():""}''')
# The private page is sorted: what is yours first (nearest deadline first), then what waits for PDS, then done (folded)
_i=s.index("  ${shown.map(s=>{const mine=mineSteps.includes(s);return `<section class=\"card\" id=\"ps-${s}\"");_j=s.index("${BODY[s]()}</section>`;}).join(\"\")}",_i)+len("${BODY[s]()}</section>`;}).join(\"\")}")
s=s[:_i]+"  ${portalCards(k,acts,mineSteps,shown)}"+s[_j:]
rep('''function portal(){
  const k=me(), l=S.links[k];''','''function portal(){
  const k=me();if(typeof inflOf==="function"&&inflOf(k)) return creatorPortal(k);
  const l=S.links[k];''')
rep('''  amazon:{name:"Marc Lefèvre",role:"Amazon Music · partenariats",ini:"ML",where:"reseau"},''','''  amazon:{name:"Marc Lefèvre",role:"Amazon Music · partenariats",ini:"ML",where:"reseau"},
  lea:{name:"Léa Moreau",role:"Créatrice · TikTok",ini:"LM",where:"lien",link:"/i/"},
  sami:{name:"Sami Tahar",role:"Créateur · TikTok",ini:"ST",where:"reseau"},
  inesv:{name:"Inès Vale",role:"Créatrice · Instagram",ini:"IV",where:"reseau"},
  noa:{name:"Noa Bessa",role:"Créatrice · TikTok",ini:"NB",where:"reseau"},
  atelier:{name:"Atelier Nocturne",role:"Société de production",ini:"AN",where:"lien",link:"/p/"},
  lumenf:{name:"Lumen Films",role:"Société de production",ini:"LF",where:"lien",link:"/p/"},
  artist:{name:"Mona Lys",role:"Artiste",ini:"ML",where:"reseau"},''')
rep('''const ROLE_ORDER=["cp","charge","dg","da","societe","realExt","mgmt","editor"];''','''const ROLE_ORDER=["cp","charge","dg","da","societe","realExt","mgmt","editor","lea"];''')
rep('''editor:{state:"active",n:1}},''','''editor:{state:"active",n:1},lea:{state:"active",n:1}},''')
# Actions of the four modules
rep('''    default: return;''',acts+'''    default: return;''')
# Proto bar
i=s.index('  <select id="scenSel">');j=s.index("</select>",i)+len("</select>")
s=s[:i]+'''  <select id="scenSel">
    <option value="framestart">Cadrage : début</option>
    <option value="framebrief">Cadrage : Brief en validation</option>
    <option value="planready">Plan du projet à lancer</option>
    <option value="stratstart">Stratégie : début</option>
    <option value="strat">Stratégie : propositions de PO à confirmer</option>
    <option value="stratval">Stratégie : Brief de sortie en validation</option>
    <option value="designstart">Conception : début</option>
    <option value="design">Conception : fiches à valider</option>
    <option value="prodstart">Production : début, qui produit ?</option>
    <option value="quote">Production : devis V1 reçu</option>
    <option value="change">Production : le lieu ne tient plus</option>
    <option value="ready">Production : contrôle avant tournage</option>
    <option value="actstart">Activations : début, leviers à préparer</option>
    <option value="acts">Activations : une semaine après le clip</option>
    <option value="agency">Activations : influence confiée à une agence</option>
    <option value="rpint">Activations : relations presse en interne</option>
    <option value="bilan">Suivi &amp; bilan : début, bilan à préparer</option>
  </select>'''+s[j:]
rep('''S=scenario("quote");document.getElementById("scenSel").value="quote";''','''S=scenario("stratstart");document.getElementById("scenSel").value="stratstart";''')
# Production scenario becomes a stage of the Marketing one
rep('''/* Scenarios: moments of the « Néons » clip ---------------------------------- */
function scenario(k){
  const s=fresh(); S=s;''','''/* Production stage of the scenarios (the Production V2 moments). */
function seedProd(k){
  const s=S;''')
rep('''  s.log.push({text:"Production externe choisie : Studio Ressac",who:"Lina Haddad",at:"14/10, 17:20"},{text:"Call de présentation : 3 tâches confirmées sur 4 proposées par PO",who:"Lina Haddad",at:"15/10, 15:40"});
  s.log.reverse();''','''  s.log.unshift({text:"Call de présentation : 3 tâches confirmées sur 4 proposées par PO",who:"Lina Haddad",at:"15/10, 15:40"});''')
s=s.replace('if(k==="quote"){s.role="charge";s.base=[2026,9,16,18,30];return s;}','if(k==="quote"){s.role="charge";s.base=[2026,9,16,18,30];return true;}')
s=s.replace('if(k==="change"){s.role="cp";s.sel="locs";s.base=[2026,9,21,9,0];return s;}','if(k==="change"){s.role="cp";s.sel="locs";s.base=[2026,9,21,9,0];return true;}')
s=s.replace('if(k==="ready"){s.role="cp";s.sel="ready";s.base=[2026,9,22,15,0];return s;}','if(k==="ready"){s.role="cp";s.sel="ready";s.base=[2026,9,22,15,0];return true;}')
rep('''  s.role="da";s.base=[2026,10,7,10,0];return s;
}
S=scenario("quote");''','''  return false;
}
'''+mk+'''
function rolesView(){return `<section class="card">${BODY.org()}</section>`;}
BODY.kickoffDone=BODY.kickoff;BODY.creativeV2=BODY.creative;Object.assign(BODY,BODY_MK);
'''+scen+'''
S=scenario("stratstart");document.getElementById("scenSel").value="stratstart";''')
# The decisions panel replaces the old « Décisions » tab, wherever it was linked.
s=s.replace('data-act="tab" data-v="decisions"','data-act="decpanel"').replace('{act:"tab",v:"decisions",','{act:"decpanel",')
assert 'data-v="decisions"' not in s
rep('''S.modal.kind==="pqchange"?pqChangeModal():retainModal()''','''S.modal.kind==="pqchange"?pqChangeModal():S.modal.kind==="decisions"?decisionsModal():S.modal.kind==="roles"?rolesModal():S.modal.kind==="areason"?reasonModal():S.modal.kind==="cr"?crModal():S.modal.kind==="newperson"?newPersonModal():S.modal.kind==="dash"?dashModal():S.modal.kind==="report"?reportModal():retainModal()''')
rep('''<dialog class="modal" id="modal" aria-labelledby="mtitle">''','''<dialog class="modal${["decisions","roles","cr","report"].includes(S.modal.kind)?" wide":""}" id="modal" aria-labelledby="mtitle">''')
import json as _j,base64 as _b,os as _o
_D=SP+"/commons"
_meta={x["key"]:x for x in _j.load(open(_D+"/refmeta.json",encoding="utf-8"))}
_lines=[]
for _k in ["ref1","ref2","ref3","ref4","ref5","ref6"]:
    _m=_meta[_k];_lines.append(f'  {_k}:{{credit:{_j.dumps("Photo : "+_m["artist"]+" · "+_m["lic"]+" · Wikimedia Commons",ensure_ascii=False)},url:"data:image/jpeg;base64,{_b.b64encode(open(_D+"/refweb/"+_k+".jpg","rb").read()).decode()}"}}')
_blk="const REFPICS={\n"+",\n".join(_lines)+"\n};\n"
assert s.count("const photosFor=")==1
s=s.replace("const photosFor=",_blk+"const photosFor=",1)
rep('''<button class="pitem" type="button">Cadrage</button>''','''<button class="pitem ${S.mod==="framing"?"on":""}" type="button" data-act="mod" data-v="framing">Cadrage</button>''')
rep('''<button class="pitem ${S.tab==="parcours"?"on":""}" type="button" data-act="tab" data-v="parcours"><span class="dot run"></span><span class="grow">Marketing</span>''','''<button class="pitem ${S.mod!=="framing"?"on":""}" type="button" data-act="mod" data-v="strategy"><span class="dot run"></span><span class="grow">Marketing</span>''')
s=s.replace("Call de présentation","Call de production").replace("call de présentation","call de production")
open("docs/protos/marketing.html","w",encoding="utf-8").write(s)
print("ok",len(s.encode())//1024,"KB")
