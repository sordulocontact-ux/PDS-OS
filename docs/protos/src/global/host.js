/* ======================================================================
   PDS OS — Projet complet. Une seule coquille pour le Cadrage et les quatre
   workflows. Chaque workflow garde son moteur (son état, ses étapes, ses
   gestes) ; la coquille donne une navigation, un « Voir comme », un
   « Aller à », une Vue d'ensemble et une page privée par personne.
   ====================================================================== */
const HI={check:'<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.5 8.5l3 3 6-7"/></svg>',lock:'<svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="3.5" y="7" width="9" height="6.5" rx="1.5"/><path d="M5.5 7V5a2.5 2.5 0 015 0v2"/></svg>',chevR:'<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3.5l4.5 4.5L6 12.5"/></svg>',updown:'<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M5 6l3-3 3 3M5 10l3 3 3-3"/></svg>',home:'<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M3 9l7-6 7 6v8H3z"/></svg>',work:'<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="2.5" y="6" width="15" height="10.5" rx="2"/><path d="M7 6V4.5h6V6"/></svg>',folder:'<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M2.5 5.5h5l2 2h8v8.5h-15z"/></svg>',nodes:'<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="5" cy="5" r="2"/><circle cx="15" cy="7" r="2"/><circle cx="8" cy="15" r="2"/><path d="M6.7 6l6.4.6M14 8.8l-4.5 4.8M5.5 7l2 6"/></svg>',bell:'<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M5 14V9a5 5 0 0110 0v5l1.5 1.5h-13zM8.5 17.5h3"/></svg>'};
const hesc=s=>String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const H={page:"overview",role:"cp",booted:false,painting:false,mods:{},listeners:{},dummies:{},modRole:{}};
const WFS=[["master","Master"],["legal","Juridique"],["marketing","Marketing"],["distribution","Distribution"]];
const WFNAME=Object.fromEntries(WFS.concat([["framing","Cadrage"]]));
const PEOPLE={
  cp:{name:"Lina Haddad",role:"Cheffe de projet",ini:"LH",where:"app"},
  dg:{name:"Claire Morel",role:"Directrice générale",ini:"CM",where:"app"},
  da:{name:"Nadia Benali",role:"Directrice créative",ini:"NB",where:"app"},
  charge:{name:"Tom Mercier",role:"Chargé de production",ini:"TM",where:"app"},
  karim:{name:"Karim Haddou",role:"Ingénieur mix et mastering",ini:"KH",where:"lien"},
  mona:{name:"Mona Lys",role:"Artiste",ini:"ML",where:"lien"},
  sami:{name:"Sami Kader",role:"Co-auteur, compositeur",ini:"SK",where:"lien"},
  yanis:{name:"Yanis Morel",role:"Musicien, basse",ini:"YM",where:"lien"},
  ines:{name:"Inès Robin",role:"Choriste",ini:"IR",where:"lien"},
  societe:{name:"Studio Ressac",role:"Société de production",ini:"SR",where:"lien"},
  realExt:{name:"Bastien Roy",role:"Réalisateur",ini:"BR",where:"lien"},
  mgmt:{name:"Jade Petit",role:"Management de Mona Lys",ini:"JP",where:"lien"},
  editor:{name:"Inès Garnier",role:"Monteuse freelance",ini:"IG",where:"lien"},
  lea:{name:"Léa Moreau",role:"Créatrice TikTok",ini:"LM",where:"lien"}};
const ROLE_ORDER_H=["cp","dg","da","charge","karim","mona","sami","yanis","ines","societe","realExt","mgmt","editor","lea"];
const ROLEMAP={distribution:{da:"ds"},master:{lea:"_creator"}};
/* Each workflow talks to the shell through this: its listeners, its hidden proto controls, « I changed ». */
function hostApi(name){return {
  on(type,fn,cap){(H.listeners[name]=H.listeners[name]||[]).push({type,fn,cap:!!cap});},
  el(id){const d=(H.dummies[name]=H.dummies[name]||{});return d[id]||(d[id]=document.createElement(id==="app"?"div":["roleSel","scenSel"].includes(id)?"select":"button"));},
  changed(){if(H.booted&&!H.painting) paint();}};}
const modKey=(name,r)=>(ROLEMAP[name]||{})[r]||r;
function syncRole(name){const m=H.mods[name],r=H.role,k=modKey(name,r);if(!m.P[k]&&PEOPLE[r].where==="app") m.P[k]={...PEOPLE[r]};if(!m.P[k]) return false;if(H.modRole[name]!==k){m.setRole(k);H.modRole[name]=k;}return true;}
const inner=(html,open,close)=>{const i=html.indexOf(open);if(i<0) return html;const j=html.lastIndexOf(close);return html.slice(i+open.length,j>i?j:undefined);};
const planOn=()=>H.mods.marketing.planLaunched();
/* What a workflow says about itself, recomputed at each paint: never stored. */
function wfInfo(name){
  const m=H.mods[name];syncRole(name);
  const st=m.steps().filter(s=>name!=="marketing"||m.modOf(s.id)!=="framing"),done=st.filter(s=>m.status(s.id)==="done").length;
  const acts=m.actions().filter(a=>name!=="marketing"||m.modOf(a.step)!=="framing"),team=acts.filter(a=>!a.wait&&!a.elsewhere&&PEOPLE[Object.keys(PEOPLE).find(k=>modKey(name,k)===a.r)||a.r]&&!a.ext);
  const cur=st.find(s=>m.status(s.id)==="current")||st.find(s=>m.status(s.id)!=="done");
  let status=!planOn()?"Non démarré":done===st.length?"Terminé":m.blocked&&m.blocked()?"Bloqué":!team.length&&acts.length?"En attente":"En cours";
  return {status,done,total:st.length,cur:cur?m.title(cur.id):"—",acts};
}
const WFTONE={"Non démarré":["",""],"En cours":["info","run"],"En attente":["warn","wait"],"Bloqué":["bad","block"],"Terminé":["ok","done"]};
const hpill=(t,x)=>`<span class="pill ${t}">${hesc(x)}</span>`;
const hnameOf=(name,k)=>{const m=H.mods[name];return (m.P[k]&&m.P[k].name)||k;};
const hostKeyOf=(name,k)=>Object.keys(PEOPLE).find(h=>modKey(name,h)===k)||k;
/* All my actions across the project, the framing first. */
function myActions(){
  const r=H.role,l=[];
  H.mods.marketing.actions().forEach(a=>{if(a.r===r&&!a.wait&&!a.elsewhere) l.push({wf:H.mods.marketing.modOf(a.step)==="framing"?"framing":"marketing",a});});
  if(planOn()) ["master","legal","distribution"].forEach(n=>{syncRole(n);H.mods[n].actions().forEach(a=>{if(hostKeyOf(n,a.r)===r&&!a.wait&&!a.elsewhere) l.push({wf:n,a});});});
  return l.sort((x,y)=>(x.wf==="framing"?-1:0)-(y.wf==="framing"?-1:0));
}
const stepTitle=(wf,id)=>{const m=H.mods[wf==="framing"?"marketing":wf];return id?m.title(id):"";};
function openAct(wf,step){if(wf==="framing"||wf==="marketing"){H.page=wf;H.mods.marketing.select(step);}else{H.page=wf;if(step) H.mods[wf].select(step);}}
/* ----------------------------- pages ---------------------------------- */
function nowCardH(){
  const l=myActions();if(!l.length) return `<section class="card now"><div class="eyebrow">${hpill("","Rien à faire pour vous")}</div><h2 style="font-size:20px">Tout ce qui vous concerne est fait</h2><p class="note">Les autres avancent ; la Vue d'ensemble dit qui est attendu.</p></section>`;
  const x=l[0];return `<section class="card now"><div class="eyebrow">${hpill("info","À vous")}<span class="src">${hesc(WFNAME[x.wf])} › ${hesc(stepTitle(x.wf,x.a.step))}</span></div><h2 style="font-size:20px">${hesc(x.a.todo)}</h2>
   <div class="btnrow"><button class="btn" type="button" data-hact="open" data-wf="${x.wf}" data-step="${x.a.step||""}">Ouvrir</button>${l.length>1?`<span class="src">Et ${l.length-1} autre${l.length>2?"s":""} : ${l.slice(1,3).map(y=>hesc(y.a.todo.toLowerCase())+" ("+hesc(WFNAME[y.wf])+")").join(" · ")}</span>`:""}</div></section>`;
}
function overview(){
  const mk=H.mods.marketing;
  if(!planOn()){const fr=mk.steps().filter(s=>mk.modOf(s.id)==="framing"),cur=fr.find(s=>mk.status(s.id)!=="done");
    return `<nav class="crumbs">Néons › Vue d'ensemble</nav><div class="headrow"><h1 class="h1">Néons</h1>${hpill("","Non démarré")}</div>
     <div class="facts"><span>Mona Lys · Single</span><span>Budget <b>25 000 € HT</b></span><span>Responsable <b>Lina Haddad</b></span><span>Sortie <b>Sam. 05/12/2026</b></span></div>
     ${nowCardH()}
     <section class="card"><h2 style="font-size:18px">Avant les workflows</h2><p class="note">Le projet avance dans cet ordre : le Cadrage, puis le Plan du projet. Au lancement du plan, le Master, le Juridique, le Marketing et la Distribution démarrent.</p>
      <div class="rows">${fr.map(s=>`<div class="irow"><span class="grow"><b>${hesc(mk.title(s.id))}</b><br><span class="src">${mk.status(s.id)==="done"?"Fait":s===cur?"En cours":"Après l'étape précédente"}</span></span>${hpill(mk.status(s.id)==="done"?"ok":s===cur?"info":"",mk.status(s.id)==="done"?"Fait":s===cur?"En cours":"À venir")}</div>`).join("")}</div>
      <div class="btnrow"><button class="btn out" type="button" data-hact="page" data-v="framing">Ouvrir le Cadrage</button></div></section>`;}
  const cards=WFS.map(([n,l])=>{const i=wfInfo(n),t=WFTONE[i.status],mine=i.acts.filter(a=>hostKeyOf(n,a.r)===H.role&&!a.wait&&!a.elsewhere),next=mine[0]||i.acts.find(a=>!a.elsewhere);
    return `<button class="wfcard" type="button" data-hact="page" data-v="${n}"><span class="eyebrow" style="justify-content:space-between;width:100%"><b>${hesc(l)}</b>${hpill(t[0],i.status)}</span>
      <span class="src">Étape ${Math.min(i.done+1,i.total)} sur ${i.total} · ${hesc(i.cur)}</span><span class="prog"><span style="width:${Math.round(i.done/Math.max(1,i.total)*100)}%"></span></span>
      <span class="s ${mine.length?"me":""}">${next?(mine.length?"À vous · ":hesc(hnameOf(n,next.r))+" · ")+hesc((next.todo||"").charAt(0).toLowerCase()+(next.todo||"").slice(1)):"Rien en attente"}</span></button>`;}).join("");
  const deps=[["Master","Master final","Distribution",H.mods.master.status("final")==="done"],["Marketing","Pochette livrée","Distribution",mk.coverDelivered()],["Juridique","Prêt pour la sortie","Distribution",H.mods.legal.status("ready")==="done"],["Master","Durée du master final","Juridique · SACEM",H.mods.master.status("final")==="done"]];
  return `<nav class="crumbs">Néons › Vue d'ensemble</nav><div class="headrow"><h1 class="h1">Néons</h1>${hpill("info","En cours")}</div>
   <div class="facts"><span>Mona Lys · Single</span><span>Budget <b>25 000 € HT</b></span><span>Responsable <b>Lina Haddad</b></span><span>Master final <b>Sam. 21/11/2026</b></span><span>Sortie <b>Sam. 05/12/2026</b></span></div>
   ${nowCardH()}
   <section class="card"><h2 style="font-size:18px">Les workflows</h2><div class="wfgrid">${cards}</div></section>
   <section class="card"><h2 style="font-size:18px">Ce qui dépend d'un autre workflow</h2><div class="rows">${deps.map(([a,w,b,ok])=>`<div class="irow"><span class="grow"><b>${hesc(w)}</b><br><span class="src">${hesc(a)} → ${hesc(b)}</span></span>${hpill(ok?"ok":"",ok?"Disponible":"Attendu")}</div>`).join("")}</div></section>`;
}
function workPage(kind){
  const l=myActions().filter(x=>kind!=="valid"||/^(Valider|Vérifier|Approuver|Clôturer avec|Arbitrer)/.test(x.a.todo));
  return `<nav class="crumbs">Néons › ${kind==="valid"?"Validations":"Travail"}</nav><div class="headrow"><h1 class="h1">${kind==="valid"?"Validations":"Travail"}</h1></div>
   <section class="card">${l.length?`<div class="rows">${l.map(x=>`<button class="srow" type="button" data-hact="open" data-wf="${x.wf}" data-step="${x.a.step||""}"><span class="grow"><b>${hesc(x.a.todo)}</b><br><span class="src">${hesc(WFNAME[x.wf])} › ${hesc(stepTitle(x.wf,x.a.step))}${x.a.due?" · "+hesc(x.a.due):""}</span></span><span class="t3">${HI.chevR}</span></button>`).join("")}</div>`:`<p class="note">${kind==="valid"?"Aucune validation ne vous attend.":"Rien ne vous attend pour l'instant."}</p>`}</section>`;
}
function activityPage(){
  const l=[];[["marketing","Marketing"],["master","Master"],["legal","Juridique"],["distribution","Distribution"]].forEach(([n,w])=>(H.mods[n].log()||[]).forEach(e=>l.push({w,text:e.text,who:e.who,at:e.at})));
  return `<nav class="crumbs">Néons › Activité</nav><div class="headrow"><h1 class="h1">Activité</h1></div><section class="card"><ul class="hist">${l.slice(0,80).map(e=>`<li><span class="noc">•</span><span><b>${hesc(e.w)}</b> · ${hesc(e.text)} <span class="src">· ${hesc(e.who||"")} ${hesc(e.at||"")}</span></span></li>`).join("")}</ul></section>`;
}
function locked(name){return `<nav class="crumbs">Néons › ${hesc(WFNAME[name])}</nav><div class="headrow"><h1 class="h1">${hesc(WFNAME[name])}</h1>${hpill("","Non démarré")}</div>
  <section class="card"><div class="callout">${HI.lock}<span>Ce workflow démarre au lancement du plan du projet, après le Cadrage.</span></div><div class="btnrow"><button class="btn out" type="button" data-hact="page" data-v="framing">Ouvrir le Cadrage</button></div></section>`;}
function modPage(name){
  const m=H.mods[name==="framing"?"marketing":name];const key=name==="framing"?"marketing":name;syncRole(key);
  if(key==="marketing") m.setMod(name==="framing"?"framing":(m.mod()==="framing"?"strategy":m.mod()));
  if(name!=="framing"&&!planOn()) return {html:locked(name)};
  return {html:inner(m.html(),'<div class="wrap">','</div></main>'),mod:key};
}
function shellPage(){
  const mine=myActions(),cnt=wf=>mine.filter(x=>x.wf===wf||(wf==="marketing"&&x.wf==="marketing")).length;
  const pg=H.page,body=pg==="overview"?{html:overview()}:pg==="work"?{html:workPage()}:pg==="valid"?{html:workPage("valid")}:pg==="activity"?{html:activityPage()}:modPage(pg);
  const item=(v,l,dot)=>`<button class="pitem ${pg===v?"on":""}" type="button" data-hact="page" data-v="${v}">${dot!=null?`<span class="dot ${dot}"></span>`:""}<span class="grow">${hesc(l)}</span>${cnt(v)?`<span class="mine">${cnt(v)}</span>`:""}</button>`;
  const p=PEOPLE[H.role];
  return `<div class="shell"><nav class="mainnav" aria-label="Navigation principale"><span class="brand">PDS</span>
    ${[["home","Accueil","overview"],["work","Travail","work"],["folder","Projets","overview"],["nodes","Réseau",null]].map(([i,l,v])=>`<button class="navbtn ${(v&&pg===v)||(i==="folder"&&!["work"].includes(pg))?"on":""}" type="button" aria-label="${l}" ${v?`data-hact="page" data-v="${v}"`:""}>${HI[i]}${i==="work"&&mine.length?`<span class="cnt">${mine.length}</span>`:""}<span class="tip">${l}</span></button>`).join("")}
    <div class="grow"></div><button class="navbtn" type="button" aria-label="Notifications">${HI.bell}</button><span class="avatar" aria-hidden="true">${hesc(p.ini)}</span></nav>
   <nav class="projnav" aria-label="Sections du projet"><div class="switcher"><span>Néons</span><span class="t3">${HI.updown}</span></div>
    ${item("overview","Vue d'ensemble")}${item("framing","Cadrage",H.mods.marketing.status("fr4")==="done"?"done":"run")}
    <div class="group">Workflows</div>${WFS.map(([n,l])=>item(n,l,WFTONE[wfInfo(n).status][1])).join("")}
    <div class="group">Pilotage</div>${item("work","Travail")}${item("valid","Validations")}${item("activity","Activité")}</nav>
   <main class="content" ${body.mod?`data-mod="${body.mod}"`:""}><nav class="mnav" aria-label="Sections du projet">${[["overview","Vue d'ensemble"],["framing","Cadrage"]].concat(WFS,[["work","Travail"]]).map(([v,l])=>`<button class="chipbtn" type="button" data-hact="page" data-v="${v}" aria-pressed="${pg===v}">${hesc(l)}${cnt(v)?` <span class="mine">${cnt(v)}</span>`:""}</button>`).join("")}</nav><div class="wrap">${body.html}</div></main></div>`;
}
/* One private page per person: the cards of every workflow that asks something of them. */
function portalPage(r){
  const p=PEOPLE[r],secs=[];
  ["master","legal","marketing","distribution"].forEach(n=>{const m=H.mods[n],k=modKey(n,r);if(!m.P[k]||m.P[k].where==="app") return;syncRole(n);
    let h=inner(m.html(),'<div class="pwrap">','</div></div>');
    h=h.replace(/<section class="card"><h2>Votre contact chez PDS<\/h2>[\s\S]*?<\/section>/,"").replace(/^\s*<div><p class="cap">[\s\S]*?<\/h1><\/div>/,"");
    h=h.replace(/<section class="card"><h1 class="h1">Rien à faire pour l'instant<\/h1><\/section>/,"");
    if(/<section/.test(h)) secs.push(`<div class="pmod" data-mod="${n}"><h2 class="pgroup">${hesc(WFNAME[n])}</h2>${h}</div>`);});
  const any=["master","legal","marketing","distribution"].some(n=>{const k=modKey(n,r);return H.mods[n].P[k]&&H.mods[n].actions().some(a=>a.r===k);});
  return `<div class="portal"><header class="pbar"><span style="display:flex;align-items:center;gap:10px"><span class="brand" style="margin:0">PDS</span><b>« Néons » · ${hesc(p.name)}</b></span><span class="lockline">${HI.lock} Lien privé · sans compte</span></header>
   <div class="pwrap"><div><p class="cap">Néons · Mona Lys · single · ${hesc(p.role)}</p><h1 class="h1">${any?"Ce que PDS attend de vous":"Rien à faire pour l'instant"}</h1></div>
   ${secs.join("")}<section class="card"><h2>Votre contact chez PDS</h2><div class="eyebrow"><span class="avatar sm" aria-hidden="true">LH</span><span><b>Lina Haddad</b> · Cheffe de projet</span></div></section></div></div>`;
}
/* ----------------------------- engine --------------------------------- */
function paint(){
  H.painting=true;
  try{const r=H.role;document.getElementById("app").innerHTML=PEOPLE[r].where==="app"?shellPage():portalPage(r);}finally{H.painting=false;}
  const d=document.getElementById("modal");if(d&&d.showModal&&!d.open){try{d.showModal();const f=d.querySelector("#pkQ,textarea,input");if(f) f.focus();}catch(_){}}
  const a=document.querySelector("[data-autofocus]");if(a) a.focus();
}
const _sip=Event.prototype.stopImmediatePropagation;Event.prototype.stopImmediatePropagation=function(){this.__stop=true;return _sip.call(this);};
function route(e,cap){if(e.__stop) return;
  const w=e.target&&e.target.closest?e.target.closest("[data-mod]"):null;if(!w) return;
  for(const l of (H.listeners[w.dataset.mod]||[])){if(l.type===e.type&&l.cap===cap){l.fn(e);if(e.__stop) return;}}
}
function hostClick(e){
  const el=e.target.closest&&e.target.closest("[data-hact]");if(!el) return false;
  const a=el.dataset.hact;
  if(a==="page"){H.page=el.dataset.v;}
  else if(a==="open"){openAct(el.dataset.wf,el.dataset.step||null);}
  paint();window.scrollTo({top:0});return true;
}
const SCEN_H={
  start:{label:"Projet accepté : cadrage à faire",mk:"framestart",master:"start",legal:"start",distribution:"start",page:"overview"},
  brief:{label:"Cadrage : Brief en validation",mk:"framebrief",master:"start",legal:"start",distribution:"start",page:"framing",role:"dg"},
  plan:{label:"Plan du projet à lancer",mk:"planready",master:"start",legal:"start",distribution:"start",page:"framing"},
  launched:{label:"Plan lancé : les workflows démarrent",mk:"stratstart",master:"start",legal:"launched",distribution:"start",page:"overview"},
  mid:{label:"Mi-octobre : stratégie, brief mix, contrats",mk:"strat",master:"brief",legal:"direction",distribution:"start",page:"overview"},
  prod:{label:"Fin octobre : production, mix, SACEM",mk:"quote",master:"v1",legal:"sacem",distribution:"start",page:"overview"},
  pre:{label:"Mi-novembre : master final, dossier de distribution",mk:"ready",master:"final",legal:"ready",distribution:"ready",page:"overview"},
  release:{label:"Jour de sortie",mk:"acts",master:"invoice",legal:"ready",distribution:"online",page:"overview"},
  after:{label:"Après la sortie : bilans et clôtures",mk:"bilan",master:"invoice",legal:"invoice",distribution:"closing",page:"overview"}};
function goH(k){
  if(SCEN_H[k]){const s=SCEN_H[k];H.mods.marketing.go(s.mk);["master","legal","distribution"].forEach(n=>H.mods[n].go(s[n]));H.page=s.page;H.role=s.role||"cp";}
  else{const [n,v]=k.split(":");if(n==="marketing"){H.mods.marketing.go(v);H.page=H.mods.marketing.mod()==="framing"?"framing":"marketing";}else{if(!planOn()) H.mods.marketing.go("stratstart");H.mods[n].go(v);H.page=n;}H.role="cp";}
  H.modRole={};document.getElementById("roleSel").value=H.role;
}
function bootH(scens){
  H.mods={marketing:MOD_marketing(hostApi("marketing")),master:MOD_master(hostApi("master")),legal:MOD_legal(hostApi("legal")),distribution:MOD_distribution(hostApi("distribution"))};
  const rs=document.getElementById("roleSel");rs.innerHTML=ROLE_ORDER_H.map(k=>`<option value="${k}">${hesc(PEOPLE[k].name)} · ${hesc(PEOPLE[k].role)}${PEOPLE[k].where==="lien"?" (lien)":""}</option>`).join("");
  const ss=document.getElementById("scenSel");
  ss.innerHTML=`<optgroup label="Le projet">${Object.entries(SCEN_H).map(([k,s])=>`<option value="${k}">${hesc(s.label)}</option>`).join("")}</optgroup>`+scens.map(([n,l,opts])=>`<optgroup label="${hesc(l)}">${opts.map(([v,t])=>`<option value="${n}:${v}">${hesc(l)} : ${hesc(t)}</option>`).join("")}</optgroup>`).join("");
  rs.addEventListener("change",e=>{H.role=e.target.value;H.modRole={};paint();window.scrollTo({top:0});});
  ss.addEventListener("change",e=>{document.getElementById("toast").hidden=true;goH(e.target.value);paint();window.scrollTo({top:0});});
  document.getElementById("resetBtn").addEventListener("click",()=>{ss.value="start";goH("start");paint();window.scrollTo({top:0});});
  ["click","input","change","keydown","keyup","mousedown","pointerdown","dragstart","dragover","dragleave","drop","dragend","cancel","focusin"].forEach(t=>{
    document.addEventListener(t,e=>route(e,true),true);
    document.addEventListener(t,e=>{if(t==="click"&&hostClick(e)) return;route(e,false);},false);});
  ss.value="start";goH("start");H.booted=true;paint();
}
