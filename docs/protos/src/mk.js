/* ======================================================================
   Marketing complet : Stratégie, Conception, Production, Activations,
   Suivi & bilan. Same pattern everywhere (VISION-UX § 4).
   ====================================================================== */
const MODS=[["strategy","Stratégie"],["design","Conception"],["production","Production"],["activations","Activations"],["review","Suivi & bilan"]];
const MODNAME=Object.fromEntries(MODS);
const RELEASE=[2026,11,5]; // Sam. 05/12/2026
const relDay=n=>new Date(RELEASE[0],RELEASE[1],RELEASE[2]+n);
const pad2=n=>String(n).padStart(2,"0");
const fullDate=d=>`${DAYS[d.getDay()]} ${pad2(d.getDate())}/${pad2(d.getMonth()+1)}/${d.getFullYear()}`;
const isoOf=d=>`${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
const fromIso=s=>{const [y,m,d]=s.split("-");return new Date(+y,+m-1,+d);};
const jLabel=n=>n===0?"J":n>0?`J+${n}`:`J${n}`;
const fmtN=n=>new Intl.NumberFormat("fr-FR").format(n);

/* ---------- Stratégie ---------- */
const STRAT_PROPS=[
  {dim:"Positionnement",text:"Conquérir un nouveau public",quote:"on veut aller chercher au-delà de la fanbase, des gens qui ne connaissent pas encore Mona"},
  {dim:"Publics prioritaires",text:"Cœur de cible : 18–24 ans qui écoutent du R&B alternatif",quote:"le cœur, c'est les 18-24 qui écoutent du R&B alternatif"},
  {dim:"Narratif de sortie",text:"Une nuit blanche à Paris, entre deux lumières",quote:"Néons, c'est une nuit blanche à Paris, entre deux lumières"},
  {dim:"Dispositif",lever:"influence",text:"Influence : une douzaine de créateurs",quote:"une douzaine de créateurs TikTok, pas plus"},
  {dim:"Dispositif",lever:"rp",text:"Relations presse, avec un dossier de presse",quote:"on fait une vraie campagne presse, avec le dossier"},
  {dim:"Livrables engagés",text:"Clip officiel, en 16:9 et en 9:16",quote:"le clip doit exister en vertical aussi"},
  {dim:"Livrables engagés",text:"Teasers × 4, 15 s, en 9:16",quote:"quatre teasers de quinze secondes avant la sortie"},
  {dim:"Livrables engagés",text:"Pochette",quote:"la pochette, on la veut dans la même lumière que le clip"},
  {dim:"Calendrier de lancement",text:"Sortie du clip une semaine après le titre",quote:"le clip sort une semaine après le titre"},
  {dim:"Objectifs & KPIs",text:"200 000 streams à 4 semaines",quote:"on vise 200 000 streams au bout d'un mois",metric:"streams",target:200000,j:28}
];
/* An objective is an indicator, a target and a deadline, so the gap to the result is
   computed by the code, never written (MKT-BIL-002). A unit links it to what activations measure. */
const OBJ_METRICS=[["streams","Streams",null,"les streams viennent du distributeur, pas d'une activation"],["vues","Vues","vues"],["retombees","Retombées presse","retombées"],["ajouts","Ajouts en playlist","ajouts en playlist"],["personnes","Personnes présentes","personnes"],["abonnes","Abonnés",null,"aucune activation ne relève les abonnés"]];
const objMetric=x=>OBJ_METRICS.find(m=>m[0]===x.metric);
const objLine=x=>{const m=objMetric(x);return m&&x.target&&x.j!=null?`${m[1]} · cible ${fmtN(x.target)} · au ${fullDate(relDay(x.j))} (${jLabel(x.j)})`:"Indicateur, cible ou échéance à préciser";};
/* What PO proposes is an item decided one by one: retained (possibly corrected),
   set aside, or still to decide. Nothing is pre-checked (VISION-UX rules 2, 11, 12). */
const stratItems=()=>STRAT_PROPS.map((p,i)=>({id:"sp"+i,dim:p.dim,lever:p.lever,text:p.text,quote:p.quote,from:"Échange stratégique du 05/10",state:"proposed",...(p.metric?{metric:p.metric,target:p.target,j:p.j}:{})}));
const itemOf=i=>S.strat.items.find(x=>x.id==="sp"+i);
const kept=i=>{const x=itemOf(i);return !!x&&x.state==="kept";};
const dimItems=name=>S.strat.items.filter(x=>x.dim===name);
const ITEM_COLLS=()=>[["strat",S.strat.items],["design",S.design.items],["kick",S.kick.items]].concat(Object.keys(S.prods).filter(k=>S.prods[k]&&S.prods[k].prep).map(k=>["prep:"+k,S.prods[k].prep.items]));
const itemStep=c=>c.startsWith("prep:")?"iv"+c.slice(5)+"-2":ITEM_STEP[c];
function findItem(id){for(const [c,l] of ITEM_COLLS()){const x=l.find(y=>y.id===id);if(x) return [c,x];}return [null,null];}
const LEVERS=[
  {k:"social",name:"Social organique",src:"Brief de cadrage › Besoins"},
  {k:"influence",name:"Influence",prop:3},
  {k:"rp",name:"Relations presse / médias",prop:4},
  {k:"playlists",name:"Pitching playlists",src:"Brief de cadrage › Besoins"},
  {k:"clip",name:"Clip / contenus vidéo",src:"Brief de cadrage › Besoins"},
  {k:"pub",name:"Publicité en ligne",arb:true,src:"Brief de cadrage › Besoins « un peu de pub s'il reste du budget »"},
  {k:"live",name:"Live / showcase",arb:true,src:"Brief de cadrage › Besoins « un showcase à Paris, si possible »"},
  {k:"radio",name:"Radio",no:true},
  {k:"partners",name:"Partenariats",no:true}
];
function leverState(l){
  if(S.strat.arb[l.k]) return S.strat.arb[l.k];
  if(l.no) return "non";
  if(l.prop!=null){const x=itemOf(l.prop);return !x||x.state==="proposed"?"arb":x.state==="kept"?"retenu":"non";}
  return l.arb?"arb":"retenu";
}
const LSTATE={retenu:["ok","Retenu"],arb:["warn","À arbitrer"],non:["","Non retenu"]};
const LIVRABLES=[
  {key:"clip",prop:5,name:"Clip officiel",fmt:"16:9 et 9:16, 3 min",lever:"Clip / contenus vidéo"},
  {key:"teasers",prop:6,name:"Teasers × 4",fmt:"15 s, 9:16",lever:"Social organique"},
  {key:"pochette",prop:7,name:"Pochette",fmt:"3000 × 3000 px",lever:"Hors levier"}
];
const TEMPS=[
  {k:"annonce",name:"Annonce de la sortie",j:-14,type:"Annonce",canal:"Organique",liv:"pochette"},
  {k:"teaser",name:"Premier teaser",j:-7,type:"Teaser",canal:"Organique",liv:"teasers"},
  {k:"sortie",name:"Sortie du titre",j:0,type:"Sortie",canal:"Sortie"},
  {k:"clipout",name:"Sortie du clip",j:7,type:"Sortie",canal:"Sortie",liv:"clip",prop:8}
];
const tempsForts=()=>TEMPS.filter(t=>t.prop==null||kept(t.prop)).concat(dimItems("Calendrier de lancement").filter(x=>x.state==="kept"&&x.j!=null).map(x=>({name:x.text,j:x.j,type:x.type||"Autre",canal:"Autre",manual:true}))).sort((a,b)=>a.j-b.j);
const UPSTREAM=[["Conception terminée",-21],["Production terminée",-10],["Validation",-4]];
const BUDGET_LINES=[
  {name:"Clip officiel",lever:"clip",amount:18000,src:"Brief de cadrage › Budget « 18 pour le clip »"},
  {name:"Influence · 12 créateurs",lever:"influence",amount:3500,src:"Estimé par Lina Haddad"},
  {name:"Relations presse",lever:"rp",amount:1200,src:"Estimé par Lina Haddad"},
  {name:"Pochette",lever:null,amount:800,src:"Estimé par Nadia Benali"},
  {name:"Publicité en ligne",lever:"pub",amount:1500,src:"Brief de cadrage › Besoins"}
];
const BUDGET_ENV=25000;
function budget(){
  const st=k=>k?leverState(LEVERS.find(l=>l.k===k)):"retenu";
  const lines=BUDGET_LINES.map(l=>({...l,state:st(l.lever)})).concat(dimItems("Budget stratégie").filter(x=>x.state==="kept").map(x=>({name:x.text,amount:x.amount,src:x.src,state:"retenu"})));
  const proposed=lines.filter(l=>l.state==="retenu").reduce((a,l)=>a+l.amount,0);
  const arb=lines.filter(l=>l.state==="arb").reduce((a,l)=>a+l.amount,0);
  const q=activeQuote(), validated=q?q.amount:0;
  return {lines,proposed,arb,validated,rest:BUDGET_ENV-proposed-arb};
}
function dims(){
  const lv=LEVERS.map(l=>({...l,state:leverState(l)}));
  const by=name=>{const it=dimItems(name),k=it.filter(x=>x.state==="kept");if(it.some(x=>x.state==="proposed")) return "arb";if(!k.length) return "todo";
    if(name==="Objectifs & KPIs"&&k.some(x=>!objMetric(x)||!x.target||x.j==null)) return "run";
    if(name==="Livrables engagés"&&k.some(x=>x.manual&&!x.fmt)) return "run";
    return "ok";};
  const why=name=>{const it=dimItems(name),k=it.filter(x=>x.state==="kept"),p=it.filter(x=>x.state==="proposed").length;if(p) return `${p} proposition${p>1?"s":""} à confirmer ou écarter`;
    if(name==="Objectifs & KPIs"){const n=k.filter(x=>!objMetric(x)||!x.target||x.j==null).length;if(n) return `${n} objectif${n>1?"s":""} sans indicateur, cible ou échéance`;}
    if(name==="Livrables engagés"){const n=k.filter(x=>x.manual&&!x.fmt).length;if(n) return `${n} livrable${n>1?"s":""} sans format`;}
    return k.length?"":"rien de dit";};
  const cal=dimItems("Calendrier de lancement");
  return [
    {name:"Positionnement",kind:"text",st:by("Positionnement"),why:why("Positionnement"),add:"Ajouter une réponse"},
    {name:"Publics prioritaires",kind:"text",st:by("Publics prioritaires"),why:why("Publics prioritaires"),add:"Ajouter un public"},
    {name:"Narratif de sortie",kind:"text",st:by("Narratif de sortie"),why:why("Narratif de sortie"),add:"Ajouter un angle"},
    {name:"Dispositif",kind:"levers",st:lv.some(l=>l.state==="arb")?"arb":"ok",why:(n=>n?`${n} levier${n>1?"s":""} à retenir ou non`:"")(lv.filter(l=>l.state==="arb").length),levers:lv,add:lv.some(l=>l.state==="non")?"Ajouter un levier":null},
    {name:"Livrables engagés",kind:"livs",st:by("Livrables engagés"),why:why("Livrables engagés"),add:"Ajouter un livrable"},
    {name:"Calendrier de lancement",kind:"cal",st:cal.some(x=>x.state==="proposed")?"arb":"ok",why:cal.some(x=>x.state==="proposed")?"un temps fort à confirmer ou écarter":"",add:"Ajouter un temps fort"},
    {name:"Budget stratégie",kind:"bud",st:budget().arb?"arb":"ok",why:budget().arb?`${euro(budget().arb)} de lignes à arbitrer`:"",add:"Ajouter une ligne"},
    {name:"Objectifs & KPIs",kind:"text",st:by("Objectifs & KPIs"),why:why("Objectifs & KPIs"),add:"Ajouter un objectif"}
  ];
}
const DSTATE={todo:["","À compléter"],run:["info","En cours"],arb:["warn","À arbitrer"],ok:["ok","Complété"]};
const restArb=()=>dims().filter(d=>d.st==="arb").map(d=>d.name);
const stratFrozen=()=>!!S.strat.review&&!S.strat.validated&&!S.strat.review.changes;

/* Proposals of PO, each with the sentence it comes from (VISION-UX rules 11 and 12). */
function itemRow(x,canEdit,extra){
  const ed=canEdit&&S.form==="edit:"+x.id;
  const src=[x.edited?`Modifié par ${x.edited}`:"",x.quote?`« ${x.quote} » · ${x.from}`:x.src||""].filter(Boolean).join(" · ");
  const st=x.state==="kept"?pill("ok","Confirmé"):x.state==="discarded"?pill("","Écarté"):pill("warn","À confirmer");
  const btn=(v,l,cls)=>`<button class="btn ${cls} sm" type="button" data-act="itm" data-v="${v}" data-id="${x.id}">${l}</button>`;
  const editBtn=`<button class="btn ghost sm" type="button" data-act="form" data-v="edit:${x.id}">Modifier</button>`;
  return `<div class="irow ${x.state==="proposed"?"todo":""}"><span class="grow">${extra?`<span class="cap">${extra}</span><br>`:""}${ed?`<label class="sr" for="ie-${x.id}">Texte</label><input class="in" id="ie-${x.id}" value="${esc(x.text)}"${S.err["ie-"+x.id]?' aria-invalid="true"':""}>${errOf("ie-"+x.id)}<span class="src">Proposé : ${esc(x.orig||x.text)}</span>`:`<b class="${x.state==="discarded"?"strike":""}">${esc(x.text)}</b>`}
    ${src&&!ed?`<br><span class="src">${esc(src)}</span>`:""}${x.state!=="proposed"&&x.by&&!ed?`<br><span class="src">${x.state==="kept"?"Confirmé":"Écarté"} par ${esc(x.by)}</span>`:""}</span>
   <span class="btnrow">${ed?`<button class="btn sm" type="button" data-act="itmsave" data-id="${x.id}">Enregistrer</button><button class="btn ghost sm" type="button" data-act="form" data-v="">Annuler</button>`
     :!canEdit?st:x.state==="proposed"?btn("keep","Confirmer","out")+editBtn+btn("discard","Écarter","ghost"):x.state==="kept"?st+editBtn+btn("discard","Écarter","ghost"):st+btn("keep","Confirmer","ghost")}</span></div>`;
}
const counter=items=>{const n=items.filter(x=>x.state==="proposed").length;return n?`${n} à confirmer`:"";};
/* « Ajouter » lives in the head of its list (VISION-UX rule 17); the form opens right under it. */
function groupHead(coll,group,label,canEdit){
  const open=S.form==="add:"+coll+":"+group;
  return canEdit&&label?(open?addForm(coll,group):`<div class="btnrow" style="justify-content:flex-end"><button class="btn out sm" type="button" data-act="form" data-v="add:${coll}:${esc(group)}">${esc(label)}</button></div>`):"";
}
function addForm(coll,group){
  const f=(id,l,ph,type)=>`<div class="field"><label for="${id}">${l}</label><input class="in" id="${id}"${type?` type="${type}"`:""} placeholder="${esc(ph||"")}"${S.err[id]?' aria-invalid="true"':""}>${errOf(id)}</div>`;
  let body="";
  if(coll==="strat"){
    if(group==="Dispositif") body=`<div class="field"><label for="ad-lever">Levier *</label><select class="in" id="ad-lever">${LEVERS.filter(l=>leverState(l)==="non").map(l=>`<option value="${l.k}">${esc(l.name)}</option>`).join("")}</select></div>`;
    else if(group==="Livrables engagés") body=`<div class="grid2">${f("ad-text","Livrable *","Ex. : Session acoustique")}${f("ad-x","Format","Ex. : 16:9, 4 min")}</div>`;
    else if(group==="Calendrier de lancement") body=`<div class="grid2">${f("ad-text","Temps fort *","Ex. : Live sur Instagram")}${f("ad-x","Jour par rapport à la sortie *","Ex. : -3 pour J-3","number")}</div>`;
    else if(group==="Budget stratégie") body=`<div class="grid2">${f("ad-text","Ligne *","Ex. : Achat média")}${f("ad-x","Montant estimé *","En euros HT")}</div>`;
    else if(group==="Objectifs & KPIs") body=`${f("ad-text","Objectif *","Ex. : 150 000 vues sur les teasers")}<div class="grid3"><div class="field"><label for="ad-metric">Indicateur *</label><select class="in" id="ad-metric">${OBJ_METRICS.map(m=>`<option value="${m[0]}">${esc(m[1])}</option>`).join("")}</select></div>${f("ad-target","Cible *","Ex. : 150 000")}<div class="field"><label for="ad-j">Échéance, en jours après la sortie *</label><input class="in" id="ad-j" type="number" value="28">${errOf("ad-j")}</div></div>`;
    else body=f("ad-text",esc(group)+" *","Ce qui a été décidé");
  }else if(coll==="design") body=`<div class="grid2"><div class="field"><label for="ad-q">Question</label><select class="in" id="ad-q">${(group==="Direction de la sortie"?DIR_FIELDS:LIV_Q).map(q=>`<option>${esc(q)}</option>`).join("")}</select></div>${f("ad-text","Intention *","Ce qui a été dit ou décidé")}</div>`;
  else body=`${f("ad-text","Tâche *","Ex. : Réserver le camion régie")}<div class="grid2"><div class="field"><label for="ad-who">Qui la fait</label><select class="in" id="ad-who">${ROLE_ORDER.filter(k=>k!=="mgmt"&&k!=="editor").map(k=>`<option value="${k}">${esc(P[k].name)}</option>`).join("")}</select></div>${f("ad-due","Échéance","","date")}</div>`;
  return `<div class="card" style="background:var(--soft);padding:14px;gap:10px">${body}<div class="btnrow"><button class="btn sm" type="button" data-act="itmadd" data-c="${coll}" data-v="${esc(group)}">Ajouter</button><button class="btn ghost sm" type="button" data-act="form" data-v="">Annuler</button></div></div>`;
}
const poBox=text=>`<div class="callout info"><span class="po">${I.spark} PO</span><span>${text}</span></div>`;
const callFacts=rows=>`<dl class="kv">${rows.map(([k,v])=>`<dt>${esc(k)}</dt><dd>${v}</dd>`).join("")}</dl>`;

function dimBody(d){
  const canEdit=can("project")&&!stratFrozen()&&!S.strat.validated;
  const it=dimItems(d.name), head=groupHead("strat",d.name,d.add,canEdit);
  const rows=list=>list.length?`<div class="rows">${list.join("")}</div>`:"";
  const none=`<p class="note">Rien n'a été dit sur ce point pendant l'échange.</p>`;
  if(d.kind==="text") return head+(it.length?rows(it.map(x=>itemRow(x,canEdit,d.name==="Objectifs & KPIs"?esc(objLine(x)):""))):none);
  if(d.kind==="levers") return head+rows(d.levers.map(l=>{
    if(l.prop!=null&&itemOf(l.prop)) return itemRow(itemOf(l.prop),canEdit,esc(l.name));
    return `<div class="irow"><span class="grow"><b>${esc(l.name)}</b><br><span class="src">${esc(l.src||"Leviers courants")}${S.strat.arb[l.k]?` · ${S.strat.arb[l.k]==="retenu"?"retenu":"non retenu"} par ${esc(S.strat.arbBy[l.k]||"")}`:""}</span></span>
     <span class="btnrow">${pill(LSTATE[l.state][0],LSTATE[l.state][1])}${l.state==="arb"&&canEdit?`<button class="btn out sm" type="button" data-act="lever" data-k="${l.k}" data-v="retenu">Retenir</button><button class="btn ghost sm" type="button" data-act="lever" data-k="${l.k}" data-v="non">Ne pas retenir</button>`:""}</span></div>`;}));
  if(d.kind==="livs") return head+rows(it.map(x=>itemRow(x,canEdit,x.fmt?esc(x.fmt):"")));
  if(d.kind==="cal"){
    const fixed=TEMPS.filter(t=>t.prop==null).map(t=>`<div class="irow"><span class="grow"><b>${esc(t.name)}</b> · ${esc(t.type)}<br><span class="src">${jLabel(t.j)} · Brief de cadrage › Calendrier</span></span><span class="num">${fullDate(relDay(t.j))}</span></div>`);
    const prop=TEMPS.filter(t=>t.prop!=null&&itemOf(t.prop)).map(t=>itemRow(itemOf(t.prop),canEdit,`${jLabel(t.j)} · ${fullDate(relDay(t.j))}`));
    const man=it.filter(x=>x.manual).map(x=>itemRow(x,canEdit,`${jLabel(x.j)} · ${fullDate(relDay(x.j))}`));
    const tf=tempsForts(), livFirst=x=>tf.filter(t=>t.liv===x.key).sort((a,b)=>a.j-b.j)[0];
    return head+rows(fixed.concat(prop,man))+`<h3 style="font-size:15px;margin-top:6px">Échéances amont</h3><p class="note">Calculées depuis le premier temps fort de chaque livrable. Elles partent dans le Planning.</p>
     <div class="rows">${LIVRABLES.filter(x=>kept(x.prop)&&livFirst(x)).map(x=>{const f=livFirst(x);return `<div class="irow"><span class="grow"><b>${esc(x.name)}</b><br><span class="src">Premier temps fort : ${esc(f.name)}, ${fullDate(relDay(f.j))}</span><br>${UPSTREAM.map(([l,n])=>`<span class="cap">${l} le · <b class="num">${fullDate(relDay(f.j+n))}</b> <span class="t3">(${jLabel(n)})</span></span>`).join("<br>")}</span></div>`;}).join("")||`<div class="irow"><span class="src">Aucun livrable retenu n'a encore de temps fort.</span></div>`}</div>`;
  }
  if(d.kind==="bud"){const b=budget();
    return head+`<div class="statgrid">${[["Enveloppe",BUDGET_ENV,"Brief de cadrage › Budget"],["Proposé",b.proposed,"Lignes des leviers retenus"],["Validé",b.validated,"Engagé ou payé"],["À arbitrer",b.arb,"Estimé ou devis"],["Reste",b.rest,"Enveloppe − proposé − à arbitrer"]].map(([k,v,r])=>`<div class="stat"><span class="k">${k}</span><b class="num">${euro(v)}</b><span class="src">${r}</span></div>`).join("")}</div>
     <div class="rows">${b.lines.map(l=>`<div class="irow"><span class="grow"><b>${esc(l.name)}</b><br><span class="src">${esc(l.src)}</span></span><span class="btnrow"><span class="num">${euro(l.amount)}</span>${pill(l.state==="retenu"?"":l.state==="arb"?"warn":"",l.state==="retenu"?"Estimé":l.state==="arb"?"À arbitrer":"Écartée")}</span></div>`).join("")}</div>
     <p class="note">Le budget reste interne : il ne figure ni dans le Plan de sortie, ni dans le Dossier de presse.</p>`;}
  return "";
}
function essentials(){
  const ds=dims(), get=n=>ds.find(d=>d.name===n);
  const items=d=>dimItems(d.name).filter(x=>x.state==="kept").map(x=>x.text).join(" · ")||"—";
  const b=budget();
  return callFacts([
    ["Positionnement",esc(items(get("Positionnement")))],["Publics prioritaires",esc(items(get("Publics prioritaires")))],["Narratif",esc(items(get("Narratif de sortie")))],
    ["Dispositif retenu",esc(get("Dispositif").levers.filter(l=>l.state==="retenu").map(l=>l.name).join(", "))],
    ["Livrables",esc(planItems().livs.map(x=>x.name).join(", ")||"—")],
    ["Temps forts",tempsForts().map(t=>`${esc(t.name)} · ${fullDate(relDay(t.j))}`).join("<br>")],
    ["Objectif",dimItems("Objectifs & KPIs").filter(x=>x.state==="kept").map(x=>`${esc(x.text)} <span class="src">· ${esc(objLine(x))}</span>`).join("<br>")||"—"],
    ["Budget",`${euro(b.proposed)} proposés sur ${euro(BUDGET_ENV)}`]]);
}
const ACT_DEF={
  social:{title:"Contenus sur les réseaux",kind:"Contenu",unit:"vues",j:-7},
  influence:{title:"Influence · 12 créateurs",kind:"Influence",unit:"vues",j:7},
  rp:{title:"Relations presse",kind:"Relations presse",unit:"retombées",j:-7},
  playlists:{title:"Pitching playlists",kind:"Autre",unit:"ajouts en playlist",j:-14},
  clip:{title:"Sortie du clip",kind:"Contenu",unit:"vues",j:7,needs:"clip"},
  pub:{title:"Publicité en ligne",kind:"Autre",unit:"impressions",j:0},
  live:{title:"Showcase à Paris",kind:"Événement / session",unit:"personnes",j:14}
};
const ACT_WHY={"Contenu":"Un contenu publié au bon moment, avec sa preuve et ses chiffres.","Influence":"Les créateurs publient ; chaque publication a sa preuve, ses vues et ses droits.","Relations presse":"Le dossier de presse part aux médias ; les retombées sont des preuves, vérifiées à part.","Autre":"Une action du dispositif, suivie comme les autres : responsable, échéance, preuve, statistiques.","Événement / session":"Un moment avec le public : il a sa date, sa preuve et sa fréquentation."};
function planItems(){
  const lv=LEVERS.filter(l=>leverState(l)==="retenu");
  const custom=dimItems("Livrables engagés").filter(x=>x.state==="kept"&&x.manual).map(x=>({key:"c"+x.id,name:x.text,fmt:x.fmt||"Format à préciser",custom:true}));
  return {acts:lv.map(l=>({lever:l.name,...ACT_DEF[l.k],k:l.k})),livs:LIVRABLES.filter(x=>kept(x.prop)).concat(custom)};
}

/* ---------- Conception ---------- */
const INTENTS=[
  {group:"Direction de la sortie",q:"Concept central et message",text:"Une nuit blanche à Paris, entre deux lumières",quote:"on reste sur l'idée de la nuit blanche, entre deux lumières"},
  {group:"Direction de la sortie",q:"Codes communs",text:"Néons roses et bleus, grain argentique",quote:"des néons roses et bleus, et du grain, comme de l'argentique"},
  {group:"Direction de la sortie",q:"Ton",text:"Mélancolique, jamais triste",quote:"mélancolique mais jamais triste"},
  {group:"Direction de la sortie",q:"Contraintes et lignes rouges",text:"Pas de voiture de luxe, pas de club",quote:"pas de voiture de luxe, pas de club, ce n'est pas elle"},
  {group:"Clip officiel",q:"Ce qu'il raconte",text:"Mona traverse la ville jusqu'au lever du jour",quote:"elle traverse la ville jusqu'au lever du jour"},
  {group:"Pochette",q:"À quoi elle ressemble",text:"Portrait serré, la lumière du néon sur le visage",quote:"un portrait serré, avec le néon sur le visage"}
];
const LIV_Q=["Ce qu'il raconte","À quoi il ressemble","Ton et émotion","Incontournables et interdits"];
const designItems=()=>INTENTS.map((p,i)=>({id:"in"+i,group:p.group,q:p.q,text:p.text,quote:p.quote,from:"Échange créatif du 09/10",state:"proposed"}));
const DIR_FIELDS=["Concept central et message","Codes communs","Ton","Contraintes et lignes rouges"];
function dirValue(i){
  const x=S.design.items.find(y=>y.group==="Direction de la sortie"&&y.q===DIR_FIELDS[i]&&y.state==="kept");
  if(x) return {v:x.text,src:x.edited?`Modifié par ${x.edited}`:x.quote?`${x.from} « ${x.quote} »`:x.src};
  const m=S.design.dirManual[i];return m?{v:m.text,src:`Saisi par ${m.by}`}:null;
}

/* ---------- Activations ---------- */
const actById=id=>S.acts.find(a=>a.id===id);

/* ---------- Suivi & bilan ---------- */
function bilanIssues(){
  const l=[];
  S.acts.forEach(a=>{
    if(a.status==="cancelled") l.push({cat:"Activations",text:`${a.title} : annulée (« ${a.cancelled.why} »)`});
    else if(a.status!=="closed") l.push({cat:"Activations",text:`${a.title} : pas encore clôturée (${OSTATE[dispStatus(a)][1].toLowerCase()})`,actId:a.id,open:true});
    if(a.exception) l.push({cat:"Activations",text:`${a.title} : réalisée avec une réserve (« ${a.exception.why} »), à régler par ${nameOf(a.exception.r)} avant le ${fullDate(fromIso(a.exception.due))}`});
    if(a.status==="closed"){if(a.proof.state!=="verified") l.push({cat:"Preuves",text:`${a.title} : preuve non vérifiée`});if(a.stats.state==="na") l.push({cat:"Statistiques",text:`${a.title} : statistiques indisponibles`});}
  });
  l.push({cat:"Statistiques",text:"Streams à 4 semaines : lus après le Sam. 02/01/2027"});
  return l;
}
const lastReport=()=>lastOf(S.review.reports);
const approvedReport=()=>[...S.review.reports].reverse().find(r=>r.status==="approved")||null;
const RSTATE={generated:["","Généré"],submitted:["info","À valider"],approved:["ok","Bilan provisoire approuvé"],changes:["warn","Corrections demandées"],postponed:["","Validation reportée"]};
const ARB={lever:"À lever avant clôture",follow:"À suivre après clôture",limit:"Acceptée comme limite définitive",na:"Non applicable",dup:"Doublon"};
const reservesOpen=()=>S.review.reserves.filter(r=>!r.arb||(r.arb==="lever"&&!r.lifted));
/* An activation still open at closure needs a reserve followed after it or accepted by the
   direction: never « non applicable », never a duplicate, never silent (MKT-BIL-001). */
const uncoveredActs=()=>S.acts.filter(a=>!["closed","cancelled"].includes(a.status)&&!S.review.reserves.some(r=>r.actId===a.id&&["follow","limit"].includes(r.arb)));
const fingerprint=s=>{let h=2166136261;for(const c of s){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return (h>>>0).toString(16).padStart(8,"0");};

/* ---------- Steps of the four modules (Production keeps its own) ---------- */
/* ---------- Bodies ---------- */
const kickOrigin=()=>prodOf("clip")&&prodOf("clip").prep&&prodOf("clip").prep.org?prepOrigin("clip"):"Call de production du 15/10";
const kickItems=()=>KICK_PROPS.map((p,i)=>({id:"kp"+i,text:p.text,quote:p.quote,from:"Call de production du 15/10",r:p.r,due:p.due,state:"proposed"}));
const KICK_PROPS=[
  {dim:"Tâche · Lina Haddad · pour le 16/10",text:"Envoyer le Brief créatif validé et les références",quote:"Tu nous envoies le brief et les refs dès demain ?",r:"cp",due:"16/10"},
  {dim:"Tâche · Studio Ressac · pour le 21/10",text:"Déposer le devis complet, réalisation comprise",quote:"On revient vers vous avec un devis lundi prochain.",r:"societe",due:"21/10"},
  {dim:"Tâche · Studio Ressac · pour le 18/10",text:"Proposer un réalisateur",quote:"On a deux noms en tête pour la réal.",r:"societe",due:"18/10"},
  {dim:"Tâche · Tom Mercier",text:"Organiser une visite des lieux avec la société",quote:"il faudrait peut-être aller voir les lieux ensemble",r:"charge",due:null}
];
const BODY_MK={
  st2(){
    const ds=dims(), n=k=>ds.filter(d=>d.st===k).length, p=S.strat.items.filter(x=>x.state==="proposed").length;
    const sp=S.stratPrep||{},sc=sp.call;
    return `${sp.org==="call"&&sc&&sc.held?callFacts([["Échange stratégique",`${esc(fullDate(fromIso(sc.date)))} à ${esc(sc.h)} · ${esc(sc.fmt)} · ${callWho(sc,PREP_CALL.strat).map(x=>esc(nameOf(x.k))).join(", ")}`],["Compte rendu",`${crBtn("strat")}`]]):callFacts([["Départ","Commencée directement, sans échange : ajoutez ce que vous savez dans chaque dimension"]])}
     ${p?poBox("PO a rangé dans chaque dimension ce qui a été dit pendant l'échange, avec la phrase exacte. Confirmez, corrigez ou écartez chaque proposition, et ajoutez ce qui manque : rien n'entre dans la Stratégie sans vous."):""}
     <p class="note"><b>${n("ok")} complétées · ${n("run")} en cours · ${n("arb")} à arbitrer · ${n("todo")} à compléter</b>${stratFrozen()?" · la Stratégie est figée pendant la validation":""}</p>
     ${ds.map((d,i)=>versionCard("dim"+i,d.st!=="ok"||(S.form||"").includes(d.name),esc(d.name),pill(DSTATE[d.st][0],DSTATE[d.st][1]),esc(d.why||""),dimBody(d))).join("")}${waits("st2")}`;
  },
  st3(){
    const r=S.strat.review, v=S.strat.validated;
    let act="";
    if(!r&&can("project")) act=`<div class="vers"><h3>Envoyer en validation</h3><div class="checks"><label><input type="checkbox" checked disabled>${esc(nameOf(holder("direction")))} <span class="src">· valide toujours</span></label><label><input type="checkbox" id="svDa" checked>${esc(nameOf(holder("creativeInt")))} <span class="src">· directrice créative</span></label></div>
      <div class="btnrow"><button class="btn" type="button" data-act="stask">Envoyer en validation</button></div></div>`;
    else if(r&&r.changes&&can("project")) act=`<div class="vers">${ta("stAnswer","Votre réponse","Ce qui a changé depuis la demande",true)}<div class="btnrow"><button class="btn" type="button" data-act="stresend">Répondre et transmettre à nouveau</button></div></div>`;
    else if(r&&!v&&!r.changes&&r.validators.includes(me())&&!r.dec[me()]) act=`<div class="vers"><h3>Votre décision</h3>${ta("stNote","Commentaire","Obligatoire pour des réserves ou une modification")}
      <div class="btnrow"><button class="btn" type="button" data-act="stdecide" data-v="ok">Valider le Brief de sortie</button><button class="btn out" type="button" data-act="stdecide" data-v="res">Valider avec réserves</button><button class="btn ghost" type="button" data-act="stdecide" data-v="changes">Demander une modification</button></div></div>`;
    const decs=r?r.validators.map(k=>{const d=r.dec[k];return `<div class="row"><span><b>${esc(nameOf(k))}</b>${d&&d.note?`<br><span class="src">« ${esc(d.note)} »</span>`:""}</span>${pill(!d?"info":d.kind==="changes"?"warn":"ok",!d?"En attente":d.kind==="ok"?"Validé":d.kind==="res"?"Validé avec réserves":"Modification demandée")}</div>`;}).join(""):"";
    return `${v?`<div class="callout ok">${I.ok}<span><b>Brief de sortie — V${v.v} validé</b> le ${esc(v.at)}. Il est figé ; le réviser crée une V${v.v+1}.</span></div>`:""}
     ${r&&r.changes?`<div class="callout warn">${I.warn}<span><b>${esc(r.changes.by)} (demander une modification)</b> : « ${esc(r.changes.note)} »</span></div>`:""}
     <div class="vers"><div class="dhead"><h3>Brief de sortie — V${v?v.v:(r?r.round:1)}</h3><button class="btn ghost sm" type="button" data-act="open" data-v="Brief de sortie — V1.pdf">Voir le PDF</button></div>${essentials()}<span class="src">Restant à arbitrer : ${esc(restArb().join(", ")||"aucun")}.</span></div>
     ${decs?`<div class="vers"><h3>Validation</h3><div class="rows">${decs}</div></div>`:""}
     ${act||waits("st3")}`;
  },
  st4(){
    const p=planItems(), done=!!S.strat.plan;
    return `${done?`<div class="callout ok">${I.ok}<span><b>Plan d'exécution confirmé</b> par ${esc(S.strat.plan.by)} le ${esc(S.strat.plan.at)}. Les activations attendent leur responsable ; la Conception s'ouvre.</span></div>`:poBox("Le code propose une activation par levier retenu et envoie chaque livrable engagé en Conception. Rien n'est créé deux fois.")}
     <div class="grid2"><div class="vers"><h3>Activations (${p.acts.length})</h3><div class="rows">${p.acts.map(x=>`<div class="row"><span><b>${esc(x.title)}</b><br><span class="src">${esc(x.kind)} · levier ${esc(x.lever)}</span></span></div>`).join("")}</div></div>
      <div class="vers"><h3>Livrables en Conception (${p.livs.length})</h3><div class="rows">${p.livs.map(x=>`<div class="row"><span><b>${esc(x.name)}</b><br><span class="src">${esc(x.fmt)}</span></span></div>`).join("")}</div></div></div>
     ${!done&&can("project")?`<div class="btnrow"><button class="btn" type="button" data-act="stplan">Confirmer le plan d'exécution</button></div>`:done?"":waits("st4")}
     <div class="vers"><h3>Documents</h3><div class="rows">
      <div class="row"><span><b>Brief de sortie — V1</b><br><span class="src">Interne · avec le budget</span></span><button class="btn ghost sm" type="button" data-act="open" data-v="Brief de sortie — V1.pdf">Voir le PDF</button></div>
      <div class="row"><span><b>Plan de sortie</b><br><span class="src">Pour l'équipe de l'artiste · lien public, sans budget</span></span><button class="btn out sm" type="button" data-act="copylink" data-copy="https://pds-os.app/s/neons-plan-de-sortie">Copier le lien</button></div>
      <div class="row"><span><b>Dossier de presse</b><br><span class="src">Pour les médias · utilisé par les Relations presse</span></span><button class="btn ghost sm" type="button" data-act="open" data-v="Dossier de presse — Néons.pdf">Voir le PDF</button></div></div></div>`;
  },
  de1(){
    const canEdit=can("creative")&&!S.design.dir.status.match(/submitted|approved/);
    const groups=["Direction de la sortie"].concat(S.design.fiches.map(f=>f.name));
    const p=S.design.items.filter(x=>x.state==="proposed").length;
    return `${callFacts([["Échange créatif","Ven. 09/10/2026 · Sur place · 55 min · Nadia Benali, Lina Haddad, Mona Lys"],["Compte rendu",`${crBtn("design")}`]])}
     ${p?poBox("PO a rangé les intentions dites pendant l'échange, avec la phrase exacte. Retenez, corrigez ou écartez ; les livrables hériteront de la direction."):""}
     ${groups.map((g,i)=>{const it=S.design.items.filter(x=>x.group===g);const st=it.some(x=>x.state==="proposed")?"arb":it.some(x=>x.state==="kept")?"ok":"todo";
       return versionCard("ig"+i,st!=="ok"||(S.form||"").includes(g),esc(g),pill(DSTATE[st][0],DSTATE[st][1]),counter(it),groupHead("design",g,"Ajouter une intention",canEdit)+(it.length?`<div class="rows">${it.map(x=>itemRow(x,canEdit,esc(x.q))).join("")}</div>`:`<p class="note">Rien n'a été dit sur ce livrable : il héritera de la direction.</p>`));}).join("")}
     ${waits("de1")}`;
  },
  de2(){
    const d=S.design.dir, editable=can("creative")&&(d.status==="draft"||d.status==="changes");
    const rows=DIR_FIELDS.map((f,i)=>{const v=dirValue(i);return `<div class="row"><span><span class="cap">${esc(f)}</span><br>${v?`<b>${esc(v.v)}</b><br><span class="src">${esc(v.src)}</span>`:editable?`<input class="in" id="dirf${i}" placeholder="Rien n'a été dit : à écrire"${S.err["dirf"+i]?' aria-invalid="true"':""}>${errOf("dirf"+i)}`:`<span class="miss">À écrire par ${esc(nameOf(holder("creative")))}</span>`}</span></div>`;}).join("");
    let act="";
    if(editable) act=`<div class="btnrow"><button class="btn" type="button" data-act="dirsubmit">${d.status==="changes"?"Répondre et soumettre à nouveau":"Soumettre à "+esc(nameOf(holder("direction")))}</button></div>`;
    else if(d.status==="submitted"&&can("direction")) act=`<div class="vers"><h3>Votre décision</h3>${ta("dirNote","Commentaire","Obligatoire pour demander des modifications")}<div class="btnrow"><button class="btn" type="button" data-act="dirdecide" data-v="approved">Valider la direction</button><button class="btn out" type="button" data-act="dirdecide" data-v="changes">Demander des modifications</button></div></div>`;
    return `${d.status==="approved"?`<div class="callout ok">${I.ok}<span><b>Direction validée</b> par ${esc(d.decidedBy)} le ${esc(d.decidedAt)}. Les livrables en héritent.</span></div>`:""}
     ${d.status==="changes"?`<div class="callout warn">${I.warn}<span><b>${esc(d.decidedBy)} (demander des modifications)</b> : « ${esc(d.note)} »</span></div>`:""}
     <div class="vers"><h3>Direction de la sortie</h3><div class="rows">${rows}</div></div>
     <div class="vers"><h3>Références</h3><div class="rows">
      <div class="row"><span><b>Moodboard_Neons.pdf</b><br><span class="src">Moodboard · 12 images · Nadia Benali · droits : usage interne</span></span><button class="btn ghost sm" type="button" data-act="open" data-v="Moodboard_Neons.pdf">Ouvrir</button></div>
      <div class="row"><span><b>Portrait au néon, essai lumière</b><br><span class="src">Proposition créative · Nadia Benali</span></span><button class="btn ghost sm" type="button" data-act="open" data-v="Essai_lumiere.jpg">Ouvrir</button></div></div></div>
     ${act||waits("de2")}
     ${d.rounds.length?`<ul class="hist">${d.rounds.map(x=>`<li><span class="noc">•</span><span>${esc(x)}</span></li>`).join("")}</ul>`:""}`;
  },
  de3(){
    return S.design.fiches.map(f=>{
      const mine=can("creative")&&(f.status==="draft"||f.status==="changes"), dec=can("direction")&&f.status==="submitted";
      const body=`<div class="rows">${f.fields.map((x,i)=>`<div class="row"><span><span class="cap">${esc(x[0])}</span><br>${x[1]!=null?`<b>${esc(x[1])}</b><br><span class="src">${esc(x[2])}</span>`:mine?`<select class="in" id="ff-${f.key}-${i}"><option value="">À choisir</option><option>Oui, français</option><option>Oui, français et anglais</option><option>Non</option></select>`:`<span class="miss">À préciser par ${esc(nameOf(holder("creative")))}</span>`}</span></div>`).join("")}</div>
        ${f.note&&f.status==="changes"?`<div class="callout warn">${I.warn}<span><b>${esc(f.decidedBy)}</b> : « ${esc(f.note)} »</span></div>`:""}
        ${errOf("f-"+f.key)}
        ${mine?`<div class="btnrow"><button class="btn sm" type="button" data-act="fsubmit" data-k="${f.key}">${f.status==="changes"?"Corriger et soumettre à nouveau":"Soumettre à "+esc(nameOf(holder("direction")))}</button></div>`:""}
        ${dec?`${ta("fNote-"+f.key,"Commentaire","Obligatoire pour demander des modifications")}<div class="btnrow"><button class="btn sm" type="button" data-act="fdecide" data-k="${f.key}" data-v="approved">Valider la fiche</button><button class="btn out sm" type="button" data-act="fdecide" data-k="${f.key}" data-v="changes">Demander des modifications</button></div>`:""}
        ${f.rounds.length?`<ul class="hist">${f.rounds.map(x=>`<li><span class="noc">•</span><span>${esc(x)}</span></li>`).join("")}</ul>`:""}`;
      return versionCard("fi"+f.key,f.status!=="approved"||mine||dec,esc(f.name),pill(FSTATE[f.status][0],FSTATE[f.status][1]),esc(f.form),body);
    }).join("")+waits("de3");
  },
  de4(){
    const t=S.design.transfer;
    return `${t?`<div class="callout ok">${I.ok}<span><b>Transféré en Production</b> par ${esc(t.by)} le ${esc(t.at)}. Le dossier transféré ne bouge plus.</span></div>`:""}
     <div class="rows">
      <div class="row"><span><b>Clip officiel</b><br><span class="src">Production externe · Studio Ressac · Société de production, Réseau</span></span>${pill(t?"ok":"info",t?"Déjà en Production":"À transférer")}</div>
      <div class="row"><span><b>Teasers × 4</b><br><span class="src">Déclinés du clip par Studio Ressac</span></span>${pill(t?"ok":"info",t?"Déjà en Production":"À transférer")}</div>
      <div class="row"><span><b>Pochette</b><br><span class="src">Fiche validée · réalisée par Nadia Benali</span></span>${pill("","Reste en Conception")}</div>
      ${S.design.fiches.filter(f=>!FICHE_SEED[f.key]).map(f=>`<div class="row"><span><b>${esc(f.name)}</b><br><span class="src">Fiche validée</span></span>${pill("","Reste en Conception")}</div>`).join("")}</div>
     <div class="row" style="border:1px solid var(--hair);border-radius:10px"><span><b>Brief créatif — V1</b><br><span class="src">Établi par le code depuis la direction et les fiches · sans budget</span></span><button class="btn ghost sm" type="button" data-act="open" data-v="Brief créatif — V1.pdf">Voir le PDF</button></div>
     ${!t&&can("project")?`<div class="btnrow"><button class="btn" type="button" data-act="detransfer">Passer en Production</button></div>`:t?"":waits("de4")}`;
  },
  ac0(){
    if(!S.acts.length) return `<p class="note">Aucune activation pour l'instant.</p>`;
    return `<div class="rows">${S.acts.map(a=>{const n=actNext(a), st=statusOf(a.id);return `<button class="row" type="button" data-act="go" data-step="${a.id}" style="width:100%;text-align:left;background:none;border:0;border-bottom:1px solid var(--hair);cursor:pointer;color:inherit;font:inherit">
      <span><b>${esc(a.title)}</b><br><span class="src">${esc(a.kind)} · ${a.resp?esc(nameOf(a.resp)):"Responsable à désigner"}${a.due?" · pour le "+fullDate(fromIso(a.due)):""}</span><br><span class="cap">${st==="blocked"?"Après : Livraison et clôture":n?esc(n.todo)+(n.r?" · "+esc(nameOf(n.r)):""):"Clôturée"}</span></span>
      <span class="btnrow">${pill(OSTATE[a.status][0],OSTATE[a.status][1])}</span></button>`;}).join("")}</div>`;
  },
  bi1(){
    const r=lastReport(), cpTurn=can("project")&&(!r||r.status==="changes"||r.status==="postponed"), n=S.review.reports.length+1;
    const issues=bilanIssues();
    let act="";
    if(cpTurn) act=`<div class="vers"><h3>Préparer la version ${n}</h3>
      ${ta("bSum","Résumé exécutif","Ce qu'il faut retenir de la campagne",true)}${ta("bReco","Recommandations","Pour la prochaine sortie")}
      <div class="field"><b>Ce qui manque</b><span class="src">Relevé par le code ; ces points deviendront des réserves du bilan.</span><ul class="hist">${issues.map(x=>`<li><span class="noc">•</span><span>${esc(x.text)}</span></li>`).join("")}</ul></div>
      <details class="infos"><summary>Options du rapport</summary><div class="vers">      <div class="grid2"><div class="field"><label for="bFrom">Du *</label><input class="in" type="date" id="bFrom" value="2026-11-01">${errOf("bFrom")}</div><div class="field"><label for="bTo">Au *</label><input class="in" type="date" id="bTo" value="${isoOf(new Date(...S.base))}">${errOf("bTo")}</div></div>
      <div class="field"><b>Périmètre</b><div class="checks">${S.acts.map(a=>`<label><input type="checkbox" id="bs-${a.id}" checked>${esc(a.title)} <span class="src">· ${a.status==="cancelled"?"annulée":phaseOf(a)>=5?"clôturée":"à "+PHASES[phaseOf(a)].toLowerCase()}</span></label>`).join("")}</div><span class="src">Une activation décochée est exclue et nommée dans le rapport.</span></div>
      <div class="field"><b>Sections</b><div class="checks">${REPORT_SECTIONS.map(([k,l])=>`<label><input type="checkbox" id="bx-${k}" checked ${k==="sum"?"disabled":""}>${esc(l)}</label>`).join("")}</div></div>

       <div class="field"><b>Réserves à inclure</b><div class="checks">${issues.map((x,i)=>`<label><input type="checkbox" id="bi-${i}" checked${x.open?" disabled":""}>${esc(x.text)} <span class="src">· ${esc(x.cat)}${x.open?" · activation ouverte : toujours incluse":""}</span></label>`).join("")}</div></div></div></details>
      <div class="btnrow"><button class="btn" type="button" data-act="bgen">Générer la version ${n}</button></div></div>`;
    else if(r&&r.status==="generated"&&can("project")) act=`<div class="btnrow"><button class="btn" type="button" data-act="bsubmit">Soumettre à ${esc(nameOf(holder("direction")))}</button></div>`;
    else if(r&&r.status==="submitted"&&can("direction")) act=`<div class="vers"><h3>Votre décision</h3>${ta("bNote","Commentaire","Obligatoire pour demander des corrections ou reporter")}
      <div class="btnrow"><button class="btn" type="button" data-act="bdecide" data-v="approved">Approuver le bilan provisoire${r.reserves.length?" avec réserves":""}</button><button class="btn out" type="button" data-act="bdecide" data-v="changes">Demander des corrections</button><button class="btn ghost" type="button" data-act="bdecide" data-v="postponed">Reporter la validation</button></div></div>`;
    const reps=[...S.review.reports].reverse().map(x=>versionCard("rep"+x.n,x===r||x.status==="approved",`Bilan Marketing — Néons — V${x.n}`,pill(RSTATE[x.status][0],RSTATE[x.status][1]),`Généré par ${esc(x.by)} le ${esc(x.at)}`,
      `${callFacts([["Résumé exécutif",esc(x.sum)],["Période",x.snap&&x.snap.from?`du ${esc(fullDate(fromIso(x.snap.from)))} au ${esc(fullDate(fromIso(x.snap.to)))}`:"—"],["Périmètre",`${x.snap?x.snap.scope:S.acts.length} activations${x.snap&&x.snap.excluded.length?` · ${x.snap.excluded.length} exclue${x.snap.excluded.length>1?"s":""}`:""}`],["Réserves",x.reserves.length?`${x.reserves.length}`:"Aucune"],["Empreinte",`<code>${x.fp}</code> · règles de calcul v1`]])}
       ${x.note?`<span class="src">${esc(x.decidedBy)} : « ${esc(x.note)} »</span>`:""}<div class="btnrow"><button class="btn out sm" type="button" data-act="repview" data-v="${x.n}">Voir le rapport</button></div>`)).join("");
    return `${r&&(r.status==="changes"||r.status==="postponed")?`<div class="callout warn">${I.warn}<span><b>${esc(r.decidedBy)} (${r.status==="changes"?"demander des corrections":"reporter la validation"})</b> : « ${esc(r.note)} »</span></div>`:""}
     ${reps?`<div class="vers"><h3>Rapports</h3>${reps}</div>`:""}${act||waits("bi1")}`;
  },
  bi2(){
    if(!S.review.reserves.length) return `<p class="note">Le bilan approuvé n'a aucune réserve.</p>`;
    const isDir=can("direction"), lead=can("project"), edit=lead||isDir;
    const opts=x=>Object.entries(ARB).filter(([k])=>lead?(k!=="limit"||isDir)&&!(x.open&&["na","dup"].includes(k)):k==="limit");
    return `<p class="note">${lead?`À lever avant la clôture, à suivre après (qui, quand, par quel canal), non applicable ou doublon, avec un motif. Une activation encore ouverte se suit ou se lève, elle ne s'écarte pas. ${esc(nameOf(holder("direction")))} peut aussi accepter une réserve comme limite définitive.`:isDir?`${esc(nameOf(holder("project")))} arbitre chaque réserve ; vous pouvez en accepter une comme limite définitive, avec un motif.`:"Le responsable arbitre chaque réserve ; la direction peut en accepter une comme limite définitive."}</p>
     <div class="rows">${S.review.reserves.map(x=>`<div class="row" style="grid-template-columns:minmax(0,1fr)"><span><span class="cap">${esc(x.cat)}</span><br><b>${esc(x.text)}</b>
      ${x.arb?`<br><span class="src">${esc(ARB[x.arb])}${x.who?` · ${esc(nameOf(x.who))}, pour le ${esc(fullDate(fromIso(x.due)))}${x.channel?`, par ${esc(x.channel.toLowerCase())}`:""}`:""}${x.dupOf?` de « ${esc((S.review.reserves.find(y=>y.id===x.dupOf)||{}).text||"")} »`:""}${x.why?` · « ${esc(x.why)} »`:""} · arbitrée par ${esc(x.by)}${x.lifted?` · levée : « ${esc(x.lifted)} »`:""}</span>`:""}</span>
      ${!x.arb&&edit?`<div class="grid2"><div class="field"><label for="ra-${x.id}">Arbitrage</label><select class="in" id="ra-${x.id}" data-arb="${x.id}">${opts(x).map(([k,l])=>`<option value="${k}">${l}</option>`).join("")}</select>${errOf("ra-"+x.id)}</div>
        ${lead?`<div class="field"><label for="rdup-${x.id}">Doublon de</label><select class="in" id="rdup-${x.id}">${S.review.reserves.filter(y=>y!==x&&y.arb!=="dup").map(y=>`<option value="${y.id}">${esc(y.text)}</option>`).join("")}</select></div>
        <div class="field"><label for="rw-${x.id}">Qui suit</label><select class="in" id="rw-${x.id}">${MEMBERS.map(k=>`<option value="${k}">${esc(P[k].name)}</option>`).join("")}</select></div>`:""}</div>
        <div class="grid3">${lead?`<div class="field"><label for="rd-${x.id}">À suivre pour le</label><input class="in" type="date" id="rd-${x.id}" value="2027-01-15">${errOf("rd-"+x.id)}</div><div class="field"><label for="rc-${x.id}">Canal de suivi</label><select class="in" id="rc-${x.id}"><option value="">Choisir…</option><option>Tâche dans Travail</option><option>Réunion de suivi</option><option>E-mail</option></select>${errOf("rc-"+x.id)}</div>`:""}<div class="field"><label for="ry-${x.id}" id="ryl-${x.id}">Motif${!lead?" *":""}</label><input class="in" id="ry-${x.id}" placeholder="Obligatoire pour non applicable ou une limite définitive">${errOf("ry-"+x.id)}</div></div>
        <div><button class="btn out sm" type="button" data-act="rarb" data-id="${x.id}">Arbitrer</button></div>`:""}
      ${x.arb==="lever"&&!x.lifted&&edit?`<div class="field"><label for="rl-${x.id}">Ce qui l'a levée</label><input class="in" id="rl-${x.id}">${errOf("rl-"+x.id)}</div><div><button class="btn out sm" type="button" data-act="rlift" data-id="${x.id}">Marquer levée</button></div>`:""}</div>`).join("")}</div>${waits("bi2")}`;
  },
  bi3(){
    const c=S.review.closed, req=S.review.closeReq, follow=S.review.reserves.filter(r=>r.arb==="follow"||r.arb==="limit");
    const notClosed=S.acts.filter(a=>a.status!=="closed");
    const unc=uncoveredActs(),checks=[["Bilan provisoire approuvé",!!approvedReport()],["Réserves arbitrées",reservesOpen().length===0],[unc.length?`Activations ouvertes sans réserve suivie : ${unc.map(a=>a.title).join(", ")}${approvedReport()?" · suivez-les après la clôture, ou générez un nouveau bilan si elles sont nouvelles":""}`:"Activations ouvertes couvertes par une réserve suivie ou acceptée",!unc.length]];
    let act="";
    if(!c&&!req&&can("project")) act=`<div class="btnrow"><button class="btn" type="button" data-act="cloreq">Demander la clôture</button></div>`;
    else if(!c&&req&&can("direction")) act=`<div class="vers"><h3>Votre décision</h3>${ta("cNote","Commentaire","Obligatoire pour demander des corrections")}<div class="btnrow"><button class="btn" type="button" data-act="clodecide" data-v="close">${follow.length?"Clôturer avec réserves":"Clôturer sans réserve"}</button><button class="btn out" type="button" data-act="clodecide" data-v="changes">Demander des corrections</button></div></div>`;
    return `${c?`<div class="callout ok">${I.ok}<span><b>Marketing clôturé ${c.withRes?"avec":"sans"} réserve</b> par ${esc(c.by)} le ${esc(c.at)}. Lecture seule : plus de nouvelle activation, les preuves restent acceptées.</span></div>`:""}
     ${req&&req.note?`<div class="callout warn">${I.warn}<span>${esc(req.note)}</span></div>`:""}${errOf("cloreq")}
     <div class="vers"><h3>Avant la clôture</h3><div class="rows">${checks.map(([l,ok])=>`<div class="row"><span>${esc(l)}</span>${pill(ok?"ok":"bad",ok?"Prêt":"Pas prêt")}</div>`).join("")}
      ${notClosed.length&&!unc.length?`<div class="row"><span>${notClosed.length} activation${notClosed.length>1?"s":""} encore ouverte${notClosed.length>1?"s":""}, suivie${notClosed.length>1?"s":""} après la clôture : ${notClosed.filter(a=>a.status!=="cancelled").map(a=>esc(a.title)).join(", ")}</span>${pill("","Avec réserves")}</div>`:""}
      ${follow.length?`<div class="row"><span>${follow.length} réserve${follow.length>1?"s":""} suivie${follow.length>1?"s":""} après la clôture</span>${pill("","Avec réserves")}</div>`:""}</div></div>
     ${c&&can("direction")?`<div class="vers"><h3>Rouvrir le Marketing</h3>${ta("cReopen","Motif","Ex. : retombées presse arrivées après la clôture",true)}<div class="btnrow"><button class="btn out" type="button" data-act="reopen">Rouvrir le Marketing</button></div></div>`:""}
     ${S.review.reopened&&!c?`<p class="note">Rouvert par ${esc(S.review.reopened.by)} le ${esc(S.review.reopened.at)} : « ${esc(S.review.reopened.why)} »</p>`:""}
     ${act||waits("bi3")}`;
  }
};
BODY_MK.kickoff=function(){
  const pr=prodOf("clip")&&prodOf("clip").prep;
  if(!S.kick.confirmed&&prodOf("clip")){const g=prepGate("clip");if(g) return g;}
  const canEdit=can("project"),org=pr?pr.org:"call",c=pr&&pr.call;
  const head=`${org==="call"?callFacts([["Call de production",`${c&&c.date?esc(fullDate(fromIso(c.date)))+" à "+esc(c.h):"Jeu. 15/10/2026"} · ${esc(c&&c.fmt||"Visio")} · ${c?callWho(c,PREP_CALL.ext).map(x=>esc(nameOf(x.k))).join(", "):"Studio Ressac, Lina Haddad, Tom Mercier, Nadia Benali"}`],["Compte rendu",`${crBtn("kick")}`]]):org==="import"?callFacts([["Organisation importée",`<a href="#" data-act="nolink">${esc(pr.doc.name)}</a> <span class="src">· importé par ${esc(pr.doc.by)} le ${esc(pr.doc.at)}</span>`]]):callFacts([["Organisation","Préparation directe avec PO, sans call"]])}`;
  if(S.kick.confirmed){const o=kickOrigin(),t=S.tasks.filter(x=>x.origin===o),it=S.kick.items,n=f=>it.filter(f).length,ed=n(x=>x.edited&&!x.manual),dis=n(x=>x.state==="discarded"),add=n(x=>x.manual);
    const parts=[ed?`${ed} corrigée${ed>1?"s":""}`:"",dis?`${dis} écartée${dis>1?"s":""}`:"",add?`${add} ajoutée${add>1?"s":""}`:""].filter(Boolean);
    return `${head}${poBox(`PO a proposé ${n(x=>!x.manual)} tâches ${org==="call"?"tirées du call, chacune avec sa phrase":"d'après la fiche et le Brief créatif"}. ${esc(S.kick.confirmed.by)} les a tranchées le ${esc(S.kick.confirmed.at)}${parts.length?" : "+parts.join(", "):", sans en modifier"}.${org==="call"?" Une phrase ambiguë n'est pas devenue une décision : elle est « à confirmer » dans Décisions.":""}`)}
     <div class="vers"><h3>Tâches confirmées</h3>${t.length?`<div class="rows">${t.map(taskRow).join("")}</div>`:`<p class="note">Aucune tâche retenue.</p>`}</div>${summaryBlock("kick")}${directorBlock()}`;}
  return `${head}
   ${poBox(org==="call"?"PO propose les tâches dites pendant le call, avec la phrase exacte. Retenez, corrigez ou écartez chacune ; une phrase ambiguë reste « à confirmer » dans Décisions.":"PO propose les tâches d'après la fiche et le Brief créatif. Retenez, corrigez ou écartez chacune.")}
   ${versionCard("kgroup",true,"Tâches proposées",counter(S.kick.items)?pill("warn",counter(S.kick.items)):pill("ok","Tout est tranché"),"",groupHead("kick","Tâches","Ajouter une tâche",canEdit)+`<div class="rows">${S.kick.items.map(x=>itemRow(x,canEdit,`Pour : ${esc(nameOf(x.r))}${x.due?" · pour le "+esc(x.due):""}`)).join("")}</div>`)}
   ${waits("kickoff")}`;
};

/* Dashboards (Activations board, Suivi & bilan) — every figure says how it is computed. */
function statTiles(list){return `<div class="statgrid">${list.map(([k,v,rule])=>`<div class="stat"><span class="k">${esc(k)}</span><b class="num">${v}</b><details><summary class="src">Règle de calcul</summary><span class="src">${esc(rule)}</span></details></div>`).join("")}</div>`;}
function dashboardOld(){
  const c=f=>S.acts.filter(f).length, sum={};
  S.acts.forEach(a=>{if(a.stats.state==="declared") sum[a.unit]=(sum[a.unit]||0)+a.stats.value;});
  const stats=Object.entries(sum).map(([u,v])=>`${fmtN(v)} ${u}`).join(" · ")||"—";
  const seeBudget=me()==="cp"||me()==="dg", q=activeQuote();
  return `<section class="card" aria-label="Tableau de bord"><div class="dhead"><h2 style="font-size:18px">Tableau de bord</h2><span class="cap">Calculé à l'instant · règles de calcul v1</span></div>
   ${statTiles([["Activations",`${c(a=>a.status==="closed")} / ${S.acts.length} clôturées`,"Activations du plan d'exécution, par statut opérationnel"],
     ["Preuves",`${c(a=>a.proof.state==="verified")} vérifiées · ${c(a=>a.proof.state==="given")} à vérifier`,"Une preuve déclarée n'est vérifiée qu'après la décision de la direction"],
     ["Statistiques",stats,"Somme des chiffres déclarés ; une donnée manquante n'est jamais zéro"]].concat(seeBudget?[["Budget",`${euro(q?q.amount:0)} engagés sur ${euro(BUDGET_ENV)}`,"Engagé = devis validés ; visible du chef de projet et de la direction"]]:[]))}</section>`;
}

/* After a decision on an item: a toast, or — when the step becomes done — the result banner. */
const ITEM_STEP={strat:"st2",design:"de1",kick:"kickoff"};
function itemsChanged(c,was,word){
  if(c==="kick"&&!S.kick.confirmed&&!S.kick.items.some(x=>x.state==="proposed")){
    // Every proposal decided: the tasks go to each person, the ambiguous sentence stays « à confirmer ».
    S.kick.items.filter(x=>x.state==="kept").forEach(x=>S.tasks.push({id:id("t"),step:"kickoff",text:x.text,r:x.r,due:x.due,status:"todo",origin:kickOrigin(),quote:x.quote}));
    S.decisions.push({id:id("d"),text:"Tournage possible le 24/10 en plus du 23/10",extraDay:"2026-10-24",kind:"confirm",source:kickOrigin()+(prepOrg("clip")&&prepOrg("clip")!=="call"?"":" « on pourrait peut-être déborder sur le 24 »"),by:P[me()].name,at:stamp(),step:"ready"});
    S.kick.confirmed={by:P[me()].name,at:stamp()};log(`${kickOrigin()} : ${S.kick.items.filter(x=>x.state==="kept").length} tâches envoyées`);
  }
  else if(c==="kick"&&S.kick.confirmed){const x=lastOf(S.kick.items);if(x.manual&&!S.tasks.some(t=>t.text===x.text)) S.tasks.push({id:id("t"),step:"kickoff",text:x.text,r:x.r,due:x.due,status:"todo",origin:`Saisie par ${P[me()].name}`});}
  if(!was&&done(itemStep(c))) after(c.startsWith("prep:")?"Tous les points sont tranchés":c==="strat"?"Brief de sortie établi":c==="design"?"Intentions confirmées":"Tâches du call envoyées");
  else toast(word+".");
}

/* ======================================================================
   Conception (ticket d'Ibé « Workflow Conception complet »), Production par
   livrable (« Qui produit ? »), Stratégie validée, leviers à préparer.
   ====================================================================== */

/* ---------- Fiches Livrables : every value can be corrected by its owner ---------- */
const SUBTITLES=["Oui, intégrés aux exports","Oui, fichier séparé","Oui, intégrés et fichier séparé","Non"];
const RATIOS=["16:9","9:16","1:1","4:5"];
const F=(k,label,type,value,src,req)=>({k,label,type,value,src,req:!!req});
const FICHE_DEF={
  clip:()=>({name:"Clip officiel",form:"Fiche unique",limit:["2026-12-02","l'échéance amont « Production terminée », Mer. 02/12/2026"],fields:[
    F("concept","Concept","text","Mona traverse la ville jusqu'au lever du jour","Intentions › Clip officiel",true),
    F("intention","Intention et ton","text","Mélancolique, jamais triste ; néons roses et bleus, grain argentique","Direction artistique"),
    F("duree","Durée cible","text","3 min","Stratégie › Livrables engagés",true),
    F("ratios","Ratios et formats","ratios",["16:9","9:16"],"Échange stratégique « le clip doit exister en vertical aussi »",true),
    F("soustitres","Sous-titres","subs",null,"",true),
    F("declinaisons","Déclinaisons","text",null,""),
    F("notes","Notes et contraintes","long",null,""),
    F("tournage","Tournage le","date","2026-10-23","Brief de cadrage › Calendrier"),
    F("postStart","Début de postproduction le","date","2026-10-26","Calculé : le lundi qui suit le tournage"),
    F("postEnd","Fin de postproduction le","date","2026-11-20","Calculé : 8 jours avant la livraison"),
    F("livraison","Livraison finale le","date","2026-11-28","Avant l'échéance amont « Production terminée », Mer. 02/12/2026",true),
    F("montant","Montant prévisionnel","money",{amount:18000,engaged:false},"Brief de cadrage › Budget « 18 pour le clip »"),
    F("deps","Dépendances","text","Lieu à retenir en Production","Échange créatif du 09/10"),
    F("open","Points à préciser en Production","text","Lieu, équipe technique, matériel","Brief créatif")]}),
  teasers:()=>({name:"Teasers, série de 4",form:"Fiche série · 4 éléments",limit:["2026-11-28","le premier teaser, Sam. 28/11/2026"],
    subs:[["Teaser 1","La ville la nuit, sans Mona","2026-11-28"],["Teaser 2","Mona dans la lumière du néon","2026-11-30"],["Teaser 3","Le refrain","2026-12-02"],["Teaser 4","Compte à rebours avant la sortie","2026-12-04"]].map(([name,objective,date],i)=>({n:i+1,name,objective,date})),
    fields:[
    F("concept","Concept","text","Quatre moments de la nuit, extraits du clip","Saisi par Nadia Benali",true),
    F("duree","Durée cible","text","15 s chacun","Stratégie › Livrables engagés",true),
    F("ratios","Ratios et formats","ratios",["9:16"],"Échange stratégique « quatre teasers de quinze secondes avant la sortie »",true),
    F("soustitres","Sous-titres","subs","Oui, intégrés aux exports","Échange créatif « des sous-titres incrustés, toujours »",true),
    F("livraison","Livraison finale le","date","2026-11-18","Calculé : J-10 avant le premier teaser, Sam. 28/11/2026",true),
    F("montant","Montant prévisionnel","text","Compris dans le clip","Déclinés du clip par la même production")]}),
  pochette:()=>({name:"Pochette",form:"Fiche unique",limit:["2026-11-21","l'annonce de la sortie, Sam. 21/11/2026"],fields:[
    F("concept","Concept","text","Portrait serré, la lumière du néon sur le visage","Intentions › Pochette",true),
    F("format","Format","text","3000 × 3000 px, JPG ou PNG","Stratégie › Livrables engagés",true),
    F("notes","Notes et contraintes","long",null,""),
    F("livraison","Livraison finale le","date","2026-11-11","Calculé : J-10 avant l'annonce, Sam. 21/11/2026",true),
    F("montant","Montant prévisionnel","money",{amount:800,engaged:false},"Budget stratégie"),
    F("open","Points à préciser en Production","text","Photo ou illustration","Brief créatif")]})
};
function newFiche(x){
  const d=FICHE_DEF[x.key]?FICHE_DEF[x.key]():{name:x.name,form:"Fiche unique",limit:null,fields:[F("concept","Concept","text",null,"",true),F("format","Format","text",x.fmt||null,x.fmt?"Stratégie › Livrables engagés":"",true),F("livraison","Livraison finale le","date",null,"",true),F("montant","Montant prévisionnel","money",null,"")]};
  return {key:x.key,...d,subs:d.subs||null,resp:null,respBy:null,status:"draft",version:1,rounds:[],transferred:null,qualify:!!x.qualify,src:x.src||"Stratégie validée › Livrables engagés"};
}
const FSTATE={draft:["","Brouillon"],submitted:["info","En attente de validation"],changes:["warn","Modifications demandées"],refused:["bad","Refusée"],approved:["ok","Validée · Prête pour Production"]};
const ficheMissing=f=>f.fields.filter(x=>x.req&&(x.value==null||x.value===""||(Array.isArray(x.value)&&!x.value.length))).map(x=>x.label);
const fieldText=x=>x.value==null||x.value===""?null:x.type==="date"?fullDate(fromIso(x.value)):x.type==="ratios"?x.value.join(" et "):x.type==="money"?`${euro(x.value.amount)} · ${x.value.engaged?"engagé":"non engagé"}`:String(x.value);
const ficheEditable=f=>f.resp===me()&&(f.status==="draft"||f.status==="changes");
const ficheByKey=k=>S.design.fiches.find(f=>f.key===k);
function fieldRow(f,x,i){
  const ed=ficheEditable(f)&&S.form===`fe:${f.key}:${i}`, id=`fe-${f.key}-${i}`, val=fieldText(x);
  let editor="";
  if(ed){
    if(x.type==="ratios") editor=`<div class="checks" style="flex-direction:row;flex-wrap:wrap;gap:6px 16px">${RATIOS.map(r=>`<label><input type="checkbox" id="${id}-${r.replace(":","x")}" ${x.value&&x.value.includes(r)?"checked":""}>${r}</label>`).join("")}</div>`;
    else if(x.type==="subs") editor=`<select class="in" id="${id}"><option value="">À choisir</option>${SUBTITLES.map(o=>`<option ${o===x.value?"selected":""}>${o}</option>`).join("")}</select>`;
    else if(x.type==="money") editor=`<div class="grid2"><input class="in" id="${id}" inputmode="numeric" value="${x.value?x.value.amount:""}" placeholder="En euros HT"><select class="in" id="${id}-e"><option value="0" ${x.value&&x.value.engaged?"":"selected"}>Non engagé</option><option value="1" ${x.value&&x.value.engaged?"selected":""}>Engagé</option></select></div>`;
    else if(x.type==="long") editor=`<textarea class="in" id="${id}" rows="2">${esc(x.value||"")}</textarea>`;
    else editor=`<input class="in" id="${id}" ${x.type==="date"?'type="date"':""} value="${esc(x.value||"")}">`;
    editor=`<div class="fedit">${editor}${errOf(id)}${x.src?`<span class="src">Proposé : ${esc(fieldText({...x,value:x.orig!==undefined?x.orig:x.value})||"—")} · ${esc(x.src)}</span>`:""}
      <div class="btnrow"><button class="btn sm" type="button" data-act="ffsave" data-k="${f.key}" data-i="${i}" data-save>Enregistrer</button><button class="btn ghost sm" type="button" data-act="form" data-v="">Annuler</button></div></div>`;
  }
  return `<div class="irow"><span class="grow"><span class="cap">${esc(x.label)}${x.req?" *":""}</span><br>${ed?editor:val?`<b>${esc(val)}</b>`:x.req?`<span class="miss">À renseigner</span>`:`<span class="t3">Non renseigné</span>`}
    ${!ed&&(x.edited||x.src)?`<br><span class="src">${esc(x.edited?`Modifié par ${x.edited}`:x.src)}</span>`:""}</span>
    ${!ed&&ficheEditable(f)?`<button class="btn ghost sm" type="button" data-act="form" data-v="fe:${f.key}:${i}">Modifier</button>`:""}</div>`;
}
function subRow(f,s,i){
  const ed=ficheEditable(f)&&S.form===`fs:${f.key}:${i}`;
  return `<div class="irow"><span class="grow"><span class="cap">${esc(s.name)} · ${esc(FSTATE[f.status][1])}</span><br>${ed?`<div class="fedit"><div class="grid2"><input class="in" id="fs-${f.key}-${i}" value="${esc(s.objective)}"><input class="in" type="date" id="fs-${f.key}-${i}-d" value="${s.date}"></div>
      <div class="btnrow"><button class="btn sm" type="button" data-act="fssave" data-k="${f.key}" data-i="${i}" data-save>Enregistrer</button><button class="btn ghost sm" type="button" data-act="form" data-v="">Annuler</button></div></div>`
     :`<b>${esc(s.objective)}</b><br><span class="src">Publié le · ${fullDate(fromIso(s.date))}</span>`}</span>
    ${!ed&&ficheEditable(f)?`<button class="btn ghost sm" type="button" data-act="form" data-v="fs:${f.key}:${i}">Modifier</button>`:""}</div>`;
}
function ficheCard(f){
  const cp=can("project"), dec=can("direction")&&f.status==="submitted", miss=ficheMissing(f);
  const respLine=f.resp?`Responsable : <b>${esc(nameOf(f.resp))}</b> <span class="src">· désigné par ${esc(f.respBy)}</span>`
    :cp?`<span class="grid2" style="align-items:end"><span class="field"><label for="fr-${f.key}">Responsable de la fiche *</label><select class="in" id="fr-${f.key}">${MEMBERS.map(k=>`<option value="${k}" ${k===holder("creative")?"selected":""}>${esc(P[k].name)} · ${esc(P[k].role)}</option>`).join("")}</select><span class="src">Suggestion : ${esc(nameOf(holder("creative")))}, responsable créatif. Rien n'est affecté sans vous.</span></span><span><button class="btn out sm" type="button" data-act="frset" data-k="${f.key}">Désigner</button></span></span>`
    :`<span class="miss">Responsable à désigner par ${esc(nameOf(holder("project")))}</span>`;
  const body=`<div class="eyebrow" style="justify-content:space-between"><span>${respLine}</span><span class="src">Validation : ${esc(nameOf(holder("direction")))} · V${f.version}</span></div>
    ${f.qualify?`<p class="note">À qualifier · ${esc(f.src)}</p>`:""}
    ${f.status==="changes"||f.status==="refused"?`<div class="callout ${f.status==="refused"?"bad":"warn"}">${I.warn}<span><b>${esc(f.decidedBy)} (${f.status==="refused"?"refuser":"demander des modifications"})</b> : « ${esc(f.note)} »</span></div>`:""}
    <div class="rows">${f.fields.map((x,i)=>fieldRow(f,x,i)).join("")}</div>
    ${f.subs?`<h3 style="font-size:15px">Éléments de la série</h3><div class="rows">${f.subs.map((s,i)=>subRow(f,s,i)).join("")}</div>`:""}
    ${errOf("f-"+f.key)}
    ${ficheEditable(f)?`<div class="btnrow"><button class="btn sm" type="button" data-act="fsubmit" data-k="${f.key}">${f.status==="changes"?"Corriger et soumettre à nouveau":"Soumettre à "+esc(nameOf(holder("direction")))}</button>${miss.length?`<span class="cap">Il manque : ${esc(miss.join(", "))}</span>`:""}</div>`:""}
    ${dec?`${ta("fNote-"+f.key,"Commentaire","Obligatoire pour demander des modifications ou refuser")}<div class="btnrow"><button class="btn sm" type="button" data-act="fdecide" data-k="${f.key}" data-v="approved">Valider la fiche V${f.version}</button><button class="btn out sm" type="button" data-act="fdecide" data-k="${f.key}" data-v="changes">Demander des modifications</button><button class="btn ghost sm" type="button" data-act="fdecide" data-k="${f.key}" data-v="refused">Refuser</button></div>`:""}
    ${f.status==="approved"?`<div class="btnrow">${!f.transferred&&cp?`<button class="btn sm" type="button" data-act="ftransfer" data-k="${f.key}">Transférer en Production</button>`:""}${f.resp===me()?`<button class="btn ghost sm" type="button" data-act="fnewv" data-k="${f.key}">Modifier (nouvelle version)</button>`:""}</div>`:""}
    ${f.transferred?`<p class="note">Transférée en Production par ${esc(f.transferred.by)} le ${esc(f.transferred.at)} · version V${f.transferred.v}${f.version>f.transferred.v?` · <b>la V${f.version} n'est pas encore transférée : la Production sera prévenue</b>`:""}</p>`:""}
    ${f.rounds.length?`<ul class="hist">${f.rounds.map(x=>`<li><span class="noc">•</span><span>${esc(x)}</span></li>`).join("")}</ul>`:""}`;
  const st=f.transferred&&f.version===f.transferred.v?pill("ok","Transférée"):pill(FSTATE[f.status][0],FSTATE[f.status][1]);
  return versionCard("fi"+f.key,!f.transferred||S.form&&S.form.includes(f.key),esc(f.name),st,esc(f.form),body);
}

/* ---------- Références : par livrable, une même référence peut servir plusieurs livrables ---------- */
const REF_KINDS=["Référence","Moodboard","Proposition créative","Version de travail"];
const REF_RIGHTS=["Licence libre","Usage interne","À vérifier"];
const REF_SEED=[
  ["ref2","Lumières géométriques","Moodboard",["Direction de la sortie"],"Le rose et le bleu, sans autre couleur."],
  ["ref3","Traînées de lumière dans la nuit","Référence",["Direction de la sortie","Clip officiel"],"Le mouvement de la traversée de la ville."],
  ["ref1","Reflets de néons sous la pluie","Référence",["Direction de la sortie"],""],
  ["ref4","Rue mouillée, la ville dans une flaque","Référence",["Clip officiel"],"Plans au sol, la ville à l'envers."],
  ["ref5","Néon dessiné, lumière rose","Proposition créative",["Pochette"],"La lumière du néon sur le visage, pas le néon lui-même."],
  ["ref6","Personnage au néon","Référence",[],"Déposée depuis le téléphone."]
];
const seedRefs=()=>REF_SEED.map(([k,title,kind,groups,notes])=>({id:"r"+k,img:REFPICS[k].url,credit:REFPICS[k].credit,title,kind,groups:[...groups],notes,rights:"Licence libre",by:"Nadia Benali",validated:false}));
const designGroups=()=>["Direction de la sortie"].concat(S.design.fiches.map(f=>f.name));
const refsEditable=()=>can("creative")&&!["submitted","approved"].includes(S.design.dir.status);
function refTile(r,group){
  const others=r.groups.filter(g=>g!==group), ed=refsEditable(), link=S.form==="rl:"+r.id;
  return `<div class="ref">${r.img?`<img src="${r.img}" alt="${esc(r.title)}">`:`<div class="ph none">${esc(r.link||"Fichier")}</div>`}
   <div class="bd"><b>${esc(r.title)}</b>${r.file?`<span class="src" style="font-size:12px">${esc(fileLine(r.file))}</span>`:""}<span class="eyebrow">${pill(r.validated?"ok":"",r.validated?"Validée":"Proposée")}<span class="src">${esc(r.kind)} · ${esc(r.rights)}</span></span>
    ${r.notes?`<span class="cap">${esc(r.notes)}</span>`:""}${others.length?`<span class="src">Aussi pour : ${esc(others.join(", "))}</span>`:""}
    <span class="src" style="font-size:12px">${esc(r.credit||`Déposée par ${r.by}`)}</span>
    ${ed&&link?`<div class="checks">${designGroups().map(g=>`<label><input type="checkbox" id="rg-${r.id}-${designGroups().indexOf(g)}" ${r.groups.includes(g)?"checked":""}>${esc(g)}</label>`).join("")}</div><div class="btnrow"><button class="btn sm" type="button" data-act="reflink" data-id="${r.id}">Enregistrer</button><button class="btn ghost sm" type="button" data-act="form" data-v="">Annuler</button></div>`
     :ed?`<div><button class="btn ghost sm" type="button" data-act="form" data-v="rl:${r.id}">${r.groups.length?"Rattacher à…":"Rattacher"}</button></div>`:""}</div></div>`;
}
function refAddForm(group){
  const gs=designGroups();
  return `<div class="card" style="background:var(--soft);padding:14px;gap:10px">
   <label class="drop" for="rFile"><input class="sr" type="file" id="rFile" accept="image/*,application/pdf,video/*"><span class="grow">Glissez une image, un PDF ou une vidéo, ou <u>choisissez-la</u></span></label><div class="thumbs" id="rThumb">${S.rdraft?`<span class="thumb"><img src="${S.rdraft.url}" alt="${esc(S.rdraft.name)}"></span>`:""}</div>
   <div class="grid2"><div class="field"><label for="rTitle">Titre *</label><input class="in" id="rTitle"${S.err.rTitle?' aria-invalid="true"':""}>${errOf("rTitle")}</div><div class="field"><label for="rLink">Ou un lien</label><input class="in" id="rLink" inputmode="url" placeholder="https://…">${errOf("rLink")}</div>
    <div class="field"><label for="rKind">Sorte</label><select class="in" id="rKind">${REF_KINDS.map(k=>`<option>${k}</option>`).join("")}</select></div><div class="field"><label for="rRights">Droits d'usage</label><select class="in" id="rRights">${REF_RIGHTS.map(k=>`<option ${k==="À vérifier"?"selected":""}>${k}</option>`).join("")}</select></div></div>
   <div class="field"><b>Rattacher à</b><div class="checks">${gs.map((g,i)=>`<label><input type="checkbox" id="rAdd-${i}" ${g===group?"checked":""}>${esc(g)}</label>`).join("")}</div><span class="src">Sans rattachement, elle va dans « À rattacher ».</span></div>
   <div class="field"><label for="rNotes">Notes</label><input class="in" id="rNotes"></div>
   <div class="btnrow"><button class="btn sm" type="button" data-act="radd">Ajouter la référence</button><button class="btn ghost sm" type="button" data-act="form" data-v="">Annuler</button></div></div>`;
}

/* ---------- Production : un parcours par livrable transféré ---------- */
const PROD_CHOICES={
  clip:[["ext","Externe","Une société de production est mandatée","societe","La société se choisit juste en dessous"],["int","Interne","PDS pilote, avec ses freelances","charge","Tom Mercier · chargé de production"]],
  teasers:[["decl","Décliné du Clip officiel","La même production les tire du montage du clip",null,"Fiche « Montant : compris dans le clip »"],["int","Interne","PDS les monte à part","charge","Tom Mercier · chargé de production"]],
  pochette:[["int","Interne","PDS la réalise ou la fait réaliser","da","Nadia Benali · responsable de la fiche"],["ext","Externe","Un photographe ou un illustrateur du Réseau","lou","Lou Vasseur · photographe, Réseau"]]
};
const choicesFor=k=>PROD_CHOICES[k]||[["int","Interne","PDS pilote","charge","Tom Mercier · chargé de production"],["ext","Externe","Un prestataire du Réseau","lou","Lou Vasseur · Réseau"]];
const MODE_LABEL={ext:"Externe",int:"Interne",decl:"Décliné du Clip officiel"};
const transferredFiches=()=>S.design.fiches.filter(f=>f.transferred);
const prodOf=k=>S.prods[k]||null;
/* Generic internal steps: a list of gestures, each done by a role (the « wf » engine of pds-app). */
const G=(id,liv,title,why,exec,valid,prereq,acts,facts)=>({id,mod:"production",liv,title,why,exec,coord:"project",valid,prereq,acts,facts:facts||[],generic:true});
function intVideoSteps(k){
  const p="iv"+k+"-";
  return [
    G(p+1,k,"Brief réalisateur","L'approche de réalisation : mise en scène, découpage, caméra, son. Elle complète la direction créative.","creative",[],["pq-"+k],[["creative","Compléter le brief réalisateur","Brief réalisateur complété"]],[["Concept","Fiche Livrable › Concept"],["Durée et formats","Fiche Livrable"]].concat(carriedFacts(k,/Proposition/))),
    {id:p+2,mod:"production",liv:k,title:prepTitle(k),why:"Chaque point devient une décision, une hypothèse, une action proposée ou un point à arbitrer ; les actions deviennent des tâches à l'approbation du plan.",exec:"project",coord:null,valid:[],prereq:[p+1],prep:true},
    G(p+3,k,"Équipes et matériel","Équipe image, équipe son et musiciens sont séparées ; chaque poste est confirmé, jamais supposé.","production",[],[p+2],[["production","Confirmer les équipes image, son et musiciens","Équipes confirmées"],["production","Valider la liste du matériel","Matériel validé (aucune réservation tant que le loueur ne l'a pas confirmée)"]]),
    G(p+4,k,"Lieu, budget et feuille de service","Le lieu retenu, le budget arbitré et la feuille de service envoyée avant le tournage.","production",["budget"],[p+3],[["production","Retenir le lieu","Lieu retenu"],["budget","Valider le budget de production","Budget validé"],["production","Envoyer la feuille de service","Feuille de service envoyée"]],carriedFacts(k,/Lieu|Budget|Tournage/)),
    G(p+5,k,"Tournage","Préparation confirmée, tournage déclaré, puis rushes et sauvegarde vérifiés séparément.","production",["project"],[p+4],[["project","Confirmer : préparation validée","Préparation validée — tournage à venir"],["project","Confirmer que le tournage a eu lieu","Tournage terminé — fichiers attendus"],["production","Rushes vidéo et audio récupérés","Rushes vidéo et audio récupérés"],["production","Sauvegarde vérifiée","Sauvegarde vérifiée"]])
  ];
}
function lightSteps(k){
  const pre=prodOf(k).mode==="int"&&(k==="clip"||k==="teasers")?["iv"+k+"-5"]:["pq-"+k];
  const gate=prodOf(k).mode==="decl"?{gate:()=>clipCutApproved(),gateText:"Montage du clip validé"}:{};
  return [
    {id:"lv-"+k,mod:"production",liv:k,title:k==="pochette"?"Versions de la pochette":"Versions",why:"Chaque version a son fichier et ses retours ; elle est validée sur pièce, jamais par absence de commentaire.",exec:"p:"+(prodOf(k).who||""),coord:"project",valid:[validatorFor(k)],prereq:pre,light:"versions",...gate},
    {id:"lc-"+k,mod:"production",liv:k,title:"Contrôle technique",why:"Une version validée n'est pas encore livrable : on contrôle les fichiers attendus, un par un.",exec:"production",coord:"project",valid:[],prereq:["lv-"+k],light:"control"},
    {id:"ld-"+k,mod:"production",liv:k,title:"Livraison",why:"Version validée, fichiers conformes, puis livraison : trois décisions distinctes.",exec:"project",coord:null,valid:[],prereq:["lc-"+k],light:"delivery"}
  ];
}
const validatorFor=k=>prodOf(k)&&prodOf(k).who===holder("creativeInt")?"direction":"creativeInt";
const clipCutApproved=()=>{const p=prodOf("clip");if(!p) return false;return p.mode==="ext"?S.post.versions.some(v=>v.status==="approved"):!!(S.light.clip&&S.light.clip.versions.some(v=>v.status==="approved"));};
const livDelivered=k=>{const p=prodOf(k);if(!p||!p.mode) return false;return k==="clip"&&p.mode==="ext"?!!S.delivery.closed:!!(S.light[k]&&S.light[k].delivered);};
function prodSteps(){
  const out=[];
  transferredFiches().forEach(f=>{
    const k=f.key,p=prodOf(k);
    out.push({id:"pq-"+k,mod:"production",liv:k,title:"Qui produit ?",why:"Interne : PDS pilote, avec ses freelances. Externe : une société ou un prestataire est mandaté. Le choix se fait par livrable.",exec:"project",coord:null,valid:[],prereq:[]});
    if(!p||!p.mode) return;
    if(k==="clip"&&p.mode==="ext") out.push(...PROD);
    else{if(p.mode==="int"&&(k==="clip"||k==="teasers")) out.push(...intVideoSteps(k));out.push(...lightSteps(k));}
  });
  return out;
}
const lightOf=k=>S.light[k]||(S.light[k]={versions:[],checks:{},controlled:null,delivered:null});
const gph=id=>S.gph[id]||0;
function genericNext(s){const n=gph(s.id);return n<s.acts.length?{r:holder(s.acts[n][0]),todo:s.acts[n][1]}:null;}
function genericBody(s){
  const n=gph(s.id), nx=genericNext(s);
  return `${s.facts.length?callFacts(s.facts.map(([k,v])=>[k,esc(v)])):""}
   ${nx?(nx.r===me()?`<div class="btnrow"><button class="btn" type="button" data-act="gdo" data-id="${s.id}">${esc(nx.todo)}</button></div>`:waitRow(nx.r,nx.todo)):""}
   ${n?`<ul class="hist">${s.acts.slice(0,n).map(a=>`<li><span class="okc">✓</span><span>${esc(a[2])}${S.gby[s.id+":"+s.acts.indexOf(a)]?` · ${esc(S.gby[s.id+":"+s.acts.indexOf(a)])}`:""}</span></li>`).join("")}</ul>`:""}`;
}
/* A sample cover drawn by the code at the real size (3000 × 3000), to try the check. */
function sampleCover(){
  const c=document.createElement("canvas");c.width=3000;c.height=3000;const g=c.getContext("2d");
  const lg=g.createLinearGradient(0,0,3000,3000);lg.addColorStop(0,"#120b1f");lg.addColorStop(1,"#05070f");g.fillStyle=lg;g.fillRect(0,0,3000,3000);
  g.shadowBlur=120;g.shadowColor="#ff3fa4";g.strokeStyle="#ff63b8";g.lineWidth=46;g.beginPath();g.arc(1500,1350,700,0,Math.PI*2);g.stroke();
  g.shadowColor="#3f8bff";g.strokeStyle="#6aa8ff";g.lineWidth=30;g.beginPath();g.arc(1500,1350,560,Math.PI*.15,Math.PI*1.2);g.stroke();
  g.shadowBlur=0;g.fillStyle="#f2f2f2";g.font="600 260px sans-serif";g.textAlign="center";g.fillText("NÉONS",1500,2520);g.font="500 120px sans-serif";g.fillText("MONA LYS",1500,2720);
  return {name:"Pochette_Neons_V1.jpg",url:c.toDataURL("image/jpeg",.85),w:3000,h:3000,type:"image/jpeg"};
}
function lightBody(s){
  const k=s.liv, L=lightOf(k), p=prodOf(k), f=ficheByKey(k), who=p.who, isImg=k==="pochette";
  if(s.light==="versions"){
    const last=lastOf(L.versions), v=validatorFor(k), mine=who===me()||(P[who]&&P[who].where!=="app"&&can("project"));
    let act="";
    if(mine&&(!last||last.status==="changes")) act=isImg?`<div class="vers"><h3>Déposer la version V${L.versions.length+1}</h3><label class="drop" for="cvFile"><input class="sr" type="file" id="cvFile" accept="image/*"><span class="grow">Glissez l'image de la pochette, ou <u>choisissez-la</u><br><span class="src">Le code lit sa taille et son format.</span></span></label>${errOf("cvFile")}
        <div class="btnrow"><button class="btn ghost sm" type="button" data-act="cvsample" data-k="${k}">Utiliser un fichier d'exemple</button></div></div>`
      :`<div class="field"><label for="lvLink">Lien de la version V${L.versions.length+1} *</label><input class="in" id="lvLink" placeholder="https://…">${errOf("lvLink")}</div><div class="btnrow"><button class="btn" type="button" data-act="lvdeposit" data-k="${k}">Déposer la V${L.versions.length+1}</button><button class="btn ghost sm" type="button" data-act="lvsample" data-k="${k}">Utiliser un lien d'exemple</button></div>`;
    else if(last&&last.status==="review"&&can(v)) act=`<div class="vers"><h3>Votre décision sur la V${last.n}</h3>${ta("lvNote","Retours","Obligatoire pour demander des modifications")}<div class="btnrow"><button class="btn" type="button" data-act="lvdecide" data-k="${k}" data-v="approved">Valider la V${last.n}</button><button class="btn out" type="button" data-act="lvdecide" data-k="${k}" data-v="changes">Demander des modifications</button></div></div>`;
    const cards=[...L.versions].reverse().map(x=>versionCard(`lv${k}${x.n}`,x===last||x.status==="approved",`V${x.n}`,pill(x.status==="approved"?"ok":x.status==="changes"?"warn":"info",x.status==="approved"?"Validée":x.status==="changes"?"Modifications demandées":"En revue"),`Déposée par ${esc(x.by)} le ${esc(x.at)}`,
      `${x.img?`<img src="${x.img}" alt="${esc(x.name)}" style="width:min(280px,100%);aspect-ratio:1;object-fit:cover;border-radius:8px;border:1px solid var(--hair)"><span class="src">${esc(x.name)} · ${x.w} × ${x.h} px · lu par le code</span>`:`<a href="#" data-act="nolink">${esc(x.url)}</a>`}
       ${x.note?`<span class="src">${esc(x.decidedBy)} : « ${esc(x.note)} »</span>`:""}`)).join("");
    return `${callFacts([["Production",`${esc(MODE_LABEL[p.mode])} · ${esc(nameOf(who)||"—")}`],["Fiche",`V${f.transferred.v} · ${esc(fieldText(f.fields.find(x=>x.k==="format"||x.k==="ratios"))||"")}`]])}${cards?`<div class="vers"><h3>Versions</h3>${cards}</div>`:""}${act||(last&&last.status==="review"?waitRow(holder(v),`valider la V${last.n}`):mine?"":waitRow(who,"déposer une version"))}`;
  }
  if(s.light==="control"){
    const ok=[...L.versions].reverse().find(x=>x.status==="approved"), done=!!L.controlled;
    const auto=isImg&&ok?[["3000 × 3000 px",ok.w===3000&&ok.h===3000,`${ok.w} × ${ok.h} px`],["JPG ou PNG",/jpe?g|png/.test(ok.type),ok.type.replace("image/","").toUpperCase()],["Carré",ok.w===ok.h,ok.w===ok.h?"Oui":"Non"]]:[];
    const manual=isImg?["Lisible en petit (vignette de 64 px)","Couleurs conformes à la version validée"]:(f.fields.find(x=>x.k==="ratios")||{value:[]}).value.map(r=>`Export ${r} présent et lisible`).concat(["Durée conforme à la fiche","Son contrôlé",(fieldText(f.fields.find(x=>x.k==="soustitres")||{})||"").startsWith("Oui")?"Sous-titres présents":null,"Nommage des fichiers conforme"].filter(Boolean));
    const allAuto=auto.every(a=>a[1]);
    return `${auto.length?`<div class="vers"><h3>Contrôlé par le code</h3><div class="rows">${auto.map(([l,o,v])=>`<div class="irow"><span class="grow">${esc(l)}<br><span class="src">${esc(v)}</span></span>${pill(o?"ok":"bad",o?"Conforme":"Non conforme")}</div>`).join("")}</div></div>`:""}
     <div class="vers"><h3>À contrôler</h3><div class="checks">${manual.map((m,i)=>`<label><input type="checkbox" id="lc-${i}" ${done||L.checks[i]?"checked":""} ${done||!can("production")?"disabled":""}>${esc(m)}</label>`).join("")}</div>${errOf("lc")}</div>
     ${done?`<div class="callout ok">${I.ok}<span><b>Fichiers conformes</b>, contrôlés par ${esc(L.controlled.by)} le ${esc(L.controlled.at)}.</span></div>`:can("production")?(allAuto?`<div class="btnrow"><button class="btn" type="button" data-act="lccheck" data-k="${k}" data-n="${manual.length}">Confirmer : fichiers conformes</button></div>`:`<div class="callout bad">${I.stop}<span>Le fichier validé n'est pas conforme : demandez une nouvelle version.</span></div>`):waitRow(holder("production"),"contrôler les fichiers")}`;
  }
  const dest=k==="pochette"?["Distribution · pochette validée","Activations"]:["Activations · Contenus sur les réseaux"];
  return L.delivered?`<div class="callout ok">${I.ok}<span><b>Livré</b> le ${esc(L.delivered.at)} par ${esc(L.delivered.by)} à : ${esc(dest.join(", "))}. Livré ne veut pas dire publié.</span></div>`
    :`${callFacts([["Destinataires",esc(dest.join(" · "))],["Version",`V${([...L.versions].reverse().find(x=>x.status==="approved")||{n:"—"}).n} validée, fichiers conformes`]])}${can("project")?`<div class="btnrow"><button class="btn" type="button" data-act="lddeliver" data-k="${k}">Confirmer la livraison</button></div>`:waitRow(holder("project"),"confirmer la livraison")}`;
}
function lightNext(s){
  const k=s.liv,L=lightOf(k),last=lastOf(L.versions),who=prodOf(k).who;
  if(s.light==="versions"){if(!last||last.status==="changes") return {r:P[who]&&P[who].where!=="app"?holder("project"):who,todo:last?`Déposer la V${last.n+1}`:"Déposer la V1"};if(last.status==="review") return {r:holder(validatorFor(k)),todo:`Valider la V${last.n}`};return null;}
  if(s.light==="control") return L.controlled?null:{r:holder("production"),todo:"Contrôler les fichiers"};
  return L.delivered?null:{r:holder("project"),todo:"Confirmer la livraison"};
}
function pqBody(s){
  const k=s.liv,p=prodOf(k),f=ficheByKey(k),ch=choicesFor(k);
  const hist=p&&p.history&&p.history.length?`<div class="vers"><h3>Choix précédents</h3><ul class="hist">${p.history.map(h=>`<li><span class="noc">↺</span><span><b>${esc(MODE_LABEL[h.mode])}${h.who?" · "+esc(nameOf(h.who)):""}</b> · arrêté le ${esc(h.stoppedAt)} par ${esc(h.stoppedBy)} : « ${esc(h.why)} »${h.done.length?`<br><span class="src">Déjà fait : ${esc(h.done.join(" · "))}</span>`:""}</span></li>`).join("")}</ul></div>`:"";
  if(p&&p.mode) return `<div class="callout ok">${I.ok}<span><b>${esc(MODE_LABEL[p.mode])}${p.who?` · ${esc(nameOf(p.who))}`:""}</b>${p.prep&&p.prep.org?` · ${esc(PREP_MODES.find(m=>m[0]===p.prep.org)[1].toLowerCase())}`:""}, choisi par ${esc(p.by)} le ${esc(p.at)}.</span></div>${callFacts([["Fiche transférée",`${esc(f.name)} · V${f.transferred.v}`],["Livraison finale le",esc(fieldText(f.fields.find(x=>x.k==="livraison"))||"—")]].concat(p.carried&&p.carried.length?[["Repris du parcours précédent",esc(p.carried.join(" · "))]]:[]))}
   ${can("project")&&!livDelivered(k)?`<div class="btnrow"><button class="btn out sm" type="button" data-act="pqchange" data-k="${k}">Changer qui produit</button></div>`:""}${hist}`;
  if(!can("project")) return waitRow(holder("project"),"choisir qui produit");
  const miss=[S.err.pqCo?"la société":"",S.err.pqOrg?"l'organisation de la préproduction":""].filter(Boolean);
  return `<div class="pqwrap">${miss.length?`<div class="formmsg" role="alert">${I.warn}<span>Il manque ${miss.join(" et ")} : choisissez-${miss.length>1?"les":"la"} ci-dessous, puis confirmez.</span></div>`:""}${callFacts([["Fiche transférée",`${esc(f.name)} · V${f.transferred.v} · ${esc(f.form)}`],["Livraison finale le",esc(fieldText(f.fields.find(x=>x.k==="livraison"))||"—")]])}
   <fieldset class="pick"><legend><b>Qui produit ce livrable ?</b> *</legend><div class="opts">${ch.map(([m,l,d,who,src],i)=>`<label class="opt"><input type="radio" name="pqMode" value="${m}" ${(S.pqDraft&&S.pqDraft.k===k?S.pqDraft.mode===m:i===0)?"checked":""}><span class="grow"><b>${esc(l)}</b> · ${esc(d)}${who?`<br><span class="src">${esc(src)}</span>`:`<br><span class="src">${esc(src)}</span>`}</span></label>`).join("")}</div>
   <span class="src">Proposé d'après la fiche et le Réseau ; vous confirmez.</span></fieldset>
   ${k==="clip"?companyField(k):""}
   ${prepLiv(k)?prepModeField(k,"pqOrg"):""}
   <div class="btnrow"><button class="btn" type="button" data-act="pqset" data-k="${k}">Confirmer</button></div></div>`;
}

/* ---------- Stratégie validée : les documents et les conséquences ---------- */
function onStrategyValidated(){
  const p=planItems();
  S.design.fiches=p.livs.map(newFiche);
  S.actProps=p.acts.map(x=>({k:x.k,lever:x.lever,title:x.title,kind:x.kind,unit:x.unit,j:x.j,needs:x.needs||null,state:"proposed",mode:null}));
}

/* ---------- Steps of the four modules (Production comes from prodSteps()) ---------- */
const MK_STEPS=[
  {id:"st1",mod:"strategy",get title(){const p=S.stratPrep;return !p||!p.org?"Démarrer la stratégie":p.org==="call"?"Échange stratégique":"Départ";},why:"Commencer directement, ou préparer un échange avec l'équipe ; ce qui y sera dit deviendra des propositions, dimension par dimension.",exec:"project",coord:null,valid:[],prereq:["fr4"]},
  {id:"st2",mod:"strategy",title:"Les 8 dimensions",why:"Ce que l'échange a fait dire, rangé par dimension. On confirme, on corrige ou on écarte, on ajoute ce qui manque : plus rien « à arbitrer » ni « à compléter ».",exec:"project",coord:null,valid:[],prereq:["st1"]},
  {id:"st3",mod:"strategy",title:"Validation du Brief de sortie",why:"La direction valide le Brief de sortie sur pièce. Pendant la relecture, la Stratégie est figée.",exec:"project",coord:null,valid:["direction","creativeInt"],prereq:["st2"]},
  {id:"st4",mod:"strategy",title:"Stratégie validée",why:"Le Brief de sortie V1 est figé. Les documents se préparent à partir de lui, et ses décisions alimentent la Conception, les Activations et le Planning.",exec:"project",coord:null,valid:[],prereq:["st3"]},
  {id:"de0",mod:"design",title:"Accueil",why:"Les livrables reçus de la Stratégie, le responsable créatif, et la façon de commencer : préparer un échange créatif ou commencer directement.",exec:"project",coord:null,valid:[],prereq:["st3"]},
  {id:"de1",mod:"design",title:"Intentions",why:"Ce que la sortie et chaque livrable doivent raconter. Chaque intention est confirmée avant la direction artistique.",exec:"creative",coord:"project",valid:[],prereq:["de0"]},
  {id:"deR",mod:"design",title:"Références",why:"Moodboards et références, rattachés à un ou plusieurs livrables. Elles restent des propositions jusqu'à la validation de la direction.",exec:"creative",coord:"project",valid:[],prereq:["de1"]},
  {id:"de2",mod:"design",title:"Direction artistique",why:"Le concept, les codes, le ton et les lignes rouges, avec les références choisies, soumis à la direction.",exec:"creative",coord:"project",valid:["direction"],prereq:["deR"]},
  {id:"deB",mod:"design",title:"Brief créatif",why:"Le cadre commun à tous les livrables, établi par le code depuis ce qui est validé. Il ne remplace pas les fiches.",exec:"creative",coord:"project",valid:[],prereq:["de2"]},
  {id:"de3",mod:"design",title:"Fiches Livrables",why:"Une fiche par livrable ou par série : chacune a son responsable, se complète, se valide et part en Production seule.",exec:"creative",coord:"project",valid:["direction"],prereq:["deB"]}
];
const AC0={id:"ac0",mod:"activations",title:"Leviers à préparer",why:"Chaque levier retenu dans le Brief de sortie peut devenir une activation. Vous la créez quand vous êtes prêt, avec son mode pour l'influence et la presse.",exec:"project",coord:null,valid:[],prereq:["st3"]};
const REVIEW_STEPS=[
  {id:"bi1",mod:"review",title:"Bilan provisoire",why:"Un rapport figé à une date, calculé par le code. La direction l'approuve, même avec des activations encore ouvertes ; approuver ne vérifie ni ne clôture rien.",exec:"project",coord:null,valid:["direction"],prereq:["ac0"]},
  {id:"bi2",mod:"review",title:"Réserves",why:"Chaque réserve est arbitrée par le responsable : à lever avant la clôture, à suivre après, non applicable ou doublon ; la direction peut l'accepter comme limite définitive.",exec:"project",coord:null,valid:["direction"],prereq:["bi1"]},
  {id:"bi3",mod:"review",title:"Clôture du Marketing",why:"La direction clôture le volet Marketing. Ensuite on lit seulement, et les preuves restent acceptées. Il peut être rouvert, avec un motif.",exec:"project",coord:null,valid:["direction"],prereq:["bi2"]}
];
const actStep=a=>({id:a.id,mod:"activations",title:a.title,why:ACT_WHY[a.kind],exec:"p:"+(a.resp||""),coord:"project",valid:["direction"],prereq:["st3"],act:a,...(a.needs==="clip"?{gate:()=>livDelivered("clip"),gateText:"Clip officiel livré"}:{})});

function doneMk(id){
  const a=actById(id);if(a) return a.status==="closed"||a.status==="cancelled";
  const s=id.startsWith("pq-")||id.startsWith("iv")||id.startsWith("lv-")||id.startsWith("lc-")||id.startsWith("ld-")?STEP(id):null;
  if(s){
    if(id.startsWith("pq-")) return !!(prodOf(s.liv)&&prodOf(s.liv).mode);
    if(s.generic) return gph(id)>=s.acts.length;
    if(s.prep) return !!prepOf(s.liv).plan;
    const L=lightOf(s.liv);
    if(s.light==="versions") return L.versions.some(v=>v.status==="approved");
    if(s.light==="control") return !!L.controlled;
    return !!L.delivered;
  }
  switch(id){
    case "fr1":case "fr2":case "fr3":case "fr4":return frDone(id);
    case "st1":return prepReady("strat");
    case "st2":return S.strat.items.length>0&&dims().every(d=>d.st==="ok");
    case "st3":case "st4":return !!S.strat.validated;
    case "de0":{const d=S.design;return !!d.respBy&&!!d.path&&(d.path==="direct"||!!d.callDone);}
    case "de1":return !S.design.items.some(x=>x.state==="proposed")&&S.design.items.some(x=>x.state==="kept");
    case "deR":return S.design.refs.length>0&&!S.design.refs.some(r=>!r.groups.length);
    case "de2":return S.design.dir.status==="approved";
    case "deB":return !!S.design.brief;
    case "de3":return S.design.fiches.length>0&&S.design.fiches.every(f=>!!f.transferred);
    case "ac0":return S.actProps.length>0&&!S.actProps.some(x=>x.state==="proposed");
    case "bi1":return !!approvedReport();
    case "bi2":return !!approvedReport()&&reservesOpen().length===0;
    case "bi3":return !!S.review.closed;
    case "kickoff":return !!S.kick.confirmed;
  }
  return undefined;
}
function actorsMk(id){
  const A=(slot,todo,due)=>holder(slot)?[{r:holder(slot),todo,due,step:id}]:[];
  const a=actById(id);
  if(a){const n=actNext(a);const l=n&&n.r?[{r:n.r,todo:n.todo,step:id,due:a.due&&n.todo!=="Fixer l'échéance"?"pour le "+fullDate(fromIso(a.due)):null}]:[];
    if(!["closed","cancelled","suspended"].includes(a.status)){collabsOf(a).forEach(c=>{const x=collabNext(a,c);if(x&&x.r) l.push({r:x.r,todo:`${x.todo} · ${nameOf(c.k)}`,step:id});});const g=agNext(a);if(g) l.push({r:g.r,todo:g.todo,step:id});rpNext(a).forEach(x=>l.push({...x,step:id}));}return l;}
  if(id.startsWith("pq-")) return A("project","Choisir qui produit");
  const s=id.startsWith("iv")||id.startsWith("lv-")||id.startsWith("lc-")||id.startsWith("ld-")?STEP(id):null;
  if(s){const n=s.prep?prepNext(s.liv):s.generic?genericNext(s):lightNext(s);return n&&n.r?[{r:n.r,todo:n.todo,step:id}]:[];}
  switch(id){
    case "st2":{const n=S.strat.items.filter(x=>x.state==="proposed").length, ds=dims(), arb=ds.find(d=>d.st==="arb"), todo=ds.find(d=>d.st==="todo");
      return n?A("project",`Confirmer ou écarter ${n} proposition${n>1?"s":""} de PO`):arb?A("project","Arbitrer : "+lcFirst(arb.name)):todo?A("project","Compléter : "+lcFirst(todo.name)):[];}
    case "st3":{const r=S.strat.review;if(!r) return A("project","Demander la validation du Brief de sortie");if(r.changes) return A("project","Répondre et transmettre à nouveau");
      return r.validators.filter(v=>!r.dec[v]).map(v=>({r:v,todo:"Valider le Brief de sortie",step:id}));}
    case "st4":return [];
    case "fr1":case "fr2":case "fr3":case "fr4":return frActors(id);
    case "st1":{if(prepReady("strat")) return [];const g=prepNext("strat");return g?[{...g,todo:g.todo.replace("Choisir comment organiser la préproduction","Démarrer la stratégie").replace("call de production","échange stratégique"),step:id}]:[];}
    case "de0":{const d=S.design;return !d.respBy?A("project","Désigner le responsable créatif"):!d.path?A("project","Choisir comment commencer la Conception"):d.path==="call"&&!d.call?A("project","Créer l'échange créatif"):[];}
    case "de1":{const n=S.design.items.filter(x=>x.state==="proposed").length;return A("creative",n?`Confirmer ou écarter ${n} intention${n>1?"s":""}`:"Écrire les intentions");}
    case "deR":{const n=S.design.refs.filter(r=>!r.groups.length).length;return A("creative",n?`Rattacher ${n} référence${n>1?"s":""}`:"Ajouter des références");}
    case "de2":{const d=S.design.dir;return d.status==="submitted"?A("direction","Valider la direction artistique"):A("creative",d.status==="changes"?"Répondre et soumettre à nouveau":"Soumettre la direction à "+nameOf(holder("direction")));}
    case "deB":return A("creative","Établir le Brief créatif V1");
    case "de3":return S.design.fiches.filter(f=>!f.transferred||f.version>f.transferred.v).map(f=>
      !f.resp?{r:holder("project"),todo:`Désigner le responsable de la fiche ${f.name}`,step:id}
      :f.status==="submitted"?{r:holder("direction"),todo:`Valider la fiche ${f.name}`,step:id}
      :f.status==="approved"?{r:holder("project"),todo:`Transférer ${f.name} en Production`,step:id}
      :{r:f.resp,todo:f.status==="changes"||f.status==="refused"?`Corriger la fiche ${f.name}`:`Compléter et soumettre la fiche ${f.name}`,step:id});
    case "ac0":{const n=S.actProps.filter(x=>x.state==="proposed").length;return A("project",`Créer ou reporter ${n} activation${n>1?"s":""}`);}
    case "bi1":{const r=lastReport();if(!r||r.status==="changes"||r.status==="postponed") return new Date(...S.base)<relDay(0)?[]:A("project",`Préparer la version ${S.review.reports.length+1} du bilan`);if(r.status==="generated") return A("project","Soumettre le bilan à validation");if(r.status==="submitted") return A("direction","Approuver le bilan provisoire");return [];}
    case "bi2":{const o=reservesOpen(), un=o.filter(r=>!r.arb);return un.length?A("project",`Arbitrer ${un.length} réserve${un.length>1?"s":""}`):o.length?A("project","Lever : "+o[0].text):[];}
    case "bi3":return S.review.closeReq?A("direction","Clôturer le Marketing"):A("project","Demander la clôture");
    case "kickoff":{const g=prodOf("clip")&&!S.kick.confirmed&&prepNext("clip");if(g) return [{...g,step:id}];const n=S.kick.items.filter(x=>x.state==="proposed").length;return A("project",`Confirmer ou écarter ${n} tâche${n>1?"s":""} proposée${n>1?"s":""}`);}
  }
  return null;
}
function summaryMk(id){
  const a=actById(id);
  if(a) return a.status==="closed"?`Clôturée${a.stats.value!=null?` · ${fmtN(a.stats.value)} ${a.unit}`:""}`:OSTATE[dispStatus(a)][1];
  if(id.startsWith("pq-")){const p=prodOf(id.slice(3));return p&&p.mode?`${MODE_LABEL[p.mode]}${p.who?" · "+nameOf(p.who):""}`:"";}
  if(id.startsWith("iv")){const s=STEP(id);if(s&&s.prep){const p=prepOf(s.liv);return p.plan?`Plan approuvé · ${p.items.filter(x=>x.kind==="action"&&x.state==="kept").length} tâches`:"";}return "Fait";}
  if(id.startsWith("lv-")){const v=[...lightOf(id.slice(3)).versions].reverse().find(x=>x.status==="approved");return v?`V${v.n} validée`:"";}
  if(id.startsWith("lc-")) return "Fichiers conformes";
  if(id.startsWith("ld-")) return "Livré";
  switch(id){
    case "st2":return `Brief de sortie établi · ${S.strat.items.filter(x=>x.state==="kept").length} réponses confirmées`;
    case "fr1":case "fr2":case "fr3":case "fr4":return frSummary(id);
    case "st1":{const p=S.stratPrep||{};return p.org==="call"?`Échange du ${prepDay(p.call)}`:"Commencée directement";}
    case "st3":return S.strat.validated?`Brief de sortie — V${S.strat.validated.v} validé`:"";
    case "st4":return "Brief V1 · Plan de sortie et Dossier de presse à générer";
    case "de0":return S.design.path==="direct"?"Commencé directement":"Échange créatif du Ven. 09/10";
    case "de1":return `${S.design.items.filter(x=>x.state==="kept").length} intentions confirmées`;
    case "deR":return `${S.design.refs.length} références rattachées`;
    case "de2":return "Direction validée";
    case "deB":return `Brief créatif V${S.design.brief?S.design.brief.v:1}`;
    case "de3":return `${S.design.fiches.length} fiches transférées en Production`;
    case "ac0":return `${S.acts.length} activations créées${S.actProps.some(x=>x.state==="later")?` · ${S.actProps.filter(x=>x.state==="later").length} plus tard`:""}`;
    case "bi1":{const r=approvedReport();return r?`V${r.n} approuvée${r.reserves.length?" avec réserves":""}`:"";}
    case "bi2":return S.review.reserves.length?`${S.review.reserves.length} réserve${S.review.reserves.length>1?"s":""} arbitrée${S.review.reserves.length>1?"s":""}`:"Aucune réserve";
    case "bi3":return S.review.closed?`Clôturé ${S.review.closed.withRes?"avec":"sans"} réserve`:"";
    case "kickoff":return S.kick.confirmed?`${kickOrigin()} · ${S.tasks.filter(t=>t.origin===kickOrigin()).length} tâches confirmées`:"";
  }
  return null;
}

/* ---------- Bodies of the reworked steps ---------- */
const chips=list=>`<span class="strip">${list.map(x=>`<span class="chip2">${esc(x)}</span>`).join("")}</span>`;
function briefDoc(){
  const ds=dims(), get=n=>ds.find(d=>d.name===n), kept=n=>dimItems(n).filter(x=>x.state==="kept").map(x=>x.text);
  const b=budget(), row=(k,v)=>`<div class="irow"><span class="grow"><span class="cap">${esc(k)}</span><br><b>${v}</b></span></div>`;
  return `<div class="doc">
   <section><h4>Pour qui et pourquoi</h4><div class="rows">${row("Positionnement",esc(kept("Positionnement").join(" · ")||"—"))}${row("Publics prioritaires",esc(kept("Publics prioritaires").join(" · ")||"—"))}${row("Narratif",esc(kept("Narratif de sortie").join(" · ")||"—"))}</div></section>
   <section><h4>Comment</h4><div class="rows"><div class="irow"><span class="grow"><span class="cap">Dispositif retenu</span><br>${chips(get("Dispositif").levers.filter(l=>l.state==="retenu").map(l=>l.name))}</span></div><div class="irow"><span class="grow"><span class="cap">Livrables</span><br>${chips(planItems().livs.map(x=>x.name))}</span></div></div></section>
   <section><h4>Quand</h4><div class="rows">${tempsForts().map(t=>`<div class="irow"><span class="num" style="min-width:150px;font-weight:600">${fullDate(relDay(t.j))}</span><span class="grow">${esc(t.name)} <span class="src">· ${jLabel(t.j)}</span></span></div>`).join("")}</div></section>
   <section><h4>Objectif et budget</h4><div class="statgrid"><div class="stat"><span class="k">Objectif</span><b>${esc(kept("Objectifs & KPIs").join(" · ")||"—")}</b>${dimItems("Objectifs & KPIs").filter(x=>x.state==="kept").map(x=>`<span class="src">${esc(objLine(x))}</span>`).join("")}</div><div class="stat"><span class="k">Budget proposé</span><b class="num">${euro(b.proposed)}</b><span class="src">sur ${euro(BUDGET_ENV)} · interne</span></div></div></section></div>`;
}
Object.assign(BODY_MK,{
  st3(){
    const r=S.strat.review, v=S.strat.validated;
    let act="";
    if(!r&&can("project")) act=`<div class="vers"><h3>Envoyer en validation</h3><div class="checks"><label><input type="checkbox" checked disabled>${esc(nameOf(holder("direction")))} <span class="src">· valide toujours</span></label><label><input type="checkbox" id="svDa" checked>${esc(nameOf(holder("creativeInt")))} <span class="src">· directrice créative</span></label></div>
      <div class="btnrow"><button class="btn" type="button" data-act="stask">Envoyer en validation</button></div></div>`;
    else if(r&&r.changes&&can("project")) act=`<div class="vers">${ta("stAnswer","Votre réponse","Ce qui a changé depuis la demande",true)}<div class="btnrow"><button class="btn" type="button" data-act="stresend">Répondre et transmettre à nouveau</button></div></div>`;
    else if(r&&!v&&!r.changes&&r.validators.includes(me())&&!r.dec[me()]) act=`<div class="vers"><h3>Votre décision</h3>${ta("stNote","Commentaire","Obligatoire pour des réserves ou une modification")}
      <div class="btnrow"><button class="btn" type="button" data-act="stdecide" data-v="ok">Valider le Brief de sortie</button><button class="btn out" type="button" data-act="stdecide" data-v="res">Valider avec réserves</button><button class="btn ghost" type="button" data-act="stdecide" data-v="changes">Demander une modification</button></div></div>`;
    else if(r&&!v&&!r.changes&&can("project")) act=`<div class="btnrow">${r.validators.filter(x=>!r.dec[x]).map(x=>`<button class="btn out sm" type="button" data-act="strelance" data-v="${x}">Relancer ${esc(nameOf(x))}</button>`).join("")}</div>`;
    const decs=r?r.validators.map(k=>{const d=r.dec[k];return `<div class="irow"><span class="grow"><b>${esc(nameOf(k))}</b>${d&&d.note?`<br><span class="src">« ${esc(d.note)} »</span>`:""}${S.strat.relances&&S.strat.relances[k]&&!d?`<br><span class="src">Relancée le ${esc(S.strat.relances[k])}</span>`:""}</span>${pill(!d?"info":d.kind==="changes"?"warn":"ok",!d?"En attente":d.kind==="ok"?"Validé":d.kind==="res"?"Validé avec réserves":"Modification demandée")}</div>`;}).join(""):"";
    return `${v?`<div class="callout ok">${I.ok}<span><b>Brief de sortie — V${v.v} validé</b> le ${esc(v.at)}. Il est figé ; le réviser crée une V${v.v+1}.</span></div>`:""}
     ${r&&r.changes?`<div class="callout warn">${I.warn}<span><b>${esc(r.changes.by)} (demander une modification)</b> : « ${esc(r.changes.note)} »</span></div>`:""}
     <div class="vers"><div class="dhead"><h3>Brief de sortie — V${v?v.v:(r?r.round:1)}</h3><span class="btnrow"><span class="src">Restant à arbitrer : ${esc(restArb().join(", ")||"aucun")}</span><button class="btn ghost sm" type="button" data-act="open" data-v="Brief de sortie — V1.pdf">Voir le PDF</button></span></div>${briefDoc()}</div>
     ${decs?`<div class="vers"><h3>Validation</h3><div class="rows">${decs}</div></div>`:""}
     ${act||waits("st3")}`;
  },
  st4(){
    const p=planItems(), tf=tempsForts(), up=LIVRABLES.filter(x=>kept(x.prop)).length*3;
    return `<div class="callout ok">${I.ok}<span><b>Stratégie validée</b> le ${esc(S.strat.validated.at)} : Brief de sortie — V1. Rien n'oblige à lancer la Conception maintenant.</span></div>
     <div class="vers"><h3>Documents</h3><div class="rows">
      <div class="irow"><span class="grow"><b>Brief de sortie — V1</b><br><span class="src">Interne · avec le budget</span></span><span class="btnrow">${pill("ok","Validé")}<button class="btn ghost sm" type="button" data-act="open" data-v="Brief de sortie — V1.pdf">Voir</button><button class="btn ghost sm" type="button" data-act="copylink" data-copy="https://pds-os.app/s/neons-brief-de-sortie-v1">Partager</button></span></div>
      <div class="irow"><span class="grow"><b>Plan de sortie</b><br><span class="src">Pour l'équipe de l'artiste · sans budget</span></span>${pill("","À générer")}</div>
      <div class="irow"><span class="grow"><b>Dossier de presse</b><br><span class="src">Pour les médias · sans budget</span></span>${pill("","À générer")}</div></div></div>
     <div class="vers"><h3>Ce que la Stratégie alimente</h3><div class="rows">
      <div class="irow"><span class="grow"><b>Conception</b> · ${p.livs.length} livrables à concevoir<br><span class="src">${esc(p.livs.map(x=>x.name).join(", "))}</span></span><button class="btn ghost sm" type="button" data-act="mod" data-v="design">Ouvrir</button></div>
      <div class="irow"><span class="grow"><b>Activations</b> · ${p.acts.length} leviers retenus à préparer<br><span class="src">${esc(p.acts.map(x=>x.lever).join(", "))}</span></span><button class="btn ghost sm" type="button" data-act="mod" data-v="activations">Ouvrir</button></div>
      <div class="irow"><span class="grow"><b>Planning</b> · ${tf.length} temps forts et ${up} échéances amont<br><span class="src">Calculés depuis la sortie du Sam. 05/12/2026</span></span></div></div></div>`;
  },
  de0(){
    const d=S.design, cp=can("project"), adding=S.form==="addliv";
    const livs=`<div class="vers"><div class="dhead"><h3>Livrables reçus (${d.fiches.length})</h3>${cp&&!adding?`<button class="btn out sm" type="button" data-act="form" data-v="addliv">Ajouter un livrable</button>`:""}</div>
      ${adding?`<div class="card" style="background:var(--soft);padding:14px;gap:10px"><div class="grid2"><div class="field"><label for="alName">Livrable *</label><input class="in" id="alName" placeholder="Ex. : Session acoustique">${errOf("alName")}</div><div class="field"><label for="alFmt">Format</label><input class="in" id="alFmt" placeholder="Ex. : 16:9, 4 min"></div>
        <div class="field"><label for="alSrc">Provenance</label><select class="in" id="alSrc"><option>Ajout manuel</option><option>Décision d'un call</option></select></div><div class="field"><label for="alWhy">Motif *</label><input class="in" id="alWhy" placeholder="Pourquoi l'ajouter maintenant">${errOf("alWhy")}</div></div>
        <div class="btnrow"><button class="btn sm" type="button" data-act="addliv">Ajouter</button><button class="btn ghost sm" type="button" data-act="form" data-v="">Annuler</button></div></div>`:""}
      <div class="rows">${d.fiches.map(f=>`<div class="irow"><span class="grow"><b>${esc(f.name)}</b> · ${esc(f.form)}<br><span class="src">${esc(f.src)}</span></span>${pill(f.qualify?"warn":"",f.qualify?"À qualifier":"Confirmé")}</div>`).join("")}</div></div>`;
    const resp=d.respBy?`<div class="irow" style="border:1px solid var(--hair);border-radius:10px"><span class="grow"><span class="cap">Responsable créatif</span><br><b>${esc(nameOf(holder("creative")))}</b> <span class="src">· désigné par ${esc(d.respBy)}</span></span></div>`
      :cp?`<div class="vers"><h3>Responsable créatif</h3><div class="grid2" style="align-items:end"><div class="field"><label for="crResp">Qui prépare la direction artistique *</label><select class="in" id="crResp">${MEMBERS.map(k=>`<option value="${k}" ${k==="da"?"selected":""}>${esc(P[k].name)} · ${esc(P[k].role)}</option>`).join("")}</select><span class="src">Suggestion : Nadia Benali, directrice créative du projet. Rien n'est affecté sans vous.</span></div><div><button class="btn out" type="button" data-act="crset">Désigner</button></div></div></div>`
      :waitRow(holder("project"),"désigner le responsable créatif");
    let start="";
    if(!d.path) start=cp?`<div class="vers"><h3>Comment commencer</h3><div class="choices2"><button class="choice" type="button" data-act="depath" data-v="call"><span class="eyebrow" style="gap:8px"><b>Préparer un échange créatif</b>${pill("info","Recommandé")}</span><span class="src">PO prépare l'objectif, les participants, les livrables et les sujets ; il propose ensuite les intentions, avec la phrase exacte.</span></button><button class="choice" type="button" data-act="depath" data-v="direct"><span class="eyebrow" style="gap:8px"><b>Commencer directement</b></span><span class="src">PO montre ce qui est déjà connu et ne demande que ce qui manque.</span></button></div><span class="src">Rien n'a encore été dit sur la direction artistique : un échange ira plus vite que des questions une à une.</span></div>`:"";
    else if(d.path==="call"&&!d.callDone) start=prepGate("design");
    else start=`<div class="irow" style="border:1px solid var(--hair);border-radius:10px"><span class="grow"><b>${d.path==="direct"?"Commencé directement":"Échange créatif du "+fullDate(fromIso(d.call.date))}</b><br><span class="src">${d.path==="direct"?`Par ${esc(d.pathBy)}`:"Compte rendu disponible : les intentions sont proposées dans l'étape suivante"}</span></span></div>`;
    return `${callFacts([["Projet","Néons · Mona Lys · Single"],["Sortie","Sam. 05/12/2026"],["Stratégie",`Brief de sortie V1 validé le ${esc(S.strat.validated?S.strat.validated.at:"—")}`]])}${livs}${resp}${start}${d.callDone?summaryBlock("design"):""}`;
  },
  de1(){
    const d=S.design, canEdit=can("creative")&&!["submitted","approved"].includes(d.dir.status);
    const groups=designGroups(), p=d.items.filter(x=>x.state==="proposed").length;
    const known=d.path==="direct"?callFacts([["Rôle des livrables",esc(d.fiches.map(f=>f.name).join(", "))],["Publics",esc(dimItems("Publics prioritaires").filter(x=>x.state==="kept").map(x=>x.text).join(" · ")||"—")],["Narratif",esc(dimItems("Narratif de sortie").filter(x=>x.state==="kept").map(x=>x.text).join(" · ")||"—")],["Temps forts",tempsForts().map(t=>`${esc(t.name)} · ${fullDate(relDay(t.j))}`).join("<br>")]]):
      callFacts([["Échange créatif",`${d.call?fullDate(fromIso(d.call.date)):"Ven. 09/10/2026"} · ${esc(d.call?d.call.fmt:"Sur place")} · 55 min`],["Compte rendu",`${crBtn("design")}`]]);
    return `${known}${p?poBox("PO a rangé les intentions dites pendant l'échange, avec la phrase exacte. Confirmez, corrigez ou écartez ; les livrables hériteront de la direction."):d.path==="direct"&&!d.items.length?poBox("Voici ce que PDS OS sait déjà. Écrivez les intentions qui manquent, en commençant par la direction de la sortie."):""}
     ${groups.map((g,i)=>{const it=d.items.filter(x=>x.group===g);const st=it.some(x=>x.state==="proposed")?["warn","À confirmer"]:it.some(x=>x.state==="kept")?["ok","Confirmé"]:i===0?["","À compléter"]:["","Hérite de la direction"];
       return versionCard("ig"+i,st[1]!=="Confirmé"&&st[1]!=="Hérite de la direction"||(S.form||"").includes(g),esc(g),pill(st[0],st[1]),counter(it),groupHead("design",g,"Ajouter une intention",canEdit)+(it.length?`<div class="rows">${it.map(x=>itemRow(x,canEdit,esc(x.q))).join("")}</div>`:`<p class="note">${i===0?"Rien n'a encore été dit sur la direction de la sortie.":"Rien n'a été dit sur ce livrable : il hérite de la direction de la sortie."}</p>`));}).join("")}
     ${waits("de1")}`;
  },
  deR(){
    const ed=refsEditable(), groups=designGroups().concat(["À rattacher"]);
    return `<p class="note">Une référence peut servir plusieurs livrables sans être importée deux fois. Pas de moodboard global imposé.</p>
     ${groups.map((g,i)=>{const list=g==="À rattacher"?S.design.refs.filter(r=>!r.groups.length):S.design.refs.filter(r=>r.groups.includes(g));
       if(g==="À rattacher"&&!list.length) return "";
       const adding=S.form==="radd:"+g;
       return versionCard("rg"+i,true,esc(g),g==="À rattacher"?pill("warn",`${list.length} à rattacher`):pill("",`${list.length} référence${list.length>1?"s":""}`),"",
        `${ed&&g!=="À rattacher"?(adding?refAddForm(g):`<div class="btnrow" style="justify-content:flex-end"><button class="btn out sm" type="button" data-act="form" data-v="radd:${esc(g)}">Ajouter une référence</button></div>`):""}
         ${list.length?`<div class="refgrid">${list.map(r=>refTile(r,g)).join("")}</div>`:`<p class="note">${i===0?"Aucune référence pour la direction de la sortie.":"Aucune référence propre : ce livrable hérite de celles de la direction."}</p>`}`);}).join("")}
     ${waits("deR")}`;
  },
  de2(){
    const d=S.design.dir, editable=can("creative")&&["draft","changes","refused"].includes(d.status);
    const rows=DIR_FIELDS.map((f,i)=>{const v=dirValue(i);return `<div class="irow"><span class="grow"><span class="cap">${esc(f)}</span><br>${v?`<b>${esc(v.v)}</b><br><span class="src">${esc(v.src)}</span>`:editable?`<input class="in" id="dirf${i}" placeholder="Rien n'a été dit : à écrire"${S.err["dirf"+i]?' aria-invalid="true"':""}>${errOf("dirf"+i)}`:`<span class="miss">À écrire par ${esc(nameOf(holder("creative")))}</span>`}</span></div>`;}).join("");
    const groups=designGroups(), nref=g=>S.design.refs.filter(r=>r.groups.includes(g)).length;
    const synth=`<div class="rows">${groups.map((g,i)=>{const f=S.design.fiches.find(x=>x.name===g), miss=f?ficheMissing(f):[];
      return `<div class="irow"><span class="grow"><b>${esc(g)}</b><br><span class="src">${nref(g)} référence${nref(g)>1?"s":""}${miss.length?` · à préciser dans la fiche : ${esc(miss.join(", "))}`:""}</span></span>${editable?`<label class="cap" style="display:flex;gap:6px;align-items:center"><input type="checkbox" id="dsec-${i}" ${i===0?"checked disabled":"checked"}>Soumettre</label>`:d.sections&&d.sections.includes(g)?pill("","Soumise"):""}</div>`;}).join("")}</div>`;
    let act="";
    if(editable) act=`<div class="btnrow"><button class="btn" type="button" data-act="dirsubmit">${d.status==="changes"?"Répondre et soumettre à nouveau":"Soumettre à "+esc(nameOf(holder("direction")))}</button></div>`;
    else if(d.status==="submitted"&&can("direction")) act=`<div class="vers"><h3>Votre décision</h3>${ta("dirNote","Commentaire","Obligatoire pour demander des modifications ou refuser")}<div class="btnrow"><button class="btn" type="button" data-act="dirdecide" data-v="approved">Valider la direction</button><button class="btn out" type="button" data-act="dirdecide" data-v="changes">Demander des modifications</button><button class="btn ghost" type="button" data-act="dirdecide" data-v="refused">Refuser</button></div></div>`;
    return `${d.status==="approved"?`<div class="callout ok">${I.ok}<span><b>Direction validée</b> par ${esc(d.decidedBy)} le ${esc(d.decidedAt)}. Les références soumises sont validées ; les livrables en héritent.</span></div>`:""}
     ${d.status==="changes"||d.status==="refused"?`<div class="callout warn">${I.warn}<span><b>${esc(d.decidedBy)} (${d.status==="refused"?"refuser":"demander des modifications"})</b> : « ${esc(d.note)} »</span></div>`:""}
     <div class="vers"><h3>Direction de la sortie</h3><div class="rows">${rows}</div></div>
     <div class="vers"><h3>Ce qui est soumis</h3><span class="src">Responsable : ${esc(nameOf(holder("creative")))} · validation : ${esc(nameOf(holder("direction")))}</span>${synth}</div>
     ${act||waits("de2")}
     ${d.rounds.length?`<ul class="hist">${d.rounds.map(x=>`<li><span class="noc">•</span><span>${esc(x)}</span></li>`).join("")}</ul>`:""}`;
  },
  deB(){
    const b=S.design.brief, kept=n=>dimItems(n).filter(x=>x.state==="kept").map(x=>x.text).join(" · ")||"—";
    const refs=S.design.refs.filter(r=>r.validated), open=S.design.fiches.flatMap(f=>ficheMissing(f).map(m=>`${f.name} : ${m}`));
    const doc=callFacts([["Contexte","Néons · Mona Lys · single, sortie le Sam. 05/12/2026 · Brief de sortie V1"],["Objectifs créatifs",esc(kept("Positionnement"))],["Publics et usages",esc(kept("Publics prioritaires"))],["Narratif",esc(kept("Narratif de sortie"))],
      ["Principes",esc([0,1].map(i=>(dirValue(i)||{v:""}).v).filter(Boolean).join(" · "))],["Ton",esc((dirValue(2)||{v:"—"}).v)],["À éviter",esc((dirValue(3)||{v:"—"}).v)],["Livrables",esc(S.design.fiches.map(f=>f.name).join(", "))],
      ["Références validées",`${refs.length} · ${esc(refs.map(r=>r.title).join(", "))}`],["Points encore ouverts",open.length?esc(open.join(" · ")):"Aucun"]]);
    return `${b?`<div class="callout ok">${I.ok}<span><b>Brief créatif — V${b.v}</b> établi par ${esc(b.by)} le ${esc(b.at)}. Sans budget.</span></div>`:poBox("Le code assemble le Brief créatif depuis ce qui est validé : rien n'est écrit par l'IA. Relisez, puis établissez la V1.")}
     <div class="vers"><div class="dhead"><h3>Brief créatif — V${b?b.v:1}</h3>${b?`<button class="btn ghost sm" type="button" data-act="open" data-v="Brief créatif — V1.pdf">Voir le PDF</button>`:""}</div>${doc}</div>
     ${!b&&(can("creative")||can("project"))?`<div class="btnrow"><button class="btn" type="button" data-act="brief">Établir le Brief créatif V1</button></div>`:b?"":waits("deB")}`;
  },
  de3(){return S.design.fiches.map(ficheCard).join("")+waits("de3");},
  ac0(){
    const cp=can("project");
    const props=S.actProps.length?`<div class="rows">${S.actProps.map((x,i)=>{const a=S.acts.find(y=>y.k===x.k);
      return `<div class="irow"><span class="grow"><b>${esc(x.title)}</b><br><span class="src">${esc(x.kind)} · levier ${esc(x.lever)} · Brief de sortie V1 › Dispositif</span></span>
       <span class="btnrow">${x.state==="created"&&a?`${pill("ok","Créée")}<button class="btn ghost sm" type="button" data-act="go" data-step="${a.id}">Ouvrir</button>`
        :x.state==="later"?`${pill("","Plus tard")}${cp?`<button class="btn ghost sm" type="button" data-act="apcreate" data-i="${i}">Créer</button>`:""}`
        :cp?`${["influence","rp"].includes(x.k)?`<select class="in" id="apm-${i}" style="height:32px;width:auto"><option>Gestion interne</option><option>Agence externe</option></select>`:""}<button class="btn out sm" type="button" data-act="apcreate" data-i="${i}">Créer l'activation</button><button class="btn ghost sm" type="button" data-act="aplater" data-i="${i}">Plus tard</button>`:pill("warn","À préparer")}</span></div>`;}).join("")}</div>`:`<p class="note">Les leviers arrivent ici quand la Stratégie est validée.</p>`;
    return props+waits("ac0");
  }
});
BODY_MK.de4=undefined;

/* Changing who produces: what was done, what is carried over, money engaged, the private link. */
function pqDone(k){return steps().filter(x=>x.mod==="production"&&x.liv===k&&!x.id.startsWith("pq-")&&statusOf(x.id)==="done").map(x=>`${x.title} (${summary(x.id)||"fait"})`);}
function pqCarry(k){
  const out=[], L=S.light[k];
  if(k==="clip"){
    if(S.locs.active!=null) out.push(`Lieu retenu : ${S.locs.cands[S.locs.active].name}`);
    const sc=currentSchedule();if(sc) out.push(sc.text);
    const q=activeQuote();if(q) out.push(`Budget de référence : ${euro(q.amount)} (devis V${q.n})`);
    const c=retainedCreative();if(c) out.push(`Proposition de réalisation V${c.n} retenue`);
    if(S.rushes.received) out.push("Rushes déjà reçus");
  }
  if(L&&L.versions.length) out.push(`${L.versions.length} version${L.versions.length>1?"s":""} déjà déposée${L.versions.length>1?"s":""}`);
  return out;
}
function pqChangeModal(){
  const k=S.modal.k, p=prodOf(k), f=ficheByKey(k), done=pqDone(k), carry=pqCarry(k), q=k==="clip"&&p.mode==="ext"?activeQuote():null;
  const opts=k==="clip"?companies().filter(x=>!(p.mode==="ext"&&x===p.who)).map(x=>[`ext:${x}`,"Externe",nameOf(x),x,CO_INFO[x]?"Réseau · "+CO_INFO[x]:"Réseau"]).concat(p.mode==="ext"?choicesFor(k).filter(c=>c[0]!=="ext"):[]):choicesFor(k).filter(c=>c[0]!==p.mode), link=p.who&&P[p.who]&&P[p.who].where==="lien"&&S.links[p.who]&&S.links[p.who].state==="active";
  return `<div class="mhead"><h2 id="mtitle">Changer qui produit · ${esc(f.name)}</h2><button class="mx" type="button" data-act="modalx" aria-label="Fermer">${I.x}</button></div>
   <p class="note">Aujourd'hui : <b>${esc(MODE_LABEL[p.mode])}${p.who?" · "+esc(nameOf(p.who)):""}</b>. Ce parcours n'est pas effacé : il reste dans l'historique avec ses décisions.</p>
   ${done.length?`<div class="field"><b>Déjà fait</b><span class="src">${esc(done.join(" · "))}</span></div>`:""}
   ${carry.length?`<div class="field"><b>Repris dans le nouveau parcours</b><span class="src">${esc(carry.join(" · "))}</span></div>`:""}
   ${q?`<div class="callout warn">${I.warn}<span>${euro(q.amount)} sont engagés auprès de ${esc(nameOf(p.who))} (devis V${q.n} validé). Changer de production ne les annule pas.</span></div>`:""}
   <fieldset class="pick"><legend><b>Nouveau choix</b> *</legend><div class="opts">${opts.map(([m2,l,d,who,src],i)=>`<label class="opt"><input type="radio" name="pqNew" value="${m2}" ${i===0?"checked":""}><span class="grow"><b>${esc(l)}</b> · ${esc(d)}<br><span class="src">${esc(src)}</span></span></label>`).join("")}</div></fieldset>
   ${link?`<div class="checks"><label><input type="checkbox" id="pqRevoke" checked>Révoquer le lien privé de ${esc(nameOf(p.who))}</label></div><span class="src">Ce qu'elle a déposé reste. Décochez si des fichiers sont encore attendus d'elle.</span>`:""}
   ${ta("pqWhy","Motif","Ex. : la société ne peut plus tenir la date de tournage",true)}
   <div class="btnrow"><button class="btn" type="button" data-act="pqchgok">Changer qui produit</button><button class="btn ghost" type="button" data-act="modalx">Annuler</button></div>`;
}

const carriedFacts=(k,re)=>{const p=prodOf(k);return (p&&p.carried||[]).filter(x=>re.test(x)).map(x=>[x.split(" : ")[0],(x.split(" : ")[1]||x)+" · repris du parcours précédent"]);};

/* The information noted for a step, shown in that step (no « Décisions » tab). */
function stepDecisions(s){
  const list=S.decisions.filter(d=>d.step===s.id&&!d.discarded);if(!list.length) return "";
  const contra=new Set(contradictions().flat().map(d=>d.id));
  return `<div class="vers"><h3>Informations notées</h3><div class="rows dec">${list.map(d=>decRow(d,contra.has(d.id))).join("")}</div>${list.some(d=>contra.has(d.id))?`<span class="src">Deux informations se contredisent : tant qu'aucune ne fait foi, c'est un blocage.</span>`:""}</div>`;
}
const strip1=html=>html.replace(/^<section class="card">/,"").replace(/<\/section>$/,"");
function decisionsModal(){return `<div class="mhead"><h2 id="mtitle">Informations et décisions</h2><button class="mx" type="button" data-act="modalx" aria-label="Fermer">${I.x}</button></div>${strip1(decisionsView())}`;}
function rolesModal(){return `<div class="mhead"><h2 id="mtitle">Qui fait quoi</h2><button class="mx" type="button" data-act="modalx" aria-label="Fermer">${I.x}</button></div>${BODY.org()}`;}
function pilotView(title,inner){return `<div class="dhead"><h2 style="font-size:20px">${title} · Marketing</h2><button class="btn ghost sm" type="button" data-act="tab" data-v="parcours">Retour au parcours</button></div>${inner}`;}

const OSTATE={prep:["","À préparer"],ready:["info","Prête"],run:["info","En cours"],done:["warn","Réalisée déclarée"],closed:["ok","Clôturée"],suspended:["warn","Suspendue"],cancelled:["","Annulée"],blocked:["bad","Bloquée"]};
const PRSTATE={none:["","Non attendue"],todo:["","À fournir"],given:["info","Fournie, non vérifiée"],verified:["ok","Vérifiée"],contested:["bad","Contestée"],na:["","Indisponible"]};
const STSTATE={none:["","Non attendues"],todo:["","À collecter"],declared:["info","Disponibles, déclarées"],partial:["info","Partielles"],verified:["ok","Disponibles, vérifiées"],na:["","Indisponibles"]};
const proofOf=a=>["prep","run"].includes(a.status==="suspended"?a.prev:a.status)?"none":a.proof.state;
const statsOf=a=>["prep","run"].includes(a.status==="suspended"?a.prev:a.status)?"none":a.stats.state;
/* The status shown: computed, never stored (a planned activation is « Prête » once it has a person and a date). */
function dispStatus(a){
  if(["cancelled","suspended","closed"].includes(a.status)) return a.status;
  if(statusOf(a.id)==="blocked"||openBlockers().some(b=>b.step===a.id)) return "blocked";
  if(a.status==="prep") return a.resp&&a.due?"ready":"prep";
  return a.status;
}
function actNext(a){
  if(a.status==="closed"||a.status==="cancelled") return null;
  if(a.status==="suspended") return {r:a.resp||holder("project"),todo:"Reprendre l'activation"};
  if(!a.resp) return {r:holder("project"),todo:"Désigner un responsable"};
  if(!a.due) return {r:a.resp,todo:"Fixer l'échéance"};
  if(a.status==="prep") return {r:a.resp,todo:"Lancer l'activation"};
  if(a.status==="run") return {r:a.resp,todo:"Déclarer l'activation réalisée"};
  if(a.proof.derived&&["todo","given"].includes(a.proof.state)) return null;
  if(a.proof.state==="todo"||a.proof.state==="contested") return {r:a.resp,todo:a.proof.state==="contested"?"Fournir une autre preuve":"Fournir la preuve",skip:"proof"};
  if(a.proof.state==="given") return {r:holder("direction"),todo:"Vérifier la preuve"};
  if(a.stats.state==="todo") return {r:a.resp,todo:"Récupérer les statistiques",skip:"stats"};
  return {r:a.resp,todo:"Clôturer l'activation"};
}
/* Where a figure is read depends on the lever: a playlist is counted on a music service,
   a showcase at the door, never on a social network by default (MKT-ACT-002, ACT-001). */
const PLATFORMS={social:["TikTok","Instagram","YouTube","Facebook","Autre"],influence:["TikTok","Instagram","YouTube","Autre"],clip:["YouTube","TikTok","Instagram","Autre"],
  playlists:["Spotify","Apple Music","Deezer","YouTube Music","Amazon Music","Autre"],live:["Billetterie","Comptage à l'entrée","Liste d'invités","Autre"],rp:["Presse","Autre"],pub:["Meta","TikTok","YouTube","Google","Autre"]};
const platformsFor=a=>PLATFORMS[a.k]||["Autre"];
const CAMPAIGN_END=relDay(28); // the first month after the release, as the KPIs of the Brief
const STAT_SOURCES=["Déclaré en interne","Déclaré par le créateur","Déclaré par l'agence","Relevé sur la plateforme"];
function snapForm(a){
  return `<div class="card" style="background:var(--soft);padding:14px;gap:10px"><h3 style="font-size:15px">Nouveau relevé</h3>
   <div class="grid2"><div class="field"><label for="sV">${esc(a.unit[0].toUpperCase()+a.unit.slice(1))} *</label><input class="in" id="sV" inputmode="numeric" placeholder="Le chiffre relevé">${errOf("sV")}</div>
    <div class="field"><label for="sP">${a.k==="live"?"Mesure":"Plateforme"}</label><select class="in" id="sP">${platformsFor(a).map(x=>`<option>${esc(x)}</option>`).join("")}</select></div>
    <div class="field"><label for="sPer">Période *</label><input class="in" id="sPer" placeholder="Ex. : du 12/12 au 19/12">${errOf("sPer")}</div>
    <div class="field"><label for="sSrc">Source</label><select class="in" id="sSrc">${STAT_SOURCES.map(x=>`<option>${x}</option>`).join("")}</select></div></div>
   <div class="checks"><label><input type="checkbox" id="sPart">Relevé partiel (toutes les publications ne sont pas encore comptées)</label><label><input type="checkbox" id="aNA">Donnée indisponible : la plateforme ne la fournit pas</label></div>
   <div class="btnrow"><button class="btn sm" type="button" data-act="asnap" data-id="${a.id}">Enregistrer le relevé</button>${S.form==="snap:"+a.id?`<button class="btn ghost sm" type="button" data-act="form" data-v="">Annuler</button>`:""}</div></div>`;
}
function snapsList(a){
  const l=a.snaps||[];if(!l.length) return "";
  return `<div class="vers"><h3>Relevés de statistiques</h3><div class="rows">${[...l].reverse().map(x=>`<div class="irow"><span class="grow"><b class="num">${fmtN(x.value)} ${esc(a.unit)}</b>${x.partial?" · partiel":""}<br><span class="src">${esc(x.platform)} · ${esc(x.period)} · ${esc(x.source)} · saisi par ${esc(x.by)} le ${esc(x.at)}${x.verifiedBy?` · vérifié par ${esc(x.verifiedBy)}`:""}</span></span>
    <span class="btnrow">${pill(x.verifiedBy?"ok":"info",x.verifiedBy?"Vérifié":"Déclaré")}${!x.verifiedBy&&can("direction")?`<button class="btn ghost sm" type="button" data-act="averifsnap" data-id="${a.id}" data-n="${x.n}">Vérifier</button>`:""}</span></div>`).join("")}</div>
    <span class="src">Les relevés ne s'additionnent pas : chacun garde sa période et sa source.</span></div>`;
}
function actBody(a){
  const st=statusOf(a.id), n=actNext(a), mine=n&&n.r===me(), pr=proofOf(a), sa=statsOf(a), ds=dispStatus(a);
  const ready=a.resp&&a.due, editor=me()===a.resp||can("project"), open=!["closed","cancelled"].includes(a.status);
  let act="";
  if(mine&&st!=="blocked"){
    switch(n.todo){
      case "Reprendre l'activation":act=`<div class="callout warn">${I.warn}<span><b>Suspendue</b> par ${esc(a.suspended.by)} le ${esc(a.suspended.at)} : « ${esc(a.suspended.why)} »</span></div><div class="btnrow"><button class="btn" type="button" data-act="aresume" data-id="${a.id}">Reprendre l'activation</button></div>`;break;
      case "Désigner un responsable":act=`<div class="field"><label for="aResp">Responsable *</label><select class="in" id="aResp">${MEMBERS.map(k=>`<option value="${k}" ${k==="cp"?"selected":""}>${esc(P[k].name)} · ${esc(P[k].role)}</option>`).join("")}</select></div><div class="btnrow"><button class="btn" type="button" data-act="aresp" data-id="${a.id}">Désigner</button></div>`;break;
      case "Fixer l'échéance":act=`<div class="field"><label for="aDue">Échéance *</label><input class="in" type="date" id="aDue" value="${isoOf(relDay(a.j))}" min="${isoOf(new Date(...S.base))}" max="${isoOf(CAMPAIGN_END)}"><span class="src">Proposée : ${esc(jLabel(a.j))} dans le calendrier de lancement, ${fullDate(relDay(a.j))}</span>${errOf("aDue")}</div><div class="btnrow"><button class="btn" type="button" data-act="adue" data-id="${a.id}">Fixer l'échéance</button></div>`;break;
      case "Lancer l'activation":act=`<div class="btnrow"><button class="btn" type="button" data-act="alaunch" data-id="${a.id}">Lancer l'activation</button></div>`;break;
      case "Déclarer l'activation réalisée":act=`${agencyDoneForm(a)}${(m=>m&&!m.pub&&(a.kind==="Influence"||!m.sent)?`<p class="note">${a.kind==="Influence"?(m.n?"Aucun créateur n'a encore publié.":"Aucun créateur engagé pour l'instant : choisissez-les dans la campagne, plus bas."):"Aucun message n'est encore parti aux médias."}</p>`:"")(moduleProof(a))}${errOf("adone")}<span class="src">Réalisée déclarée ne signifie ni publiée, ni vérifiée, ni mesurée.</span><div class="btnrow"><button class="btn" type="button" data-act="adone" data-id="${a.id}">Déclarer réalisée</button></div>`;break;
      case "Fournir la preuve":case "Fournir une autre preuve":act=`<div class="field"><label for="aProof">Lien de la preuve *</label><input class="in" id="aProof" inputmode="url" placeholder="https://…">${errOf("aProof")}</div>
        <div class="checks"><label><input type="checkbox" id="aPNA" ${S.err.aPWhy?"checked":""}>Preuve indisponible (story expirée, publication retirée…)</label></div><div class="field"><label for="aPWhy">Motif si indisponible</label><input class="in" id="aPWhy">${errOf("aPWhy")}</div>
        <div class="btnrow"><button class="btn" type="button" data-act="aproof" data-id="${a.id}">Enregistrer la preuve</button><button class="btn ghost sm" type="button" data-act="aproofsample">Utiliser un lien d'exemple</button></div>`;break;
      case "Vérifier la preuve":act=`<p class="note">Preuve : <a href="#" data-act="nolink">${esc(a.proof.link)}</a> · fournie par ${esc(a.proof.by)} le ${esc(a.proof.at)}</p>${ta("aNote","Commentaire","Obligatoire pour contester")}<div class="btnrow"><button class="btn" type="button" data-act="averify" data-id="${a.id}" data-v="ok">Vérifier la preuve</button><button class="btn out" type="button" data-act="averify" data-id="${a.id}" data-v="contest">Contester</button></div>`;break;
      case "Récupérer les statistiques":act=snapForm(a);break;
      case "Clôturer l'activation":act=`${a.kind==="Influence"&&a.mode!=="Agence externe"?closeMatrix(a):""}${errOf("aclose")}<div class="btnrow"><button class="btn" type="button" data-act="aclose" data-id="${a.id}">Clôturer l'activation</button></div>`;break;
    }
  }
  // Around the next action: make it a task, or say it does not apply (never automatic).
  const tools=n&&n.r&&st!=="blocked"&&(mine||can("project"))&&a.status!=="suspended"?(S.form==="sobj:"+a.id?`<div class="card" style="background:var(--soft);padding:14px;gap:10px"><div class="field"><label for="soWhy">Pourquoi « ${esc(lcFirst(n.todo))} » est sans objet *</label><input class="in" id="soWhy" placeholder="Ex. : contenu publié en story, sans lien durable">${errOf("soWhy")}</div><div class="btnrow"><button class="btn sm" type="button" data-act="asobj" data-id="${a.id}">Marquer sans objet</button><button class="btn ghost sm" type="button" data-act="form" data-v="">Annuler</button></div></div>`
    :`<div class="btnrow"><span class="cap">Prochaine action · ${esc(nameOf(n.r))} :</span>${S.tasks.some(t=>t.step===a.id&&t.text===n.todo)?`<span class="src">tâche créée dans Travail</span>`:`<button class="btn ghost sm" type="button" data-act="atask" data-id="${a.id}">Créer une tâche</button>`}${n.skip?`<button class="btn ghost sm" type="button" data-act="form" data-v="sobj:${a.id}">Sans objet</button>`:""}</div>`):"";
  const extraSnap=a.status==="done"&&a.stats.state!=="todo"&&editor?(S.form==="snap:"+a.id?snapForm(a):`<div><button class="btn ghost sm" type="button" data-act="form" data-v="snap:${a.id}">Ajouter un relevé</button></div>`):"";
  const life=open&&editor&&a.status!=="suspended"?`<div class="btnrow" style="justify-content:flex-end"><button class="btn ghost sm" type="button" data-act="areason" data-id="${a.id}" data-v="suspend">Suspendre</button><button class="btn ghost sm" type="button" data-act="areason" data-id="${a.id}" data-v="cancel">Annuler l'activation</button></div>`:"";
  const infos=callFacts([["Type",`${esc(a.kind)}${a.mode?` · ${esc(a.mode)}`:""}`],["Levier",`${esc(a.lever)} <span class="src">· Brief de sortie V1 › Dispositif</span>`],["Responsable",a.resp?esc(nameOf(a.resp)):"À désigner"],["Échéance",a.due?fullDate(fromIso(a.due)):"À fixer"],
     ["Preuve",`${pill(PRSTATE[pr][0],PRSTATE[pr][1])} ${a.proof.derived?esc(a.proof.text):a.proof.state==="na"?`Indisponible · « ${esc(a.proof.why||"")} »`:a.proof.state==="none"&&a.proof.why?`Non attendue · « ${esc(a.proof.why)} »`:a.proof.link?`<a href="#" data-act="nolink">${esc(a.proof.link)}</a>${a.proof.note?` <span class="src">· contestée : « ${esc(a.proof.note)} »</span>`:""}`:""}`],
     ["Statistiques",`${pill(STSTATE[sa][0],STSTATE[sa][1])} ${a.stats.state==="na"?"Donnée indisponible":a.stats.state==="none"&&a.stats.why?`Non attendues · « ${esc(a.stats.why)} »`:a.stats.value!=null?`${fmtN(a.stats.value)} ${esc(a.unit)} <span class="src">· dernier relevé</span>`:""}`]]);
  const mods=actorsOf(a.id).filter(x=>!n||x.todo!==n.todo).sort((x,y)=>(y.r===me())-(x.r===me()));
  const modLines=mods.map(x=>x.r===me()?`<div class="wr">${av(x.r,true)}<span class="grow"><b>À vous</b> · ${esc(lcFirst(x.todo))} <span class="src">· plus bas</span></span></div>`:waitRow(x.r,x.todo)).join("");
  const own=act||(n&&n.r&&n.r!==me()&&st!=="blocked"?waitRow(n.r,n.todo):"");
  const now=mods.some(x=>x.r===me())&&!act?modLines+own:own+modLines;
  return `${a.status==="cancelled"?`<div class="callout">${I.stop}<span><b>Annulée</b> par ${esc(a.cancelled.by)} le ${esc(a.cancelled.at)} : « ${esc(a.cancelled.why)} ». Elle reste dans le bilan, avec ce motif.</span></div>`:""}
   ${a.exception?`<div class="callout warn">${I.warn}<span><b>Réalisée avec une réserve</b>, déclarée par ${esc(a.exception.by)} le ${esc(a.exception.at)} : « ${esc(a.exception.why)} ». Restait : ${esc(a.exception.items.join(" · "))}. À régler par ${esc(nameOf(a.exception.r))} avant le ${esc(fullDate(fromIso(a.exception.due)))} ; elle entre dans le bilan.</span></div>`:""}
   ${a.status==="prep"&&st!=="blocked"?`<p class="note">Pour lancer : ${ready?"prête : responsable, échéance, rien de bloquant.":"il manque "+[!a.resp?"un responsable":"",!a.due?"une échéance":""].filter(Boolean).join(" et ")+"."}</p>`:""}
   ${now||tools||(a.proof.derived&&a.status==="done")?`<div class="nowbox"><h3>Maintenant</h3>${a.proof.derived&&a.status==="done"&&a.proof.state!=="verified"?derivedProofBox(a):""}${now||(a.proof.derived&&a.status==="done"&&a.proof.state!=="verified"?"":`<p class="note">Rien à faire de votre côté pour l'instant.</p>`)}${tools}</div>`:""}
   ${influenceSection(a)}${rpSection(a)}${snapsList(a)}${extraSnap}
   <details class="infos"><summary>Informations</summary>${infos}</details>${me()==="cp"||me()==="dg"||me()===a.resp?costsBox(a,editor&&open):""}${life}`;
}
function costsBox(a,ed){
  const l=costsOf(a),f=S.form==="cost:"+a.id;if(!l.length&&!ed) return "";
  return `<details class="infos"${f||S.err.cAmount?" open":""}><summary>Dépenses · ${euro(sumCosts(l,["engaged","invoiced","paid"]))} engagés</summary><div class="vers">
   ${l.length?`<div class="rows">${l.map((c,i)=>`<div class="irow"><span class="grow"><b>${esc(c.label)}</b> · <span class="num">${euro(c.amount)}</span><br><span class="src">${esc(c.src)}</span></span><span class="btnrow">${pill(c.state==="paid"?"ok":c.state==="invoiced"?"info":"",COST_ST[c.state])}${ed&&!c.auto&&c.state!=="paid"?`<button class="btn ghost sm" type="button" data-act="cstate" data-id="${a.id}" data-i="${i}">${c.state==="engaged"?"Facture reçue":"Payé"}</button>`:""}</span></div>`).join("")}</div>`:`<p class="note">Aucune dépense pour l'instant.</p>`}
   ${ed?(f?`<div class="card" style="background:var(--soft);padding:14px;gap:10px"><div class="grid3"><div class="field"><label for="cLabel">Dépense *</label><input class="in" id="cLabel" placeholder="Ex. : location de la salle">${errOf("cLabel")}</div><div class="field"><label for="cAmount">Montant HT *</label><input class="in" id="cAmount" inputmode="numeric" placeholder="Ex. : 1 200">${errOf("cAmount")}</div><div class="field"><label for="cState">Où on en est</label><select class="in" id="cState">${Object.entries(COST_ST).map(([k,v])=>`<option value="${k}">${v}</option>`).join("")}</select></div></div><div class="btnrow"><button class="btn sm" type="button" data-act="cadd" data-id="${a.id}">Ajouter</button><button class="btn ghost sm" type="button" data-act="form" data-v="">Annuler</button></div></div>`
     :`<div><button class="btn ghost sm" type="button" data-act="form" data-v="cost:${a.id}">Ajouter une dépense</button></div>`):""}</div></details>`;
}
const ACT_VIEWS=[["all","Toutes",()=>true],["prep","À lancer",a=>["prep","ready"].includes(dispStatus(a))],["run","En cours",a=>a.status==="run"],["check","À vérifier",a=>a.proof.state==="given"||(a.snaps||[]).some(x=>!x.verifiedBy)&&a.status!=="closed"],
  ["blocked","Bloquées",a=>["blocked","suspended"].includes(dispStatus(a))],["measure","À mesurer",a=>a.status==="done"&&a.stats.state==="todo"],
  ["bilan","Prêtes pour bilan",a=>a.status==="closed"||(a.status==="done"&&["verified","na","none"].includes(a.proof.state)&&a.stats.state!=="todo")],["closed","Clôturées",a=>a.status==="closed"],["cancelled","Annulées",a=>a.status==="cancelled"]];
const ACT_BUDGET={influence:3500,rp:1200,clip:18000};
function actBoard(){
  if(!S.acts.length) return "";
  const c=f=>S.acts.filter(f).length, view=ACT_VIEWS.find(v=>v[0]===(S.actView||"all")), seeB=me()==="cp"||me()==="dg";
  const list=S.acts.filter(view[2]);
  const cols=seeB?"minmax(0,2fr) minmax(0,1.1fr) minmax(0,1fr) minmax(0,1fr) minmax(0,1fr) minmax(0,1.1fr) minmax(0,1fr) minmax(0,1.6fr) minmax(0,.9fr)":"minmax(0,2fr) minmax(0,1.1fr) minmax(0,1fr) minmax(0,1fr) minmax(0,1fr) minmax(0,1.1fr) minmax(0,1fr) minmax(0,1.6fr)";
  const blockOf=a=>{const b=openBlockers().find(x=>x.step===a.id);if(b) return b.text;if(statusOf(a.id)==="blocked") return "Attend : Clip officiel livré";if(a.status==="suspended") return "Suspendue : "+a.suspended.why;return "";};
  return `<section class="card" aria-label="Activations"><div class="dhead"><h2 style="font-size:18px">Activations</h2><span class="cap">Calculé à l'instant · règles de calcul v1</span></div>
   ${statTiles([["À lancer",c(a=>["prep","ready"].includes(dispStatus(a))),"Ni lancées ni bloquées"],["En cours",c(a=>a.status==="run"),"Lancées, pas encore déclarées réalisées"],["À vérifier",c(a=>a.proof.state==="given"),"Preuve fournie, pas encore vérifiée"],["À mesurer",c(a=>a.status==="done"&&a.stats.state==="todo"),"Réalisées, aucun relevé"],["Clôturées",c(a=>a.status==="closed"),"Clôturées par leur responsable ; les annulées sont à part"]])}
   <div class="strip" role="group" aria-label="Vues">${ACT_VIEWS.map(([k,l,f])=>`<button class="chipbtn" type="button" data-act="actview" data-v="${k}" aria-pressed="${view[0]===k}" style="${view[0]===k?"border-color:var(--text)":""}">${l} <span class="t3">${S.acts.filter(f).length}</span></button>`).join("")}</div>
   <div class="table"><div class="tr h" style="grid-template-columns:${cols}"><span>Activation</span><span>Type · mode</span><span>Responsable</span><span>Statut</span><span>Preuve</span><span>Statistiques</span><span>Échéance</span><span>Prochaine action</span>${seeB?"<span>Budget</span>":""}</div>
    ${list.length?list.map(a=>{const n=actNext(a),b=blockOf(a);return `<div class="tr link" style="grid-template-columns:${cols}" data-act="go" data-step="${a.id}"><span><b>${esc(a.title)}</b>${b?`<br><span class="miss" style="font-size:13px">${esc(b)}</span>`:""}</span><span class="cap">${esc(a.kind)}${a.mode?" · "+esc(a.mode):""}</span><span>${a.resp?esc(nameOf(a.resp)):'<span class="t3">À désigner</span>'}</span>
      <span>${pill(OSTATE[dispStatus(a)][0],OSTATE[dispStatus(a)][1])}</span><span>${pill(PRSTATE[proofOf(a)][0],PRSTATE[proofOf(a)][1])}</span><span>${pill(STSTATE[statsOf(a)][0],STSTATE[statsOf(a)][1])}</span><span class="cap">${a.due?fullDate(fromIso(a.due)):"—"}</span><span class="cap">${n?esc(n.todo)+(n.r?" · "+esc(nameOf(n.r)):""):"—"}</span>${seeB?`<span class="cap num">${ACT_BUDGET[a.k]?"Estimé "+euro(ACT_BUDGET[a.k]):"—"}</span>`:""}</div>`;}).join(""):`<div class="tr"><span class="note">Aucune activation dans cette vue.</span></div>`}</div></section>`;
}
function reasonModal(){
  const a=actById(S.modal.id), cancel=S.modal.v==="cancel";
  return `<div class="mhead"><h2 id="mtitle">${cancel?"Annuler":"Suspendre"} ${esc(a.title)}</h2><button class="mx" type="button" data-act="modalx" aria-label="Fermer">${I.x}</button></div>
   <p class="note">${cancel?"L'activation reste dans le tableau et dans le bilan, avec ce motif. Ses preuves et ses relevés sont gardés.":"Elle s'arrête sans être perdue : elle reprend là où elle en était."}</p>
   ${ta("arWhy","Motif",cancel?"Ex. : le showcase n'a pas trouvé de salle":"Ex. : on attend la réponse du label partenaire",true)}
   <div class="btnrow"><button class="btn" type="button" data-act="areasonok">${cancel?"Annuler l'activation":"Suspendre"}</button><button class="btn ghost" type="button" data-act="modalx">Retour</button></div>`;
}

/* ======================================================================
   Influence en gestion interne (ticket « Activations / Influence ») :
   une fiche Collaboration par créateur, rien d'engageant sans un humain.
   ====================================================================== */
const INFLUENCERS=[
  {k:"lea",handle:"@leamoreau",email:"lea@leamoreau.fr",platform:"TikTok",followers:328000,seen:"relevé le 02/10/2026",history:"A collaboré sur le clip « Lune » (2025) · 210 000 vues, déclaré par la créatrice",flag:["ok","Déjà collaboré"]},
  {k:"sami",handle:"@samitee",email:"samitee.pro@gmail.com",platform:"TikTok",followers:112000,seen:"relevé le 28/09/2026",history:"Proposé en mai 2025, sans réponse",flag:["warn","Déjà contacté"]},
  {k:"inesv",handle:"@inesvale",email:"ines.vale@gmail.com",platform:"Instagram",followers:64000,seen:"relevé en mars 2025",history:"Donnée d'audience ancienne : à revérifier",flag:["warn","Donnée ancienne"]},
  {k:"noa",handle:"@noabessa",email:"noa.bessa@gmail.com",platform:"TikTok",followers:47000,seen:"relevé le 30/09/2026",history:"Aucune collaboration passée",flag:null}
];
const inflOf=k=>INFLUENCERS.find(x=>x.k===k);
const STAGES=[["candidate","Candidate"],["concept","Concept à valider"],["validated","Validée en interne"],["nego","Négociation"],["agreement","Accord à obtenir"],["agreed","Accordée"],["content","En validation"],["ready","Prête à publier"],["published","Publiée déclarée"],["verified","Publiée vérifiée"],["admin","Administration"],["closed","Clôturée"],["refused","Refusée"],["noanswer","Sans réponse"],["abandoned","Abandonnée"]];
const STAGE=Object.fromEntries(STAGES);
const stageTone=s=>["closed","verified"].includes(s)?"ok":["refused","noanswer","abandoned"].includes(s)?"":["concept","content","published","agreement"].includes(s)?"info":"warn";
const PAY={none:"Non demandé",invoice:"Pièce attendue",tovalidate:"À valider",ok:"Bon à payer",paid:"Payé déclaré",paidv:"Payé vérifié"};
const campOf=a=>a.camp||(a.camp={concept:"Une nuit blanche à Paris, entre deux lumières : chaque créateur raconte sa nuit sur le refrain de « Néons ».",collabs:[]});
const collabsOf=a=>(a.camp?a.camp.collabs:[]);
/* Nothing happens with a creator before the activation is launched (a person, a deadline,
   then « Lancer »), and nothing after it is closed, cancelled or suspended: picking creators
   stays possible (MKT-INF-001). */
const collabOpen=a=>["run","done"].includes(a.status);
/* Who does the next gesture of a collaboration, and what (the creator acts through her private link). */
function collabNext(a,c){
  const R=a.resp||holder("project"), V=holder("direction");
  if(!collabOpen(a)) return null;
  switch(c.stage){
    case "candidate":return {r:R,todo:"Écrire le concept personnalisé",do:"cconcept"};
    case "concept":return {r:V,todo:"Valider le concept",do:"cconceptdec"};
    case "validated":return {r:R,todo:"Envoyer le brief et la proposition",do:"cbrief"};
    case "nego":{const last=lastOf(c.offers);return last&&last.by==="Créateur"?{r:R,todo:"Répondre à la contre-proposition",do:"coffer"}:{r:R,todo:"Accepter les conditions ou attendre la réponse",do:"coffer"};}
    case "agreement":return c.agreement&&c.agreement.sent?{r:c.k,todo:"Donner son accord",ext:true}:{r:R,todo:"Envoyer l'accord",do:"csend"};
    case "agreed":return {r:c.k,todo:"Déposer le contenu",ext:true};
    case "content":return {r:holder("creativeInt"),todo:"Valider le contenu",do:"ccontentdec"};
    case "ready":return {r:c.k,todo:"Déclarer la publication",ext:true};
    case "published":return {r:V,todo:"Vérifier la publication",do:"cpubverify"};
    case "verified":return {r:R,todo:"Demander la facture",do:"cpay"};
    case "admin":return c.pay==="invoice"?{r:c.k,todo:"Déposer la facture",ext:true}:c.pay==="tovalidate"?{r:V,todo:"Valider le bon à payer",do:"cpay"}:c.pay==="ok"?{r:R,todo:"Déclarer le paiement",do:"cpay"}:c.pay==="paid"?{r:V,todo:"Vérifier le paiement",do:"cpay"}:{r:R,todo:"Clôturer la collaboration",do:"cclose"};
  }
  return null;
}
const offerLine=o=>`${euro(o.amount)} · ${o.deliverables} · organique : ${o.organic} · publicité : ${o.ads}`;
function collabCard(a,c){
  const inf=inflOf(c.k), n=collabNext(a,c), mine=n&&n.r===me()&&!n.ext, f=S.form||"";
  let act="";
  if(mine){
    if(n.do==="cconcept") act=`<div class="vers"><h3>Concept pour ${esc(nameOf(c.k))}</h3>${ta(`cc-a-${c.k}`,"Angle","Ce qu'elle raconte",true,c.concept?c.concept.angle:"Sa nuit blanche à Paris, du coucher au lever du jour")}
      <div class="grid2"><div class="field"><label for="cc-f-${c.k}">Format</label><input class="in" id="cc-f-${c.k}" value="${esc(c.concept?c.concept.format:"1 vidéo TikTok, 30 s, sur le refrain")}"></div><div class="field"><label for="cc-m-${c.k}">Message clé</label><input class="in" id="cc-m-${c.k}" value="${esc(c.concept?c.concept.message:"« Néons » sort le Sam. 05/12")}"></div></div>
      <span class="src">Décliné du concept de campagne ; il ne change pas celui des autres créateurs.</span><div class="btnrow"><button class="btn sm" type="button" data-act="cconcept" data-id="${a.id}" data-k="${c.k}">Soumettre à ${esc(nameOf(holder("direction")))}</button></div></div>`;
    else if(n.do==="cconceptdec") act=`<div class="vers"><h3>Votre décision sur le concept</h3>${ta(`ccn-${c.k}`,"Commentaire","Obligatoire pour demander des corrections")}<div class="btnrow"><button class="btn sm" type="button" data-act="cconceptdec" data-id="${a.id}" data-k="${c.k}" data-v="ok">Valider le concept</button><button class="btn out sm" type="button" data-act="cconceptdec" data-id="${a.id}" data-k="${c.k}" data-v="changes">Demander des corrections</button></div></div>`;
    else if(n.do==="cbrief") act=`<div class="vers"><h3>Brief et proposition</h3>
      <div class="grid2"><div class="field"><label for="co-a-${c.k}">Rémunération proposée *</label><input class="in" id="co-a-${c.k}" inputmode="numeric" value="${Math.round(inf.followers/400/50)*50||300}">${errOf("co-a-"+c.k)}</div><div class="field"><label for="co-d-${c.k}">Livrables</label><input class="in" id="co-d-${c.k}" value="${esc(c.concept.format)}"></div>
       <div class="field"><label for="co-o-${c.k}">Droits organiques</label><input class="in" id="co-o-${c.k}" value="Sur son compte ${esc(inf.platform)} · republication par Mona Lys"></div><div class="field"><label for="co-p-${c.k}">Droits publicitaires</label><select class="in" id="co-p-${c.k}"><option>Non demandés</option><option>Spark Ads · 30 jours · inclus</option><option>Spark Ads · 30 jours · +200 € HT</option></select></div></div>
      <div class="field"><label for="co-msg-${c.k}">Message</label><textarea class="in" id="co-msg-${c.k}" rows="4">Bonjour ${esc(nameOf(c.k).split(" ")[0])}, Mona Lys sort « Néons » le Sam. 05/12. On aimerait que tu racontes ta nuit blanche à Paris sur le refrain : ${esc(c.concept.angle.toLowerCase())}. Tout est dans le brief joint ; dis-nous si la proposition te va.</textarea><span class="src">Repris du concept validé. PDS OS ne l'envoie pas : copiez-le, puis indiquez qu'il est parti.</span></div>
      <div class="grid2"><div class="field"><label for="co-ch-${c.k}">Canal</label><select class="in" id="co-ch-${c.k}"><option>E-mail</option><option>Message TikTok</option><option>WhatsApp</option></select></div></div>
      <div class="btnrow"><button class="btn sm" type="button" data-act="cbrief" data-id="${a.id}" data-k="${c.k}">Marquer le brief comme envoyé</button><button class="btn ghost sm" type="button" data-act="copytext" data-from="co-msg-${c.k}" data-v="Message copié.">Copier le message</button></div></div>`;
    else if(n.do==="coffer"){const last=lastOf(c.offers);act=`<div class="btnrow">${last&&last.by==="Créateur"?`<button class="btn sm" type="button" data-act="caccept" data-id="${a.id}" data-k="${c.k}">Accepter ${euro(last.amount)}</button>`:""}<button class="btn out sm" type="button" data-act="form" data-v="cof:${c.k}">Faire une nouvelle proposition</button>${last&&last.by==="PDS"?`<button class="protobtn" type="button" data-act="ccounter" data-id="${a.id}" data-k="${c.k}">Proto : la créatrice répond</button>`:""}<button class="btn ghost sm" type="button" data-act="cexit" data-id="${a.id}" data-k="${c.k}" data-v="noanswer">Sans réponse</button></div>
      ${f==="cof:"+c.k?`<div class="card" style="background:var(--soft);padding:14px;gap:10px"><div class="grid2"><div class="field"><label for="cn-a-${c.k}">Montant *</label><input class="in" id="cn-a-${c.k}" inputmode="numeric">${errOf("cn-a-"+c.k)}</div><div class="field"><label for="cn-p-${c.k}">Droits publicitaires</label><select class="in" id="cn-p-${c.k}"><option>Non demandés</option><option>Spark Ads · 30 jours · inclus</option></select></div></div><div class="btnrow"><button class="btn sm" type="button" data-act="cnewoffer" data-id="${a.id}" data-k="${c.k}">Envoyer la proposition</button><button class="btn ghost sm" type="button" data-act="form" data-v="">Annuler</button></div></div>`:""}`;}
    else if(n.do==="ccontentdec"){const v=lastOf(c.versions);act=`<div class="vers"><h3>Votre décision sur la V${v.n}</h3><div class="grid2"><div class="field"><label for="cv-tc-${c.k}">Timecode</label><input class="in" id="cv-tc-${c.k}" placeholder="Ex. : 0:12"></div><div class="field"><label for="cv-c-${c.k}">Catégorie</label><select class="in" id="cv-c-${c.k}"><option>Montage</option><option>Audio</option><option>Sous-titres</option><option>Mentions</option><option>Autre</option></select></div></div>${ta(`cv-n-${c.k}`,"Retour","Obligatoire pour demander des corrections")}
      <div class="btnrow"><button class="btn sm" type="button" data-act="ccontentdec" data-id="${a.id}" data-k="${c.k}" data-v="ok">Valider la V${v.n}</button><button class="btn out sm" type="button" data-act="ccontentdec" data-id="${a.id}" data-k="${c.k}" data-v="changes">Demander des corrections</button></div></div>`;}
    else if(n.do==="cpubverify") act=`<p class="note">Publication déclarée : <a href="#" data-act="nolink">${esc(c.pub.url)}</a> le ${esc(c.pub.at)}.</p><div class="btnrow"><button class="btn sm" type="button" data-act="cpubverify" data-id="${a.id}" data-k="${c.k}">Vérifier la publication</button></div>`;
    else if(n.do==="cpay") act=`<div class="btnrow"><button class="btn sm" type="button" data-act="cpay" data-id="${a.id}" data-k="${c.k}">${esc(n.todo)}</button></div>${c.pay==="tovalidate"?`<span class="src">Accord « Bon pour accord » du ${esc(c.agreement.at)}, contenu publié et vérifié : le bon à payer ne déclenche aucun virement.</span>`:""}`;
    else if(n.do==="cclose") act=`<div class="btnrow"><button class="btn sm" type="button" data-act="cclose" data-id="${a.id}" data-k="${c.k}">Clôturer la collaboration</button></div>`;
    else if(n.do==="csend") act=sendAgreementCard(a,c);
  }
  const sent=c.agreement&&c.agreement.sent, accepted=c.agreement&&c.agreement.status==="accepted";
  const link=c.token&&sent?`<span class="linkbox"><code>https://pds-os.app/i/${c.token}</code><button class="btn ghost sm" type="button" data-act="copytext" data-v="Lien copié.">Copier le lien</button></span>`:"";
  const sentLine=sent?`Envoyé ${sent.ch==="E-mail"?`par e-mail à ${esc(sent.to)} par PDS OS`:`par ${esc(sent.ch.toLowerCase())} (envoi déclaré)`}, par ${esc(sent.by)} le ${esc(sent.at)} · lien créé le ${esc(c.agreement.createdAt)}${c.revoked&&c.revoked.length?` · ${c.revoked.length} lien${c.revoked.length>1?"s":""} révoqué${c.revoked.length>1?"s":""}`:""}`:"";
  const body=`<div class="eyebrow">${inf.flag?pill(inf.flag[0],inf.flag[1]):""}<span class="src">${esc(inf.platform)} · ${fmtN(inf.followers)} abonnés · ${esc(inf.seen)} · ${esc(inf.history)}</span></div>
   ${c.concept?callFacts([["Concept",`${esc(c.concept.angle)} <span class="src">· ${esc(c.concept.format)} · ${c.conceptOk?`validé par ${esc(c.conceptOk)}`:"à valider"}</span>`]]):""}
   ${c.offers.length?`<div class="vers"><h3>Négociation</h3><ul class="hist">${c.offers.map((o,i)=>`<li><span class="${c.accepted===i?"okc":"noc"}">${c.accepted===i?"✓":"•"}</span><span><b>${esc(o.by==="PDS"?"PDS":nameOf(c.k))}</b> · ${esc(offerLine(o))} <span class="src">· ${esc(o.at)}${c.accepted===i?" · conditions acceptées":""}</span></span></li>`).join("")}</ul></div>`:""}
   ${c.token&&(sent||accepted||c.agreement.status==="changes")?`<div class="vers"><h3>Accord express</h3><span class="src">${accepted?`« Bon pour accord » donné le ${esc(c.agreement.at)} sur la version exacte des conditions.`:c.agreement&&c.agreement.status==="changes"?`Modification demandée : « ${esc(c.agreement.note)} »`:"Lien privé envoyé à la créatrice, sans compte : elle voit les conditions et répond."}${sentLine?`<br>${sentLine}`:""}</span>${link}${sent&&!accepted&&(me()===(a.resp||holder("project"))||can("project"))?`<div><button class="btn ghost sm" type="button" data-act="crevoke" data-id="${a.id}" data-k="${c.k}">Révoquer le lien et en préparer un autre</button></div>`:""}
     <div class="grid2"><div class="stat"><span class="k">Droits organiques</span><b style="font-size:15px">${esc(c.offers[c.accepted].organic)}</b></div><div class="stat"><span class="k">Droits publicitaires</span><b style="font-size:15px">${esc(c.offers[c.accepted].ads)}</b><span class="src">Jamais déduits des droits organiques</span></div></div></div>`:""}
   ${c.versions.length?`<div class="vers"><h3>Contenus</h3><div class="rows">${[...c.versions].reverse().map(v=>`<div class="irow"><span class="grow"><b>V${v.n}</b> · <a href="#" data-act="nolink">${esc(v.url)}</a><br><span class="src">Déposée le ${esc(v.at)}${v.notes.length?" · "+v.notes.map(x=>`${x.tc?x.tc+" · ":""}${x.cat} : « ${x.text} »`).map(esc).join(" · "):""}</span></span>${pill(v.status==="ok"?"ok":v.status==="changes"?"warn":"info",v.status==="ok"?"Validée":v.status==="changes"?"Corrections demandées":"En validation")}</div>`).join("")}</div></div>`:""}
   ${c.pub?callFacts([["Publication",`<a href="#" data-act="nolink">${esc(c.pub.url)}</a> · déclarée le ${esc(c.pub.at)}${c.pub.verifiedBy?` · vérifiée par ${esc(c.pub.verifiedBy)}`:" · non vérifiée"}`]]):""}
   ${c.pay&&c.pay!=="none"?callFacts([["Paiement administratif",`${esc(PAY[c.pay])} · ${euro(c.offers[c.accepted].amount)}${c.invoice?` · ${esc(fileLine(c.invoice))}`:""} <span class="src">· aucun virement par PDS OS</span>`]]):""}
   ${act||(n&&n.r&&!["closed","refused","noanswer","abandoned"].includes(c.stage)?waitRow(n.r,n.todo+(n.ext?" (lien privé)":""))+(n.ext&&isMember(me())?`<div><button class="protobtn" type="button" data-act="cproto" data-id="${a.id}" data-k="${c.k}">Proto : ${esc(nameOf(c.k))} ${esc(n.todo.toLowerCase())}</button></div>`:""):"")}
   ${c.log.length?`<ul class="hist">${c.log.map(x=>`<li><span class="noc">•</span><span>${esc(x)}</span></li>`).join("")}</ul>`:""}`;
  return versionCard("col"+a.id+c.k,!!(n&&((n.r===me()&&!n.ext)||(n.ext&&isMember(me())))),`${esc(nameOf(c.k))} · ${esc(inf.handle)}`,pill(stageTone(c.stage),STAGE[c.stage]),esc(inf.platform),body);
}
function influenceSection(a){
  if(a.kind!=="Influence") return "";
  if(a.mode==="Agence externe") return typeof agencySection==="function"?agencySection(a):"";
  const camp=campOf(a), ed=me()===a.resp||can("project"), picking=S.form==="pick:"+a.id;
  const inCamp=k=>camp.collabs.some(c=>c.k===k);
  const pick=picking?`<div class="card" style="background:var(--soft);padding:14px;gap:10px"><h3 style="font-size:15px">Réseau › Influenceurs</h3><div class="rows">${INFLUENCERS.map(x=>`<div class="irow"><span class="grow"><b>${esc(nameOf(x.k))}</b> · ${esc(x.handle)} ${x.flag?pill(x.flag[0],x.flag[1]):""}<br><span class="src">${esc(x.platform)} · ${fmtN(x.followers)} abonnés · ${esc(x.seen)} · ${esc(x.history)}</span></span>${inCamp(x.k)?`<span class="src">Déjà dans la campagne</span>`:`<button class="btn out sm" type="button" data-act="cpick" data-id="${a.id}" data-k="${x.k}">Ajouter</button>`}</div>`).join("")}</div>
    <span class="src">Les résultats passés ne garantissent aucun résultat futur.</span><div><button class="btn ghost sm" type="button" data-act="form" data-v="">Fermer</button></div></div>`:"";
  const c=f=>camp.collabs.filter(f).length;
  return `<div class="vers mod"><div class="dhead"><h3>Campagne d'influence · gestion interne</h3>${ed&&!picking&&!["closed","cancelled"].includes(a.status)?`<button class="btn out sm" type="button" data-act="form" data-v="pick:${a.id}">Choisir des créateurs</button>`:""}</div>
   ${callFacts([["Concept de campagne",`${esc(camp.concept)} <span class="src">· Brief de sortie V1 › Narratif</span>`],["Créateurs",camp.collabs.length?`${camp.collabs.length} · ${c(x=>x.stage==="verified"||x.stage==="admin"||x.stage==="closed")} publiés et vérifiés · ${c(x=>["refused","noanswer","abandoned"].includes(x.stage))} sortis`:"Aucun pour l'instant"]])}
   ${!collabOpen(a)&&camp.collabs.length?`<div class="callout info">${I.lock}<span>${["closed","cancelled"].includes(a.status)?`Activation ${a.status==="closed"?"clôturée":"annulée"} : les collaborations sont figées telles quelles.`:a.status==="suspended"?"Activation suspendue : rien n'avance avec les créateurs jusqu'à sa reprise.":`Les échanges avec les créateurs commencent quand l'activation est lancée${!a.resp||!a.due?` : il manque ${[!a.resp?"un responsable":"",!a.due?"une échéance":""].filter(Boolean).join(" et ")}`:""}. Vous pouvez déjà les choisir.`}</span></div>`:""}
   ${pick}${camp.collabs.map(x=>collabCard(a,x)).join("")}</div>`;
}
/* The agreement as the creator will read it, and what the project lead sends (MKT-INF-002). */
const agreementFacts=c=>{const o=c.offers[c.accepted];return callFacts([["Ce qu'on vous demande",esc(o.deliverables)],["Rémunération",euro(o.amount)],["Droits organiques",esc(o.organic)],["Droits publicitaires",esc(o.ads)],["Concept",esc(c.concept.angle)]]);};
function sendAgreementCard(a,c){
  const o=c.offers[c.accepted],inf=inflOf(c.k),prev=S.form==="aprev:"+c.k,url=`https://pds-os.app/i/${c.token}`,first=nameOf(c.k).split(" ")[0];
  const msg=`Bonjour ${first}, voici l'accord pour « Néons » : ${o.deliverables}, ${euro(o.amount)}. Tu peux le relire et donner ton accord ici, sans compte : ${url}`;
  return `<div class="vers"><h3>Envoyer l'accord à ${esc(nameOf(c.k))}</h3>
   ${callFacts([["Destinataire",`${esc(nameOf(c.k))} · ${esc(inf.handle)} · ${esc(inf.email)} <span class="src">· Réseau</span>`],["Conditions",esc(offerLine(o))],["Lien privé",`<span class="linkbox"><code>${url}</code></span> <span class="src">créé le ${esc(c.agreement.createdAt)} · pas encore envoyé</span>`]])}
   <div class="grid2"><div class="field"><label for="ag-ch-${c.k}">Canal *</label><select class="in" id="ag-ch-${c.k}"><option>E-mail</option><option>Message TikTok</option><option>WhatsApp</option></select><span class="src">Par e-mail, PDS OS l'envoie. Sur un autre canal, copiez le message puis dites qu'il est parti.</span></div></div>
   <div class="field"><label for="ag-msg-${c.k}">Message</label><textarea class="in" id="ag-msg-${c.k}" rows="3">${esc(msg)}</textarea></div>
   ${prev?`<div class="card" style="background:var(--soft);padding:14px;gap:10px"><span class="cap">Ce que ${esc(first)} verra sur sa page</span><h3>Votre accord</h3><p class="note">Version des conditions du ${esc(o.at)}. Ce n'est pas une signature électronique : c'est votre accord sur ces conditions, horodaté.</p>${agreementFacts(c)}<div class="btnrow"><button class="btn sm" type="button" disabled>Bon pour accord</button><button class="btn out sm" type="button" disabled>Demander une modification</button></div></div>`:""}
   <div class="btnrow"><button class="btn sm" type="button" data-act="csend" data-id="${a.id}" data-k="${c.k}">Envoyer l'accord</button><button class="btn ghost sm" type="button" data-act="form" data-v="${prev?"":"aprev:"+c.k}">${prev?"Fermer l'aperçu":"Voir sa page"}</button><button class="btn ghost sm" type="button" data-act="copytext" data-from="ag-msg-${c.k}" data-v="Message copié.">Copier le message</button><button class="btn ghost sm" type="button" data-act="crevoke" data-id="${a.id}" data-k="${c.k}">Révoquer le lien</button></div></div>`;
}
/* Closing an influence campaign: every creator, and what became of her (MKT-INF-001). */
function closeMatrix(a){
  const cs=collabsOf(a);if(!cs.length) return "";
  const st=c=>c.stage==="closed"?["ok","Clôturée"]:OUT.includes(c.stage)?["",STAGE[c.stage]]:c.accepted==null?["","Non engagée · figée à la clôture"]:["bad","À terminer · "+STAGE[c.stage]];
  return `<div class="vers"><h3>Chaque créateur</h3><div class="rows">${cs.map(c=>`<div class="irow"><span class="grow"><b>${esc(nameOf(c.k))}</b> <span class="src">· ${esc(inflOf(c.k).handle)}</span></span>${pill(...st(c))}</div>`).join("")}</div><span class="src">Une collaboration engagée se clôture ou se termine (refusée, sans réponse, abandonnée) avant l'activation.</span></div>`;
}
/* The creator's private page (« Accord express ») : only her collaboration. */
function creatorPortal(k){
  const pairs=S.acts.flatMap(a=>collabsOf(a).filter(c=>c.k===k).map(c=>[a,c])), inf=inflOf(k);
  const body=pairs.map(([a,c])=>{
    let part="";
    if(!collabOpen(a)) part=`<h2>${a.status==="suspended"?"Campagne en pause":"Campagne terminée"}</h2><p class="note">Rien à faire pour vous pour l'instant.</p>`;
    else if(c.stage==="agreement"&&c.agreement&&c.agreement.sent){const o=c.offers[c.accepted];part=`<h2>Votre accord</h2><p class="note">Version des conditions du ${esc(o.at)}. Ce n'est pas une signature électronique : c'est votre accord sur ces conditions, horodaté.</p>
      ${agreementFacts(c)}
      ${S.form==="chg:"+c.k?`${ta("agrNote","Ce que vous voulez changer","",true)}<div class="btnrow"><button class="btn" type="button" data-act="cagree" data-id="${a.id}" data-k="${k}" data-v="changes">Envoyer la demande</button><button class="btn ghost" type="button" data-act="form" data-v="">Annuler</button></div>`
       :`<div class="btnrow"><button class="btn" type="button" data-act="cagree" data-id="${a.id}" data-k="${k}" data-v="ok" style="height:48px;padding:0 28px">Bon pour accord</button><button class="btn out" type="button" data-act="form" data-v="chg:${k}">Demander une modification</button></div>`}`;}
    else if(c.stage==="agreed") part=`<h2>Déposer votre contenu</h2>${c.versions.length?`<p class="note">Retours sur la V${lastOf(c.versions).n} : ${esc(lastOf(c.versions).notes.map(x=>`${x.tc?x.tc+" · ":""}${x.text}`).join(" · "))}</p>`:""}<div class="field"><label for="crUrl">Lien de la vidéo (non publiée) *</label><input class="in" id="crUrl" placeholder="https://…">${errOf("crUrl")}</div><div class="btnrow"><button class="btn" type="button" data-act="ccontent" data-id="${a.id}" data-k="${k}">Envoyer la V${c.versions.length+1}</button><button class="btn ghost sm" type="button" data-act="crsample">Utiliser un lien d'exemple</button></div>`;
    else if(c.stage==="ready") part=`<h2>Votre publication</h2><p class="note">Contenu validé : vous pouvez publier.</p><div class="field"><label for="crPub">Lien de la publication *</label><input class="in" id="crPub" placeholder="https://www.tiktok.com/@…">${errOf("crPub")}</div><div class="btnrow"><button class="btn" type="button" data-act="cpub" data-id="${a.id}" data-k="${k}">Déclarer la publication</button><button class="btn ghost sm" type="button" data-act="crpubsample">Utiliser un lien d'exemple</button></div>`;
    else if(c.stage==="admin"&&c.pay==="invoice") part=`<h2>Votre facture</h2><div class="field"><label for="crInvF">Votre facture (PDF) *</label><input class="in" type="file" id="crInvF" accept="application/pdf,image/*">${S.invDraft?`<span class="src">${esc(fileLine({...S.invDraft,at:"à l'envoi"}))}</span>`:""}${errOf("crInvF")}</div><div class="btnrow"><button class="btn" type="button" data-act="cinvoice" data-id="${a.id}" data-k="${k}">Envoyer la facture</button><button class="btn ghost sm" type="button" data-act="crinvsample">Utiliser une facture d'exemple</button></div>`;
    else part=`<h2>${esc(STAGE[c.stage])}</h2><p class="note">Rien à faire pour vous pour l'instant.</p>`;
    return `<section class="card">${part}</section>`;}).join("");
  return `<div class="portal"><header class="pbar"><span style="display:flex;align-items:center;gap:10px"><span class="brand" style="margin:0">PDS</span><b>« Néons » · ${esc(nameOf(k))}</b></span><span class="lockline">${I.lock} Lien privé /i/… · sans compte</span></header>
   <div class="pwrap">${S.flash?flash():""}${body||`<section class="card"><h1 class="h1">Rien à faire pour l'instant</h1></section>`}<section class="card"><h2>Votre contact chez PDS</h2><div class="eyebrow">${av("cp",true)}<span><b>Lina Haddad</b> · Cheffe de projet</span></div></section></div></div>`;
}

/* After a creator's gesture on her private page: only what follows for her collaboration. */
function crAfter(a,c,title){const n=collabNext(a,c);S.flash={title,lines:n&&n.r?[n.r===c.k?`Ensuite, à vous : ${esc(n.todo.toLowerCase())}`:`Ensuite : <b>${esc(nameOf(n.r))}</b> · ${esc(n.todo.toLowerCase())}. Vous serez prévenue ici.`]:[]};toast(title+".");}

/* ======================================================================
   Activation confiée à une agence (tickets « Activations / Influence » et
   « Relations presse ») : PDS OS lit son Google Sheets, n'y écrit jamais.
   Le statut de l'agence reste le sien ; la décision de PDS est à part.
   ====================================================================== */
const AG_DEC=[["review","À examiner","","à examiner","à examiner"],["ok","Validé","ok","validé","validés"],["no","Refusé","bad","refusé","refusés"],["discuss","À discuter","warn","à discuter","à discuter"],["info","En attente d'information","info","en attente d'information","en attente d'information"],["fix","À corriger","warn","à corriger","à corriger"]];
const AG_DECM=Object.fromEntries(AG_DEC.map(d=>[d[0],d]));
const AG_CFG={
  influence:{title:"Campagne d'influence · agence externe",agency:"Agence Halo",contact:"Jeanne Roussel",file:"Halo × Néons — Talents",url:"https://docs.google.com/spreadsheets/d/1HaloNeonsTalents",
    rowWord:["profil","profils"],what:"votre proposition de talents",key:"handle",title2:"name",unit:"vues",
    fields:{name:"Nom",handle:"Compte",platform:"Plateforme",followers:"Abonnés",category:"Catégorie",agencyStatus:"Statut agence",fee:"Tarif HT",postUrl:"Lien de publication",views:"Vues",agencyNote:"Note de l'agence",ignore:"Ne pas reprendre"},
    facts:f=>`${esc(f.platform||"—")} · ${f.followers!=null?fmtN(f.followers)+" abonnés":"abonnés inconnus"}${f.category?" · "+esc(f.category):""}${f.fee!=null?" · "+euro(f.fee):""}`,
    tiles:(a,live)=>{const pub=live.filter(r=>r.f.agencyStatus==="Publié"),ok=live.filter(r=>r.dec.d==="ok");return [["Profils proposés",live.length],["Validés par PDS",ok.length],["Publiés selon l'agence",pub.length],["Vues déclarées",fmtN(pub.reduce((s,r)=>s+(r.f.views||0),0))],["Coût des validés",euro(ok.reduce((s,r)=>s+(r.f.fee||0),0))]];},
    statsFrom:live=>live.filter(r=>r.f.agencyStatus==="Publié").reduce((s,r)=>s+(r.f.views||0),0),
    num:["followers","fee","views"],material:["platform","followers","category","fee"],cats:["Lifestyle","Musique","Danse","Humour","Mode"],published:"Publié",
    cols:["Nom","Compte","Réseau","Abonnés","Catégorie","Statut","Tarif HT","Lien post","Vues","Commentaire agence"],
    auto:{"Nom":"name","Compte":"handle","Réseau":"platform","Abonnés":"followers","Catégorie":"category","Statut":"agencyStatus","Tarif HT":"fee","Lien post":"postUrl","Vues":"views","Commentaire agence":"ignore"},
    sheets:[
     [["Jade Cormier","@jadecrm","TikTok","412 000","Lifestyle","Proposé","1 200","","","Très bon engagement chez les 18-24 ans"],
      ["Malik Sow","@maliksow","TikTok","238 000","Danse","Proposé","900","","","A déjà dansé sur du R&B"],
      ["Lou Arnaud","@lou.arnaud","Instagram","156 000","Mode","Proposé","700","","",""],
      ["Yanis Ferrand","@yanisfrd","TikTok","#REF!","Humour","Proposé","650","","","Abonnés à recalculer"],
      ["Clara Nguyen","@claranguyen","TikTok","98 000","Food ?","Proposé","500","","",""],
      ["Théo Barbier","@theobarbier","Instagram","74 000","Musique","Option posée","400","","","Disponible à partir du 01/12"]],
     [["Jade Cormier","@jadecrm","TikTok","412 000","Lifestyle","Confirmé","1 200","","","Très bon engagement chez les 18-24 ans"],
      ["Malik Sow","@maliksow","TikTok","238 000","Danse","Publié","900","https://www.tiktok.com/@maliksow/video/7450","186 000","A déjà dansé sur du R&B"],
      ["Lou Arnaud","@lou.arnaud","Instagram","156 000","Mode","Proposé","850","","","Tarif revu avec son agent"],
      ["Yanis Ferrand","@yanisfrd","TikTok","121 000","Humour","Proposé","650","","","Abonnés recalculés"],
      ["Théo Barbier","@theobarbier","Instagram","74 000","Musique","Décliné","400","","","Indisponible finalement"],
      ["Inaya Diallo","@inaya.d","TikTok","205 000","Danse","Proposé","850","","","Remplace Clara Nguyen"]]]}
};
const agCfg=a=>AG_CFG[a.k];
const agDecs=a=>(agCfg(a).dec||["review","ok","no","discuss","info"]).map(k=>AG_DECM[k]);
const AG_NOTE={discuss:"Dites ce qui est à discuter.",info:"Dites quelle information manque.",fix:"Dites ce qui est à corriger."};
const agOf=a=>a.ag||(a.ag={url:null,map:null,sheetV:0,rows:[],snaps:[],recaps:[],decSeq:0,recapSeq:0,preview:null});
const agRows=a=>(a.ag?a.ag.rows:[]);
const agName=(a,r)=>{const c=agCfg(a);return c.key===c.title2?r.key:r.f[c.title2]||r.key;};
/* Reads the agency's sheet with the confirmed column mapping: numbers checked, categories compared. */
function agParse(a){
  const cfg=agCfg(a),ag=agOf(a),rows=cfg.sheets[Math.min(ag.sheetV,cfg.sheets.length)-1]||[];
  return rows.map((cells,i)=>{const f={},errs=[],warns=[];
    cfg.cols.forEach((col,j)=>{const k=ag.map[col],v=(cells[j]||"").trim();if(!k||k==="ignore") return;
      if(cfg.num.includes(k)){if(!v){f[k]=null;return;}const n=/^[\d\s  ]+$/.test(v)?parseInt(v.replace(/\D/g,""),10):NaN;if(isNaN(n)){f[k]=null;errs.push(`${cfg.fields[k]} : « ${v} » n'est pas un nombre${v.startsWith("#")?" (erreur de formule dans le tableau)":""}`);}else f[k]=n;return;}
      if(k==="due"&&v){const m=v.match(/^(\d{2})\/(\d{2})$/);if(!m||+m[1]<1||+m[1]>31||+m[2]<1||+m[2]>12){f[k]=null;errs.push(`${cfg.fields[k]} : « ${v} » n'est pas une date`);return;}}
      if(k==="category"&&v&&cfg.cats&&!cfg.cats.includes(v)) warns.push(`Catégorie « ${v} » inconnue : reprise telle quelle`);
      f[k]=v||null;});
    return {key:f[cfg.key],line:i+2,f,errs,warns};}).filter(r=>r.key).map((r,i,l)=>{const first=l.findIndex(x=>x.key===r.key);if(first<i){r.warns.push(`Doublon : même ${cfg.fields[cfg.key].toLowerCase()} que la ligne ${l[first].line}, à rapprocher`);r.key=`${r.key} · ligne ${r.line}`;}return r;});
}
const agShow=(a,k,v)=>v==null||v===""?"vide":k==="fee"?euro(v):agCfg(a).num.includes(k)?fmtN(v):String(v);
function agPreview(a){
  const cfg=agCfg(a),ag=agOf(a),parsed=agParse(a),added=[],changed=[],removed=[];
  parsed.forEach(p=>{const r=ag.rows.find(x=>x.key===p.key);if(!r){added.push(p);return;}
    const ch=Object.keys(cfg.fields).filter(k=>k!=="ignore"&&(r.f[k]??null)!==(p.f[k]??null)).map(k=>`${cfg.fields[k]} : ${agShow(a,k,r.f[k])} → ${agShow(a,k,p.f[k])}`);if(ch.length) changed.push({p,ch});});
  ag.rows.filter(r=>!r.removed&&!parsed.some(p=>p.key===r.key)).forEach(r=>removed.push(r));
  return {parsed,added,changed,removed,errors:parsed.filter(p=>p.errs.length||p.warns.length)};
}
function agApply(a,pv,by,at){
  const ag=agOf(a);
  pv.parsed.forEach(p=>{const r=ag.rows.find(x=>x.key===p.key);
    if(!r){ag.rows.push({key:p.key,line:p.line,f:p.f,errs:p.errs,warns:p.warns,dec:{d:"review"}});return;}
    const cfg=agCfg(a),mat=(cfg.material||[]).filter(k=>(r.f[k]??null)!==(p.f[k]??null)&&r.f[k]!=null).map(k=>`${cfg.fields[k]} : ${agShow(a,k,r.f[k])} → ${agShow(a,k,p.f[k])}`);if(mat.length&&r.dec.d!=="review") r.after=mat;
    Object.assign(r,{line:p.line,f:p.f,errs:p.errs,warns:p.warns,removed:false});});
  pv.removed.forEach(r=>{r.removed=at;});
  ag.snaps.push({n:ag.snaps.length+1,at,by,added:pv.added.length,changed:pv.changed.length,removed:pv.removed.length,errors:pv.errors.length});ag.preview=null;
}
/* Who does the next gesture with the agency's sheet. */
function agNext(a){
  if(!agCfg(a)||a.mode!=="Agence externe") return null;
  const R=a.resp||holder("project"),ag=agOf(a),cfg=agCfg(a);
  if(!ag.url) return {r:R,todo:`Relier le tableau de ${cfg.agency}`};
  if(!ag.map) return {r:R,todo:"Confirmer la correspondance des colonnes"};
  if(ag.preview) return {r:R,todo:"Vérifier l'actualisation avant de l'importer"};
  if(!ag.snaps.length) return {r:R,todo:"Actualiser le tableau de l'agence"};
  const n=ag.rows.filter(r=>!r.removed&&r.dec.d==="review").length;
  if(n) return {r:R,todo:`Décider sur ${n} ${cfg.rowWord[n>1?1:0]}`};
  if(ag.decSeq>ag.recapSeq) return {r:R,todo:`Envoyer le récapitulatif à ${cfg.agency}`};
  return null;
}
function agRecapText(a){
  const cfg=agCfg(a),rows=agRows(a).filter(r=>!r.removed),by=d=>rows.filter(r=>r.dec.d===d).map(r=>cfg.key==="handle"?`${agName(a,r)} (${r.key})`:agName(a,r));
  const part=(t,l)=>l.length?`\n${t} : ${l.join(", ")}.`:"";
  return `Bonjour ${cfg.contact.split(" ")[0]},\n\nVoici nos retours sur ${cfg.what} pour « Néons » de Mona Lys :${[["ok","Validés"],["no","Refusés"],["fix","À corriger"],["discuss","À discuter ensemble"],["info","Il nous manque une information"],["review","Encore à l'étude"]].map(([k,l])=>part(l,by(k))).join("")}\n\nMerci, ${nameOf(a.resp||"cp")}`;
}
function agCard(a,r,ed){
  const cfg=agCfg(a),d=AG_DECM[r.dec.d],key=r.key,f=r.f,editing=S.form==="agd:"+a.id+":"+key;
  const ini=agName(a,r).split(/\s+/).map(x=>x[0]).slice(0,2).join("").toUpperCase();
  const flags=[...r.errs.map(x=>`<span class="cap warnc">${I.warn} ${esc(x)} · à corriger dans le tableau de l'agence</span>`),...r.warns.map(x=>`<span class="cap">${esc(x)}</span>`),
    r.after?`<span class="cap warnc">${I.warn} Modifié par l'agence après votre décision : ${esc(r.after.join(" · "))}</span>`:"",r.removed?`<span class="cap">Retiré du tableau par l'agence le ${esc(r.removed)} : gardé ici avec sa décision</span>`:"",
    cfg.advanced&&cfg.advanced.includes(f.agencyStatus)&&r.dec.d==="review"&&!r.removed?`<span class="cap warnc">${I.warn} L'agence indique « ${esc(f.agencyStatus)} » alors que PDS n'a pas encore décidé</span>`:""].join("");
  const facts=cfg.facts?cfg.facts(f):"";
  const pub=f.postUrl?`<span class="src"><a href="#" data-act="nolink">${esc(f.postUrl)}</a>${f.views!=null?` · ${fmtN(f.views)} ${esc(cfg.unit)} selon l'agence`:""}</span>`:"";
  const form=editing?`<div class="field"><label for="agD-${key}">Décision PDS</label><select class="in" id="agD-${key}">${agDecs(a).map(x=>`<option value="${x[0]}" ${x[0]===(r.draftD||r.dec.d)?"selected":""}>${esc(x[1])}</option>`).join("")}</select></div>${ta("agN-"+key,"Note interne","Jamais envoyée à l'agence",false,r.dec.note)}
    <div class="btnrow"><button class="btn sm" type="button" data-act="agdec" data-id="${a.id}" data-k="${esc(key)}">Enregistrer</button><button class="btn ghost sm" type="button" data-act="form" data-v="">Annuler</button></div>`:"";
  return `<div class="agcard${r.removed?" gone":""}"><div class="eyebrow" style="gap:10px"><span class="agav" aria-hidden="true">${esc(ini)}</span><span class="grow" style="min-width:0"><b>${esc(agName(a,r))}</b>${cfg.key===cfg.title2?"":`<br><span class="src">${esc(key)}</span>`}</span></div>
   ${facts?`<span class="src">${facts}</span>`:""}${pub}
   <dl class="kv"><dt>Statut agence</dt><dd>${esc(f.agencyStatus||"—")}</dd><dt>Décision PDS</dt><dd>${pill(d[2],d[1])}${r.dec.by?`<br><span class="src">${esc(r.dec.by)}, ${esc(r.dec.at)}</span>`:""}</dd></dl>
   ${f.agencyNote?`<span class="src">Note de l'agence : « ${esc(f.agencyNote)} »</span>`:""}${r.dec.note?`<span class="src">Note interne : ${esc(r.dec.note)}</span>`:""}${flags}
   ${form||(ed&&!r.removed?`<div><button class="btn out sm" type="button" data-act="form" data-v="agd:${a.id}:${esc(key)}">${r.dec.d==="review"?"Décider":"Changer la décision"}</button></div>`:"")}</div>`;
}
function agencySection(a){
  const cfg=agCfg(a);if(!cfg) return "";
  const ag=agOf(a),ed=(me()===a.resp||can("project"))&&!["closed","cancelled"].includes(a.status),R=a.resp||holder("project");
  const head=`<div class="dhead"><h3>${esc(cfg.title)}</h3><span class="src">${esc(cfg.agency)} · ${esc(cfg.contact)}</span></div>`;
  if(!ag.url) return `<div class="vers mod">${head}${ed?`<div class="field"><label for="agUrl">Lien du Google Sheets de l'agence *</label><input class="in" id="agUrl" placeholder="https://docs.google.com/spreadsheets/…">${errOf("agUrl")}<span class="src">PDS OS lit le tableau, il n'y écrit jamais. L'agence le partage en lecture avec le lien.</span></div>
    <div class="btnrow"><button class="btn sm" type="button" data-act="aglink" data-id="${a.id}">Relier le tableau</button><button class="btn ghost sm" type="button" data-act="agsample" data-id="${a.id}">Utiliser un lien d'exemple</button></div>`:waitRow(R,`relier le tableau de ${cfg.agency}`)}</div>`;
  const sheet=cfg.sheets[0];
  if(!ag.map||S.form==="agmap:"+a.id){const cur=ag.map||cfg.auto;
    return `<div class="vers mod">${head}${callFacts([["Tableau",`<a href="#" data-act="nolink">${esc(cfg.file)}</a> <span class="src">· relié par ${esc(ag.by)} le ${esc(ag.at)}</span>`]])}
     <h3>Correspondance des colonnes</h3><p class="note">PDS OS a reconnu les colonnes de l'agence. Vérifiez-les : chaque ligne sera reconnue par sa colonne « ${esc(cfg.fields[cfg.key])} » d'une actualisation à l'autre.</p>
     <div class="rows">${cfg.cols.map((c,j)=>`<div class="irow"><span class="grow"><b>${esc(c)}</b> <span class="src">· colonne ${String.fromCharCode(65+j)}${sheet[0][j]?` · ex. : ${esc(sheet[0][j])}`:""}</span></span>${ed?`<select class="in" id="agM-${j}" style="width:auto;height:36px" aria-label="Champ PDS pour ${esc(c)}">${Object.entries(cfg.fields).map(([k,t])=>`<option value="${k}" ${cur[c]===k?"selected":""}>${esc(t)}</option>`).join("")}</select>`:`<span class="src">${esc(cfg.fields[cur[c]]||"—")}</span>`}</div>`).join("")}</div>${errOf("agMap")}
     ${ed?`<div class="btnrow"><button class="btn sm" type="button" data-act="agmap" data-id="${a.id}">Confirmer la correspondance</button>${ag.map?`<button class="btn ghost sm" type="button" data-act="form" data-v="">Annuler</button>`:""}</div>`:waitRow(R,"confirmer la correspondance des colonnes")}</div>`;}
  const last=lastOf(ag.snaps),pv=ag.preview,live=ag.rows.filter(r=>!r.removed);
  const cnt=agDecs(a).map(d=>[d,live.filter(r=>r.dec.d===d[0]).length]).filter(x=>x[1]);
  const preview=pv?`<div class="card" style="background:var(--soft);padding:14px;gap:10px"><h3 style="font-size:15px">Ce que l'actualisation va changer</h3>
    ${!pv.added.length&&!pv.changed.length&&!pv.removed.length&&!pv.errors.length?`<p class="note">Aucun changement depuis l'instantané n° ${last?last.n:0}.</p><div><button class="btn ghost sm" type="button" data-act="agcancel" data-id="${a.id}">Fermer</button></div>`:`
    ${pv.added.length?`<div><b>${pv.added.length} nouvelle${pv.added.length>1?"s":""} ligne${pv.added.length>1?"s":""}</b><ul class="hist">${pv.added.map(p=>`<li><span class="noc">+</span><span>${esc(p.f[cfg.title2]||p.key)} · ${esc(p.key)} <span class="src">· ligne ${p.line}</span></span></li>`).join("")}</ul></div>`:""}
    ${pv.changed.length?`<div><b>${pv.changed.length} modification${pv.changed.length>1?"s":""}</b><ul class="hist">${pv.changed.map(c=>`<li><span class="noc">•</span><span>${esc(c.p.f[cfg.title2]||c.p.key)} · ${esc(c.ch.join(" · "))}</span></li>`).join("")}</ul></div>`:""}
    ${pv.removed.length?`<div><b>${pv.removed.length} ligne${pv.removed.length>1?"s":""} retirée${pv.removed.length>1?"s":""} du tableau</b><ul class="hist">${pv.removed.map(r=>`<li><span class="noc">−</span><span>${esc(agName(a,r))} · gardé dans PDS OS avec sa décision, marqué retiré</span></li>`).join("")}</ul></div>`:""}
    ${pv.errors.length?`<div><b class="warnc">${pv.errors.length} ligne${pv.errors.length>1?"s":""} à corriger chez l'agence</b><ul class="hist">${pv.errors.map(p=>`<li><span class="noc">!</span><span>Ligne ${p.line} · ${esc(p.key)} · ${esc([...p.errs,...p.warns].join(" · "))}</span></li>`).join("")}</ul><span class="src">La valeur fausse est laissée vide ; le reste de la ligne est importé.</span></div>`:""}
    <div class="btnrow"><button class="btn sm" type="button" data-act="agimport" data-id="${a.id}">Importer ces changements</button><button class="btn ghost sm" type="button" data-act="agcancel" data-id="${a.id}">Annuler</button></div>`}</div>`:"";
  const pending=ag.decSeq>ag.recapSeq&&ag.snaps.length;
  const recap=pending&&ed?`<div class="vers"><h3>Récapitulatif pour ${esc(cfg.agency)}</h3><div class="field"><label for="agMsg">Message</label><textarea class="in" id="agMsg" rows="8">${esc(agRecapText(a))}</textarea><span class="src">Écrit à partir de vos décisions, sans les notes internes. PDS OS ne l'envoie pas : copiez-le, puis indiquez qu'il est parti.</span></div>
    <div class="btnrow"><button class="btn sm" type="button" data-act="agsent" data-id="${a.id}">Marquer comme envoyé</button><button class="btn ghost sm" type="button" data-act="copytext" data-from="agMsg" data-v="Message copié.">Copier le message</button></div></div>`:"";
  const stat=cfg.statsFrom?cfg.statsFrom(live):0,rep=ag.report;
  const bilan=ag.rows.length?`<div class="vers"><h3>Bilan selon l'agence</h3><div class="statgrid">${cfg.tiles(a,live).map(([k,v])=>`<div class="stat"><span class="k">${esc(k)}</span><b class="num">${v}</b></div>`).join("")}</div>
     <span class="src">Données de l'agence, non vérifiées par PDS · instantané n° ${last?last.n:0}.</span>
     ${ed&&stat&&!(a.snaps||[]).some(x=>x.agSnap===(last&&last.n))?`<div><button class="btn out sm" type="button" data-act="agstats" data-id="${a.id}">Reprendre les ${esc(cfg.unit)} dans les statistiques</button></div>`:""}
     ${cfg.report?agReport(a,live,ed):""}</div>`:"";
  return `<div class="vers mod">${head}
   ${callFacts([["Tableau",`<a href="#" data-act="nolink">${esc(cfg.file)}</a> <span class="src">· lu seulement · relié par ${esc(ag.by)} le ${esc(ag.at)}</span>${ed?` <button class="btn ghost sm" type="button" data-act="form" data-v="agmap:${a.id}">Modifier la correspondance</button>`:""}`],
     ["Dernière actualisation",last?`Instantané n° ${last.n} · ${esc(last.by)}, ${esc(last.at)} <span class="src">· ${last.added} ajout${last.added>1?"s":""}, ${last.changed} modification${last.changed>1?"s":""}, ${last.removed} retrait${last.removed>1?"s":""}, ${last.errors} erreur${last.errors>1?"s":""}</span>`:"Jamais actualisé"],
     ["Décisions PDS",cnt.length?cnt.map(([d,n])=>`${n} ${d[n>1?4:3]}`).join(" · "):`Aucun ${cfg.rowWord[0]}`],
     ...(ag.recaps.length?[["Récapitulatifs envoyés",ag.recaps.map(x=>`${esc(x.at)} par ${esc(x.by)}`).join(" · ")]]:[])])}
   ${ed&&!pv?`<div class="btnrow"><button class="btn ${agNext(a)&&/Actualiser/.test(agNext(a).todo)?"":"out "}sm" type="button" data-act="agrefresh" data-id="${a.id}">Actualiser</button>${ag.sheetV<cfg.sheets.length?`<button class="protobtn" type="button" data-act="agproto" data-id="${a.id}">Proto : ${esc(cfg.agency)} met à jour son tableau</button>`:""}</div>`:""}
   ${preview}
   ${ag.rows.length?`<div class="aggrid">${[...live,...ag.rows.filter(r=>r.removed)].map(r=>agCard(a,r,ed)).join("")}</div>`:""}
   ${recap}${bilan}</div>`;
}

/* ======================================================================
   Relations presse (ticket « Activations / Relations presse ») : un module,
   deux modes. Cadrage et dossier de presse communs ; rien n'est envoyé,
   réalisé ou vérifié sans le geste d'une personne.
   ====================================================================== */
AG_CFG.rp={title:"Relations presse · agence externe",agency:"Agence Plume",contact:"Sophie Tanguy",file:"Plume — Plan médias Néons",url:"https://docs.google.com/spreadsheets/d/1PlumeNeonsPlan",
  rowWord:["média","médias"],what:"votre plan médias",key:"media",title2:"media",unit:"retombées",dec:["review","ok","no","fix"],
  fields:{media:"Média",journalist:"Journaliste",action:"Type d'action",angle:"Angle",priority:"Priorité",due:"Échéance",agencyStatus:"Statut agence",postUrl:"Lien de la retombée",agencyNote:"Note de l'agence",ignore:"Ne pas reprendre"},
  num:[],material:["action","angle","priority"],advanced:["Contacté","Intéressé","Action déclarée réalisée"],
  facts:f=>`${esc(f.journalist||"Journaliste non renseigné")} · ${esc(f.action||"—")}${f.angle?" · "+esc(f.angle):""}${f.priority?" · priorité "+esc(f.priority.toLowerCase()):""}${f.due?" · pour le "+esc(f.due):""}`,
  tiles:(a,live)=>{const done=live.filter(r=>r.f.agencyStatus==="Action déclarée réalisée");return [["Actions proposées",live.length],["Validées par PDS",live.filter(r=>r.dec.d==="ok").length],["Retombées déclarées",done.length],["Preuves fournies",done.filter(r=>r.f.postUrl).length],["Preuves manquantes",done.filter(r=>!r.f.postUrl).length]];},
  report:true,
  cols:["Média","Journaliste","Action","Angle","Priorité","Échéance","Statut","Lien retombée","Commentaire"],
  auto:{"Média":"media","Journaliste":"journalist","Action":"action","Angle":"angle","Priorité":"priority","Échéance":"due","Statut":"agencyStatus","Lien retombée":"postUrl","Commentaire":"agencyNote"},
  sheets:[
   [["Le Contrechamp","Camille Roy","Chronique","Focus sur le titre","Haute","27/11","Proposé","",""],
    ["Urbania Mag","Sarah Benhamou","Interview","Portrait de Mona Lys","Haute","32/11","Proposé","","Date à caler avec le management"],
    ["Radio Lumen","Hugo Lambert","Passage radio","Session acoustique","Moyenne","04/12","Proposé","",""],
    ["Sillon","","Mention newsletter","Focus sur le titre","Basse","05/12","À contacter","",""],
    ["Le Contrechamp","","Article web","Making-of du clip","Moyenne","","Proposé","",""]],
   [["Le Contrechamp","Camille Roy","Chronique","Focus sur le titre","Haute","27/11","Action déclarée réalisée","https://lecontrechamp.fr/chronique-neons",""],
    ["Urbania Mag","Sarah Benhamou","Interview","Portrait de Mona Lys","Haute","02/12","Action déclarée réalisée","","Interview faite le 02/12, parution à venir"],
    ["Radio Lumen","Hugo Lambert","Passage radio","Session acoustique","Moyenne","04/12","Contacté","","Sans retour pour l'instant"],
    ["Sillon","","Mention newsletter","Focus sur le titre","Basse","05/12","Décliné","",""]]]};
/* The agency's report is read, never taken as proof: PDS keeps it provisionally, asks for more, or files it. */
function agReport(a,live,ed){
  const ag=agOf(a),rep=ag.report,cfg=agCfg(a);
  const res=[...live.filter(r=>r.f.agencyStatus==="Action déclarée réalisée"&&!r.f.postUrl).map(r=>`${agName(a,r)} : action déclarée sans preuve`),
    ...live.filter(r=>cfg.advanced.includes(r.f.agencyStatus)&&r.dec.d==="review").map(r=>`${agName(a,r)} : « ${r.f.agencyStatus} » sans décision PDS`),
    ...live.filter(r=>r.f.agencyStatus==="Action déclarée réalisée").map(r=>`${agName(a,r)} : aucune audience ni date de diffusion fournie`)];
  const head=`<h3>Bilan de l'agence</h3>${res.length?`<ul class="hist">${res.map(x=>`<li><span class="noc">!</span><span>${esc(x)}</span></li>`).join("")}</ul><span class="src">Réserves relevées par le code, sans jugement : elles restent visibles après la décision.</span>`:`<p class="note">Aucune réserve relevée.</p>`}`;
  if(rep) return `<div class="vers">${head}${callFacts([["Décision",`${esc(rep.label)} · ${esc(rep.by)}, ${esc(rep.at)}${rep.note?` · « ${esc(rep.note)} »`:""}`]])}</div>`;
  if(!ed) return `<div class="vers">${head}</div>`;
  return `<div class="vers">${head}${ta("agRepNote","Commentaire","Obligatoire pour demander des compléments")}<div class="btnrow"><button class="btn sm" type="button" data-act="agreport" data-id="${a.id}" data-v="prov">Valider provisoirement avec réserves</button><button class="btn out sm" type="button" data-act="agreport" data-id="${a.id}" data-v="more">Demander des compléments</button><button class="btn ghost sm" type="button" data-act="agreport" data-id="${a.id}" data-v="filed">Archiver comme reçu</button></div></div>`;
}

const RP_MEDIA=[
  {k:"contrechamp",name:"Le Contrechamp",type:"Webzine musique",jour:"Camille Roy",role:"Rédactrice musique",mail:"camille@lecontrechamp.fr",hist:"A chroniqué « Lune » en 2025",flag:null},
  {k:"urbania",name:"Urbania Mag",type:"Magazine culture urbaine",jour:"Sarah Benhamou",role:"Journaliste",mail:"s.benhamou@urbania-mag.fr",hist:"Contactée pour un autre artiste PDS il y a trois semaines",flag:["warn","Campagne récente"]},
  {k:"lumen",name:"Radio Lumen",type:"Radio",jour:"Hugo Lambert",role:"Programmateur",mail:"hugo.lambert@radiolumen.fr",hist:"Refus en mars 2026 : « pas notre format »",flag:["warn","Refus antérieur"]},
  {k:"sillon",name:"Sillon",type:"Newsletter musique",jour:null,role:null,mail:"redaction@sillon.news",hist:"Coordonnée relevée en 2024",flag:["warn","Coordonnée ancienne"]},
  {k:"contrechamp2",name:"Contrechamp Magazine",type:"Webzine musique",jour:null,role:null,mail:"contact@contrechamp-mag.fr",hist:"Fiche créée à la main en 2025",flag:["bad","Doublon probable de « Le Contrechamp »"],dup:"contrechamp"}];
const rpMedia=k=>RP_MEDIA.find(m=>m.k===k);
const RP_CAD=[
  {k:"goals",label:"Objectifs",v:"Faire découvrir Mona Lys au-delà de TikTok ; installer « Néons » comme le single de l'hiver",src:"Brief de sortie V1 › Objectifs & KPIs",req:true},
  {k:"public",label:"Public",v:"Médias musique et culture urbaine, lecteurs de 18 à 25 ans",src:"Brief de sortie V1 › Cœur de cible",req:true},
  {k:"message",label:"Message principal",v:"« Néons », une nuit blanche à Paris entre deux lumières",src:"Brief de sortie V1 › Narratif",req:true},
  {k:"angles",label:"Angles",v:"Portrait de Mona Lys · Making-of du clip · Session acoustique",src:"Brief de sortie V1 › Narratif",req:true},
  {k:"voice",label:"Porte-parole",v:"Mona Lys ; Jade Petit (management) pour les questions business",src:"Projet › Équipe",req:true},
  {k:"cal",label:"Calendrier",v:"Envoi du dossier le Lun. 23/11 · sortie le Sam. 05/12 · relances jusqu'au Sam. 19/12",src:"Plan du projet",req:true},
  {k:"limits",label:"Restrictions",v:null,src:null,req:false},
  {k:"contact",label:"Interlocuteur presse",v:"Lina Haddad · presse@pds.fr",src:"Projet › Équipe",req:true}];
const RP_KIT=[
  {k:"artist",label:"Présentation de l'artiste",v:"Mona Lys, autrice-compositrice parisienne : un R&B alternatif né sur TikTok, 1,2 million d'auditeurs mensuels.",src:"Fiche Artiste",req:true},
  {k:"title",label:"Présentation du titre",v:"« Néons », single de Mona Lys · sortie le Sam. 05/12/2026",src:"Fiche Projet",req:true},
  {k:"message",label:"Message et angles",v:null,src:"Cadrage RP validé",req:true},
  {k:"bio",label:"Biographie",v:null,src:null,req:true},
  {k:"photos",label:"Photos presse",v:"3 photos du tournage, Studio Ressac",src:"Fichiers › Photos",req:true},
  {k:"cover",label:"Pochette",v:null,src:"Production › Pochette",req:true},
  {k:"credits",label:"Crédits",v:null,src:"Juridique › Crédits",req:false},
  {k:"links",label:"Liens d'écoute",v:null,src:null,req:false},
  {k:"contact",label:"Coordonnées presse",v:"Lina Haddad · presse@pds.fr",src:"Projet › Équipe",req:true}];
const RP_MSG={draft:["","Brouillon"],review:["info","À valider"],ok:["ok","Validé"],changes:["warn","Corrections demandées"],sent:["ok","Envoi déclaré"]};
const RP_OPP=[["proposed","Interview proposée"],["avail","Disponibilité de principe"],["confirmed","Créneau confirmé"],["done","Interview réalisée"],["diffused","Diffusion déclarée"],["cancelled","Diffusion annulée"]];
const RP_OPPM=Object.fromEntries(RP_OPP);
function rpOf(a){
  if(a.rp) return a.rp;
  const cad=RP_CAD.map(x=>({...x})),kit=RP_KIT.map(x=>({...x}));
  return a.rp={cad:{fields:cad,status:"draft",round:1,hist:[]},kit:{v:1,sections:kit,status:"draft",hist:[],validated:null,sent:null},targets:[],tpl:null,opps:[],cov:[]};
}
const rpDir=()=>holder("direction");
const rpEd=a=>(me()===a.resp||can("project"))&&!["closed","cancelled"].includes(a.status);
/* Kit sections that come from elsewhere in PDS OS are read at display time, never copied. */
function rpKitVal(a,s){
  const r=rpOf(a);if(s.v) return {v:s.v,src:s.src};
  if(s.k==="message"&&r.cad.status==="ok"){const f=k=>r.cad.fields.find(x=>x.k===k).v;return {v:`${f("message")}. Angles : ${f("angles")}.`,src:"Cadrage RP validé"};}
  if(s.k==="cover"&&S.light.pochette&&S.light.pochette.delivered){const c=lastOf(S.light.pochette.versions);return {v:`Pochette validée, ${c.w} × ${c.h} px`,src:"Production › Pochette livrée"};}
  return {v:null,src:s.src};
}
const rpKitMissing=a=>rpOf(a).kit.sections.filter(s=>s.req&&!rpKitVal(a,s).v).map(s=>s.label.toLowerCase());
function rpField(a,x,pre,editable){
  const id=`${pre}-${x.k}`,v=pre==="rk"?rpKitVal(a,x):{v:x.v,src:x.src};
  if(S.form===id) return `<div class="irow"><span class="grow"><label for="${id}"><b>${esc(x.label)}</b>${x.req?" *":""}</label><textarea class="in" id="${id}" rows="2">${esc(v.v||"")}</textarea>${errOf(id)}</span><span class="btnrow"><button class="btn sm" type="button" data-act="rpsave" data-id="${a.id}" data-v="${id}">Enregistrer</button><button class="btn ghost sm" type="button" data-act="form" data-v="">Annuler</button></span></div>`;
  return `<div class="irow"><span class="grow"><b>${esc(x.label)}</b>${x.req?"":` <span class="src">· non bloquant</span>`}<br>${v.v?esc(v.v):`<span class="src">${x.req?"À compléter":"Non renseigné"}</span>`}${v.src?`<br><span class="src">${x.edited?`Modifié par ${esc(x.edited)}`:`Repris de ${esc(v.src)}`}</span>`:x.edited?`<br><span class="src">Écrit par ${esc(x.edited)}</span>`:""}</span>${editable?`<button class="btn ghost sm" type="button" data-act="form" data-v="${id}">${v.v?"Modifier":"Compléter"}</button>`:""}</div>`;
}
function rpCadrage(a){
  const r=rpOf(a),c=r.cad,ed=rpEd(a),dir=me()===rpDir(),editable=ed&&["draft","changes"].includes(c.status);
  const st=c.status==="ok"?["ok","Validé"]:c.status==="review"?["info","À valider"]:c.status==="changes"?["warn","Corrections demandées"]:["","Brouillon"];
  let act="";
  if(editable) act=`${c.status==="changes"&&c.note?`<div class="callout warn">${I.warn}<span>${esc(c.note)}</span></div>`:""}${errOf("rcad")}<div class="btnrow"><button class="btn sm" type="button" data-act="rcsubmit" data-id="${a.id}">Soumettre à ${esc(nameOf(rpDir()))}</button></div>`;
  else if(c.status==="review"&&dir) act=`${ta("rcNote","Commentaire","Obligatoire pour demander des corrections")}<div class="btnrow"><button class="btn sm" type="button" data-act="rcdec" data-id="${a.id}" data-v="ok">Valider le cadrage</button><button class="btn out sm" type="button" data-act="rcdec" data-id="${a.id}" data-v="changes">Demander des corrections</button></div>`;
  else if(c.status==="review") act=waitRow(rpDir(),"valider le cadrage RP");
  else if(c.status==="ok"&&ed) act=`<div><button class="btn ghost sm" type="button" data-act="rcreopen" data-id="${a.id}">Modifier le cadrage</button></div>`;
  const body=`<div class="rows">${c.fields.map(x=>rpField(a,x,"rc",editable)).join("")}</div>${act}${c.hist.length?`<ul class="hist">${c.hist.map(h=>`<li><span class="noc">•</span><span>${esc(h)}</span></li>`).join("")}</ul>`:""}`;
  return versionCard("rpcad"+a.id,c.status!=="ok",`Cadrage RP${c.round>1?" · version "+c.round:""}`,pill(st[0],st[1]),"Commun aux deux modes",body);
}
function rpKit(a){
  const r=rpOf(a),k=r.kit,ed=rpEd(a),dir=me()===rpDir(),editable=ed&&["draft","changes"].includes(k.status);
  const done=k.sections.filter(s=>rpKitVal(a,s).v).length,miss=rpKitMissing(a);
  const st=k.status==="ok"?["ok",`V${k.v} validée`]:k.status==="review"?["info",`V${k.v} à valider`]:k.status==="changes"?["warn","Corrections demandées"]:["",`V${k.v} en préparation`];
  let act="";
  if(editable) act=`${k.status==="changes"&&k.note?`<div class="callout warn">${I.warn}<span>${esc(k.note)}</span></div>`:""}${errOf("rkit")}<div class="btnrow"><button class="btn sm" type="button" data-act="rksubmit" data-id="${a.id}">Soumettre la V${k.v} à ${esc(nameOf(rpDir()))}</button></div>`;
  else if(k.status==="review"&&dir) act=`${ta("rkNote","Commentaire","Obligatoire pour demander des corrections")}<div class="btnrow"><button class="btn sm" type="button" data-act="rkdec" data-id="${a.id}" data-v="ok">Valider la V${k.v}</button><button class="btn out sm" type="button" data-act="rkdec" data-id="${a.id}" data-v="changes">Demander des corrections</button></div>`;
  else if(k.status==="review") act=waitRow(rpDir(),`valider le dossier de presse V${k.v}`);
  else if(k.status==="ok"&&ed) act=`<div><button class="btn ghost sm" type="button" data-act="rknewv" data-id="${a.id}">Ouvrir la V${k.v+1}</button></div>`;
  const facts=callFacts([["Complétude",`${done} sections sur ${k.sections.length}${miss.length?` · manque : ${esc(miss.join(", "))}`:" · toutes les sections obligatoires"}`],["Validation",k.validated?`V${k.validated.v} validée par ${esc(k.validated.by)} le ${esc(k.validated.at)}`:"Aucune version validée"],["Diffusion",k.sent?`V${k.sent.v} ${esc(k.sent.how)} le ${esc(k.sent.at)}`:"Pas encore envoyé"]]);
  const body=`${facts}<div class="rows">${k.sections.map(x=>rpField(a,x,"rk",editable)).join("")}</div>${act}${k.hist.length?`<ul class="hist">${k.hist.map(h=>`<li><span class="noc">•</span><span>${esc(h)}</span></li>`).join("")}</ul>`:""}`;
  return versionCard("rpkit"+a.id,k.status!=="ok",`Dossier de presse`,pill(st[0],st[1]),k.sent?"Envoyé":"Validé ≠ envoyé",body);
}
/* What a target's next message is waiting for. */
function rpMsgNext(a,t){
  const m=lastOf(t.msgs);if(!m) return null;const R=a.resp||holder("project");
  return m.status==="review"?{r:rpDir(),todo:"Valider le message"}:["draft","changes"].includes(m.status)?{r:R,todo:"Soumettre le message"}:m.status==="ok"?{r:R,todo:"Déclarer l'envoi"}:null;
}
function rpMsgCard(a,t,m,i){
  const ed=rpEd(a),dir=me()===rpDir(),md=rpMedia(t.k),key=`${t.k}-${i}`,s=RP_MSG[m.status];
  let act="";
  if(ed&&["draft","changes"].includes(m.status)) act=`${m.note?`<span class="cap warnc">${esc(m.note)}</span>`:""}<div class="field"><label for="rmA-${key}">${m.kind==="first"?"Accroche personnalisée":"Message de relance"}</label><textarea class="in" id="rmA-${key}" rows="2">${esc(m.text)}</textarea></div>
    <div class="btnrow"><select class="in" id="rmC-${key}" style="width:auto;height:36px" aria-label="Canal"><option>E-mail</option><option>Message privé</option><option>Téléphone</option></select><button class="btn sm" type="button" data-act="rmsub" data-id="${a.id}" data-k="${t.k}" data-i="${i}">Soumettre à ${esc(nameOf(rpDir()))}</button></div>`;
  else if(m.status==="review"&&dir) act=`<div class="field"><label for="rmN-${key}">Commentaire</label><input class="in" id="rmN-${key}" placeholder="Obligatoire pour demander des corrections">${errOf("rmN-"+key)}</div><div class="btnrow"><button class="btn sm" type="button" data-act="rmdec" data-id="${a.id}" data-k="${t.k}" data-i="${i}" data-v="ok">Valider le message</button><button class="btn out sm" type="button" data-act="rmdec" data-id="${a.id}" data-k="${t.k}" data-i="${i}" data-v="changes">Demander des corrections</button></div>`;
  else if(m.status==="ok"&&ed) act=S.form==="rms:"+key?`<div class="callout">${I.warn}<span>Vous déclarez avoir envoyé ce message à <b>${esc(md.jour||md.name)}</b> par ${esc(m.canal.toLowerCase())}${m.kind==="first"?`, avec le dossier de presse V${rpOf(a).kit.validated?rpOf(a).kit.validated.v:"?"}`:""}. PDS OS ne l'a pas envoyé.</span></div>${errOf("rms")}<div class="btnrow"><button class="btn sm" type="button" data-act="rmsent" data-id="${a.id}" data-k="${t.k}" data-i="${i}">Confirmer l'envoi déclaré</button><button class="btn ghost sm" type="button" data-act="form" data-v="">Annuler</button></div>`
    :`<div class="btnrow"><button class="btn sm" type="button" data-act="form" data-v="rms:${key}">Marquer l'envoi comme déclaré</button><button class="btn ghost sm" type="button" data-act="copytext" data-copy="${esc(m.text)}" data-v="Message copié.">Copier le message</button></div>`;
  return `<div class="irow"><span class="grow"><b>${m.kind==="first"?"Premier message":"Relance "+(i)}</b> · ${esc(m.canal||"canal à choisir")}<br><span class="src">${esc(m.text)}</span>${m.sent?`<br><span class="src">Envoi déclaré par ${esc(m.sent.by)} le ${esc(m.sent.at)}</span>`:""}${m.okBy?`<br><span class="src">Validé par ${esc(m.okBy)}</span>`:""}${act?`<div style="margin-top:8px;display:flex;flex-direction:column;gap:8px">${act}</div>`:""}</span>${pill(s[0],s[1])}</div>`;
}
function rpTarget(a,t){
  const r=rpOf(a),md=rpMedia(t.k),ed=rpEd(a),showMail=me()===a.resp||can("project"),last=lastOf(t.msgs),sent=t.msgs.some(m=>m.status==="sent");
  const opp=r.opps.find(o=>o.t===t.k&&o.stage!=="cancelled");
  const block=t.resp==="refused"?"Refus noté : pas de relance":opp?"Opportunité ouverte : pas de relance":null;
  const tools=ed&&sent&&last.status==="sent"&&!t.resp?`<div class="btnrow"><button class="btn out sm" type="button" data-act="rresp" data-id="${a.id}" data-k="${t.k}" data-v="positive">Noter une réponse positive</button><button class="btn ghost sm" type="button" data-act="rresp" data-id="${a.id}" data-k="${t.k}" data-v="refused">Noter un refus</button><button class="btn ghost sm" type="button" data-act="rrel" data-id="${a.id}" data-k="${t.k}">Préparer une relance</button></div>`:block&&sent?`<span class="src">${esc(block)}</span>`:"";
  const body=`<div class="eyebrow">${md.flag?pill(md.flag[0],md.flag[1]):""}<span class="src">${esc(md.type)} · ${md.jour?`${esc(md.jour)}, ${esc(md.role)}`:"journaliste non renseigné"} · ${showMail?esc(md.mail):"coordonnées masquées"} · ${esc(md.hist)}</span></div>
    ${callFacts([["Priorité",esc(t.prio)],["Angle",esc(t.angle)],["Pourquoi ce média",t.why?esc(t.why):`<span class="src">Non renseigné</span>`]])}
    ${t.msgs.length?`<div class="rows">${t.msgs.map((m,i)=>rpMsgCard(a,t,m,i)).join("")}</div>`:`<span class="src">Aucun message préparé.</span>`}${tools}`;
  const st=t.resp==="positive"?["ok","Réponse positive"]:t.resp==="refused"?["","Refus"]:last?RP_MSG[last.status]:["","Ciblé"];
  return versionCard("rpt"+a.id+t.k,!t.resp,`${esc(md.name)}`,pill(st[0],st[1]),esc(md.type),body);
}
function rpOppCard(a,o){
  const md=rpMedia(o.t),ed=rpEd(a),dir=me()===rpDir(),id=o.id;let act="";
  if(ed){
    if(o.stage==="proposed") act=`<div class="btnrow"><button class="btn sm" type="button" data-act="ropp" data-id="${a.id}" data-o="${id}" data-v="avail">Noter une disponibilité de principe</button></div>`;
    else if(o.stage==="avail") act=`<div class="grid2"><div class="field"><label for="roD-${id}">Date *</label><input class="in" type="date" id="roD-${id}">${errOf("roD-"+id)}</div><div class="field"><label for="roH-${id}">Heure *</label><input class="in" type="time" id="roH-${id}">${errOf("roH-"+id)}</div><div class="field"><label for="roF-${id}">Format</label><select class="in" id="roF-${id}"><option>En studio</option><option>En visio</option><option>Au téléphone</option></select></div><div class="field"><label for="roW-${id}">Confirmé par</label><input class="in" id="roW-${id}" value="${esc(md.jour||"")} par e-mail"></div></div><div class="btnrow"><button class="btn sm" type="button" data-act="ropp" data-id="${a.id}" data-o="${id}" data-v="confirmed">Confirmer le créneau</button></div>`;
    else if(o.stage==="confirmed") act=`${o.brief?"":`<div><button class="btn out sm" type="button" data-act="rbrief" data-id="${a.id}" data-o="${id}">Préparer le brief d'interview</button></div>`}<div class="btnrow"><button class="btn sm" type="button" data-act="ropp" data-id="${a.id}" data-o="${id}" data-v="done">Marquer l'interview réalisée</button></div>${errOf("roX-"+id)}`;
    else if(o.stage==="done") act=`<div class="grid2"><div class="field"><label for="rdF-${id}">Format diffusé</label><input class="in" id="rdF-${id}" value="Article web"></div><div class="field"><label for="rdS-${id}">Source de la déclaration *</label><input class="in" id="rdS-${id}" placeholder="Ex. : e-mail de Camille Roy du 10/12">${errOf("rdS-"+id)}</div></div><div class="btnrow"><button class="btn sm" type="button" data-act="ropp" data-id="${a.id}" data-o="${id}" data-v="diffused">Déclarer la diffusion</button><button class="btn ghost sm" type="button" data-act="ropp" data-id="${a.id}" data-o="${id}" data-v="cancelled">Diffusion annulée</button></div>`;
    else if(o.stage==="diffused"&&!rpOf(a).cov.some(c=>c.opp===id)) act=`<div><button class="btn out sm" type="button" data-act="form" data-v="rcov:${a.id}:${o.t}">Déclarer la retombée</button></div>`;
  }
  const brief=o.brief?`<div class="vers"><h3>Brief d'interview</h3>${callFacts([["Messages clés",esc(rpOf(a).cad.fields.find(x=>x.k==="message").v)],["Angle",esc(o.angle)],["Éléments factuels",`« Néons » sort le Sam. 05/12/2026 · clip tourné au Studio Ressac`],["Sujets sensibles",`<span class="src">À compléter par Lina Haddad</span>`],["Questions probables","Le tournage de nuit, l'écriture du refrain, la suite après TikTok"]])}<span class="src">Repris du cadrage et du dossier validés. Aucune réponse n'est écrite à la place de Mona Lys.</span></div>`:"";
  return `<div class="vers"><div class="dhead"><h3>${esc(o.type)} · ${esc(md.name)}</h3>${pill(o.stage==="cancelled"?"":o.stage==="diffused"?"ok":"info",RP_OPPM[o.stage])}</div>
    ${callFacts([["Journaliste",esc(md.jour||"Non renseigné")],["Créneau",o.slot?`${esc(fullDate(fromIso(o.slot.d)))} à ${esc(o.slot.h)} · ${esc(o.slot.f)} · confirmé par ${esc(o.slot.w)}`:"Pas encore de créneau confirmé"],...(o.diff?[["Diffusion",`${esc(o.diff.f)} · déclarée par ${esc(o.diff.by)} le ${esc(o.diff.at)} · source : ${esc(o.diff.src)}`]]:[])])}
    ${brief}${act}<ul class="hist">${o.log.map(x=>`<li><span class="noc">•</span><span>${esc(x)}</span></li>`).join("")}</ul></div>`;
}
function rpCoverage(a){
  const r=rpOf(a),ed=rpEd(a),dir=me()===rpDir(),f=S.form||"",form=f.startsWith("rcov:"+a.id);
  const pre=form?f.split(":")[2]:"";
  const rows=r.cov.map(c=>{const md=rpMedia(c.t);let act="";
    if(c.status==="declared"&&dir) act=`<div class="btnrow" style="margin-top:8px"><select class="in" id="rvM-${c.id}" style="width:auto;height:36px" aria-label="Méthode de vérification"><option>Lien consulté</option><option>Capture d'écran</option><option>Exemplaire papier</option></select><button class="btn sm" type="button" data-act="rcovv" data-id="${a.id}" data-c="${c.id}" data-v="verified">Vérifier la retombée</button><button class="btn ghost sm" type="button" data-act="rcovv" data-id="${a.id}" data-c="${c.id}" data-v="unavailable">Lien inaccessible</button></div>${errOf("rvM-"+c.id)}`;
    return `<div class="irow"><span class="grow"><b>${esc(md.name)}</b> · ${esc(c.type)} · ${c.url?`<a href="#" data-act="nolink">${esc(c.url)}</a>`:"sans lien"}<br><span class="src">Déclarée par ${esc(c.by)} le ${esc(c.at)} · source : ${esc(c.src)}${c.ver?` · ${c.status==="verified"?"vérifiée":"contrôlée"} par ${esc(c.ver.by)} le ${esc(c.ver.at)} (${esc(c.ver.m)})`:""}</span>${act}</span>${pill(c.status==="verified"?"ok":c.status==="unavailable"?"bad":"info",c.status==="verified"?"Vérifiée":c.status==="unavailable"?"Indisponible":"Déclarée")}</div>`;}).join("");
  const add=form?`<div class="card" style="background:var(--soft);padding:14px;gap:10px"><div class="grid2"><div class="field"><label for="rcM">Média</label><select class="in" id="rcM">${r.targets.map(t=>`<option value="${t.k}" ${t.k===pre?"selected":""}>${esc(rpMedia(t.k).name)}</option>`).join("")}</select></div><div class="field"><label for="rcT">Type</label><select class="in" id="rcT"><option>Article web</option><option>Chronique</option><option>Interview</option><option>Passage radio</option></select></div>
    <div class="field"><label for="rcU">Lien</label><input class="in" id="rcU" placeholder="https://…">${errOf("rcU")}</div><div class="field"><label for="rcS">Source de la déclaration *</label><input class="in" id="rcS" placeholder="Ex. : alerte Google, e-mail du média">${errOf("rcS")}</div></div><span class="src">Sans lien, la retombée reste déclarée ; elle se vérifie par capture ou exemplaire.</span>
    <div class="btnrow"><button class="btn sm" type="button" data-act="rcovadd" data-id="${a.id}">Déclarer la retombée</button><button class="btn ghost sm" type="button" data-act="form" data-v="">Annuler</button></div></div>`:"";
  return `<div class="vers"><div class="dhead"><h3>Retombées</h3>${ed&&!form&&r.targets.length?`<button class="btn out sm" type="button" data-act="form" data-v="rcov:${a.id}:">Déclarer une retombée</button>`:""}</div>${add}${rows?`<div class="rows">${rows}</div>`:`<span class="src">Aucune retombée déclarée.</span>`}</div>`;
}
function rpInternal(a){
  const r=rpOf(a),ed=rpEd(a),dir=me()===rpDir(),f=S.form||"",picking=f==="rtpick:"+a.id||f.startsWith("rta:"+a.id);
  const inC=k=>r.targets.some(t=>t.k===k);
  const pick=picking?`<div class="card" style="background:var(--soft);padding:14px;gap:10px"><h3 style="font-size:15px">Réseau › Médias & journalistes</h3><div class="rows">${RP_MEDIA.map(m=>{const adding=f==="rta:"+a.id+":"+m.k,dupIn=m.dup&&inC(m.dup);
      return `<div class="irow"><span class="grow"><b>${esc(m.name)}</b> ${m.flag?pill(m.flag[0],m.flag[1]):""}<br><span class="src">${esc(m.type)} · ${m.jour?esc(m.jour):"journaliste non renseigné"} · ${esc(m.hist)}</span>
       ${adding?`<div style="margin-top:8px;display:flex;flex-direction:column;gap:8px">${m.flag?`<div class="callout warn">${I.warn}<span>${esc(m.flag[1])} : ${esc(m.hist)}. L'ajout reste possible, en connaissance de cause.</span></div>`:""}<div class="grid2"><div class="field"><label for="rtP">Priorité</label><select class="in" id="rtP"><option>Haute</option><option selected>Moyenne</option><option>Basse</option></select></div><div class="field"><label for="rtA">Angle</label><select class="in" id="rtA">${r.cad.fields.find(x=>x.k==="angles").v.split(" · ").map(x=>`<option>${esc(x)}</option>`).join("")}</select></div></div><div class="field"><label for="rtW">Pourquoi ce média</label><input class="in" id="rtW"></div><div class="btnrow"><button class="btn sm" type="button" data-act="rtadd" data-id="${a.id}" data-k="${m.k}">${m.flag?"Confirmer l'ajout":"Ajouter à la campagne"}</button><button class="btn ghost sm" type="button" data-act="form" data-v="rtpick:${a.id}">Annuler</button></div></div>`:""}</span>
       ${inC(m.k)?`<span class="src">Déjà ciblé</span>`:dupIn?`<span class="src">Déjà ciblé sous « ${esc(rpMedia(m.dup).name)} »</span>`:adding?"":`<button class="btn out sm" type="button" data-act="form" data-v="rta:${a.id}:${m.k}">Ajouter</button>`}</div>`;}).join("")}</div><div><button class="btn ghost sm" type="button" data-act="form" data-v="">Fermer</button></div></div>`:"";
  const t=r.tpl;let tpl="";
  if(r.targets.length){
    if(!t) tpl=ed?`<div class="btnrow"><button class="btn out sm" type="button" data-act="rtpl" data-id="${a.id}">Préparer le modèle commun</button></div>`:"";
    else{const st=t.status==="ok"?["ok","Validé"]:t.status==="review"?["info","À valider"]:t.status==="changes"?["warn","Corrections demandées"]:["","Brouillon"];
      let ta2="";
      if(ed&&["draft","changes"].includes(t.status)) ta2=`${t.note?`<span class="cap warnc">${esc(t.note)}</span>`:""}<div class="field"><label for="rtS">Objet</label><input class="in" id="rtS" value="${esc(t.subject)}"></div><div class="field"><label for="rtB">Message</label><textarea class="in" id="rtB" rows="6">${esc(t.body)}</textarea><span class="src">{accroche} est remplacée par l'accroche de chaque média.</span></div><div class="btnrow"><button class="btn sm" type="button" data-act="rtplsub" data-id="${a.id}">Soumettre à ${esc(nameOf(rpDir()))}</button></div>`;
      else if(t.status==="review"&&dir) ta2=`<p class="note"><b>${esc(t.subject)}</b><br>${esc(t.body).replace(/\n/g,"<br>")}</p>${ta("rtN","Commentaire","Obligatoire pour demander des corrections")}<div class="btnrow"><button class="btn sm" type="button" data-act="rtpldec" data-id="${a.id}" data-v="ok">Valider le modèle</button><button class="btn out sm" type="button" data-act="rtpldec" data-id="${a.id}" data-v="changes">Demander des corrections</button></div>`;
      else ta2=`<p class="note"><b>${esc(t.subject)}</b><br>${esc(t.body).replace(/\n/g,"<br>")}</p>${t.status==="review"?waitRow(rpDir(),"valider le modèle commun"):""}${t.status==="ok"&&ed&&r.targets.some(x=>!x.msgs.length)?`<div><button class="btn sm" type="button" data-act="rdrafts" data-id="${a.id}">Préparer un brouillon par média</button></div>`:""}`;
      tpl=`<div class="vers"><div class="dhead"><h3>Modèle commun</h3>${pill(st[0],st[1])}</div>${ta2}</div>`;}
  }
  const n=x=>r.targets.filter(x).length,msgs=r.targets.flatMap(t=>t.msgs),opps=r.opps;
  const bil=r.targets.length?`<div class="vers"><h3>Bilan RP</h3><div class="statgrid">${[["Médias ciblés",r.targets.length],["Messages envoyés",msgs.filter(m=>m.status==="sent").length],["Réponses positives",n(t=>t.resp==="positive")],["Interviews réalisées",opps.filter(o=>["done","diffused"].includes(o.stage)).length],["Diffusions déclarées",opps.filter(o=>o.stage==="diffused").length],["Retombées vérifiées",`${r.cov.filter(c=>c.status==="verified").length} sur ${r.cov.length}`],["Preuves manquantes",r.cov.filter(c=>c.status!=="verified").length+opps.filter(o=>o.stage==="diffused"&&!r.cov.some(c=>c.opp===o.id)).length]].map(([k,v])=>`<div class="stat"><span class="k">${esc(k)}</span><b class="num">${v}</b></div>`).join("")}</div>
     ${ed&&r.cov.some(c=>c.status==="verified")&&!(a.snaps||[]).some(x=>x.rpCov===r.cov.filter(c=>c.status==="verified").length)?`<div><button class="btn out sm" type="button" data-act="rstats" data-id="${a.id}">Reprendre les retombées vérifiées dans les statistiques</button></div>`:""}</div>`:"";
  return `<div class="vers mod"><div class="dhead"><h3>Relations presse · gestion interne</h3>${ed&&!picking?`<button class="btn out sm" type="button" data-act="form" data-v="rtpick:${a.id}">Ajouter des médias</button>`:""}</div>
    ${pick}${tpl}${r.targets.length?`<div class="vers"><h3>Médias ciblés · ${r.targets.length}</h3>${r.targets.map(t=>rpTarget(a,t)).join("")}</div>`:`<p class="note">Aucun média ciblé. Ajoutez-les depuis le Réseau : leurs coordonnées, refus et campagnes passées vous suivent.</p>`}
    ${opps.map(o=>rpOppCard(a,o)).join("")}${rpCoverage(a)}${bil}</div>`;
}
function rpSection(a){
  if(a.kind!=="Relations presse") return "";
  const r=rpOf(a),ed=rpEd(a),k=r.kit;
  const transmit=a.mode==="Agence externe"?`<div class="vers mod"><h3>Transmission à ${esc(AG_CFG.rp.agency)}</h3>${k.sent?`<span class="src">Cadrage et dossier V${k.sent.v} ${esc(k.sent.how)} le ${esc(k.sent.at)}. L'agence n'a pas de compte et ne voit rien d'autre.</span>`:k.status==="ok"&&ed?`<span class="src">L'agence n'a pas de compte : envoyez-lui le cadrage et le dossier V${k.v} hors PDS OS, puis déclarez-le.</span><div class="btnrow"><button class="btn sm" type="button" data-act="rktransmit" data-id="${a.id}">Marquer comme transmis</button></div>`:`<span class="src">Le dossier de presse doit être validé avant d'être transmis.</span>`}</div>`:"";
  return `${rpCadrage(a)}${rpKit(a)}${a.mode==="Agence externe"?transmit+agencySection(a):rpInternal(a)}`;
}
/* Next gestures of a press campaign, for « Maintenant » and Travail. */
function rpNext(a){
  if(a.kind!=="Relations presse"||!a.rp) return [];
  const r=a.rp,R=a.resp||holder("project"),D=rpDir(),l=[];
  if(r.cad.status==="review") l.push({r:D,todo:"Valider le cadrage RP"});else if(r.cad.status!=="ok") l.push({r:R,todo:"Soumettre le cadrage RP"});
  if(r.kit.status==="review") l.push({r:D,todo:`Valider le dossier de presse V${r.kit.v}`});else if(r.kit.status!=="ok"&&r.cad.status==="ok") l.push({r:R,todo:`Compléter le dossier de presse V${r.kit.v}`});
  if(a.mode==="Agence externe"){if(r.kit.status==="ok"&&!r.kit.sent) l.push({r:R,todo:"Transmettre le dossier à l'agence"});return l;}
  if(r.tpl&&r.tpl.status==="review") l.push({r:D,todo:"Valider le modèle commun"});
  r.targets.forEach(t=>{const n=rpMsgNext(a,t);if(n) l.push({r:n.r,todo:`${n.todo} · ${rpMedia(t.k).name}`});});
  r.opps.forEach(o=>{const m=rpMedia(o.t).name,todo={proposed:"Noter une disponibilité",avail:"Confirmer le créneau",done:"Déclarer la diffusion"}[o.stage]||(o.stage==="confirmed"&&fromIso(o.slot.d)<=new Date(...S.base)?"Marquer l'interview réalisée":null);if(todo) l.push({r:R,todo:`${todo} · ${m}`});});
  const v=r.cov.filter(c=>c.status==="declared").length;if(v) l.push({r:D,todo:`Vérifier ${v} retombée${v>1?"s":""}`});
  return l;
}

/* ======================================================================
   Organisation de la préproduction (ticket « Workflow Production complet »,
   § 1 et § 5) : trois façons de s'organiser, puis des points tranchés un par
   un ; les actions ne deviennent des tâches qu'à l'approbation du plan.
   ====================================================================== */
const PREP_MODES=[["po","Préparer directement avec PO","PO propose les points à trancher d'après la fiche ; vous les confirmez un par un."],["call","Préparer un call de production","PO prépare l'ordre du jour ; après le call, il propose ce qui a été dit, avec la phrase exacte."],["import","Importer une organisation existante","Un planning ou un document déjà fait : PO en tire les points, vous les confirmez."]];
const PREP_TITLE={po:"Préparation avec PO",call:"Call de production",import:"Organisation importée"};
const PREP_KIND={decision:["ok","Décision"],hypothesis:["info","Hypothèse"],action:["","Action proposée"],arbitrate:["warn","Point à arbitrer"]};
const prepLiv=k=>k==="clip"||k==="teasers";
const isExtClip=k=>k==="clip"&&prodOf(k)&&prodOf(k).mode==="ext";
const isMeet=k=>k==="strat"||k==="frame"||k==="design";
const prepOf=k=>{const p=isMeet(k)?S:prodOf(k),key=k==="strat"?"stratPrep":k==="frame"?"framePrep":k==="design"?"designPrep":"prep";return p[key]||(p[key]={org:null,call:null,doc:null,items:[],plan:null});};
const livName=k=>k==="strat"?"Stratégie":k==="frame"?"Cadrage":k==="design"?"Conception":ficheByKey(k).name;
const callWord=k=>isMeet(k)?"échange":"call";
const modeLabel=(k,o)=>isMeet(k)?(o==="call"?(k==="design"?"Préparer un échange créatif":"Préparer un échange"):"Commencer directement"):PREP_MODES.find(m=>m[0]===o)[1];
const prepOrg=k=>prodOf(k)&&prodOf(k).prep?prodOf(k).prep.org:null;
const prepTitle=k=>prepOrg(k)?PREP_TITLE[prepOrg(k)]:"Organisation de la préproduction";
const prepDay=c=>c?`${c.date.slice(8)}/${c.date.slice(5,7)}`:"";
function prepOrigin(k){const p=prepOf(k);return p.org==="call"?`Call de production du ${prepDay(p.call)}`:p.org==="import"?`Organisation importée (${p.doc?p.doc.name:"document"})`:"Préparation avec PO";}
/* What PO takes from the call, the fiche or the imported document (data of « Néons »). */
const PREP_POINTS={
  clip:[
    {topic:"Découpage et mise en scène",kind:"decision",text:"Plan-séquence d'ouverture au steadicam, puis plans serrés sur le refrain",quote:"On ouvre en plan-séquence, et on serre sur le refrain.",src:"Fiche Livrable › Concept"},
    {topic:"Son",kind:"decision",text:"Playback sur le master, avec une voix témoin enregistrée sur place",quote:"On reste en playback, on garde juste une voix témoin.",src:"Fiche Livrable › Durée et formats"},
    {topic:"Lieu et lumière",kind:"hypothesis",text:"Toit d'un parking du 13e, si l'autorisation arrive avant le 20/11",quote:"Le toit du parking, si on a l'autorisation à temps.",src:"Fiche Livrable › Points à préciser"},
    {topic:"Équipe",kind:"action",text:"Confirmer un chef opérateur et un ingénieur du son",quote:"Tom, tu nous confirmes le chef op et l'ingé son ?",src:"Fiche Livrable › Points à préciser",r:"charge",due:"13/11"},
    {topic:"Matériel",kind:"action",text:"Demander un devis de location de tubes LED",quote:"Il nous faut un devis pour les tubes LED.",src:"Brief créatif › Lumière",r:"charge",due:"12/11"},
    {topic:"Planning et budget",kind:"arbitrate",text:"Une ou deux nuits de tournage : le budget prévu n'en couvre qu'une",quote:"Deux nuits, ce serait mieux, mais le budget…",src:"Fiche Livrable › Budget prévisionnel"}],
  teasers:[
    {topic:"Montage",kind:"decision",text:"Quatre teasers de 15 s tirés des rushes du clip",quote:"On part sur quatre teasers de quinze secondes.",src:"Fiche Livrable › Série"},
    {topic:"Fichiers",kind:"action",text:"Exporter les rushes retenus pour le monteur",quote:"Tom, tu prépares les rushes pour le monteur ?",src:"Fiche Livrable › Dépendances",r:"charge",due:"20/11"},
    {topic:"Sous-titres",kind:"arbitrate",text:"Sous-titres incrustés ou fichiers séparés",quote:"Incrustés ou pas, il faut trancher.",src:"Fiche Livrable › Sous-titres"}]
};
const PREP_CALL={
  ext:{get goal(){return `Présenter le projet à ${nameOf(holder("exec")||"societe")} et cadrer le devis : attentes, contraintes, enveloppe.`;},get who(){return [["Production",holder("exec")||"societe"],["Projet","cp"],["Production PDS","charge"],["Création","da"]];},agenda:["Le projet et le Brief créatif","Contraintes : dates, lieu, enveloppe","Ce que le devis doit contenir","Prochaines étapes"]},
  design:{goal:"Fixer ce que la sortie et chaque livrable racontent, et à quoi ils ressemblent.",get who(){return [["Création",holder("creative")||"da"],["Projet","cp"],["Artiste","artist"]];},get agenda(){return ["Direction de la sortie"].concat(S.design.fiches.map(f=>`Intentions : ${f.name}`),["Références"]);}},
  frame:{goal:"Cadrer « Néons » : objectif, temporalité, budget, équipe, état de départ et cadre juridique.",who:[["Projet","cp"],["Direction","dg"],["Management","mgmt"]],get agenda(){return FR_DIMS.filter(([d])=>frOf().items.some(x=>x.d===d&&["missing","confirm"].includes(x.st))).map(x=>x[2]);}},
  strat:{goal:"Cadrer la sortie de « Néons » : positionnement, publics, narratif, dispositif, livrables, calendrier, budget et objectifs.",who:[["Projet","cp"],["Direction","dg"],["Création","da"]],get agenda(){return dims().map(d=>d.name);}},
  int:{goal:"Trancher réalisation, son, lieu, équipe, matériel, planning et budget avant toute réservation.",who:[["Projet","cp"],["Production","charge"],["Création et réalisation","da"]],agenda:null}
};
/* Who is in a call: prefilled by function from « Qui fait quoi », then corrected (people are ids, never typed names). */
const callWho=(c,cfg)=>c.who||(c.who=cfg.who.map(([fn,k])=>({k,fn})));
const callCfg=k=>PREP_CALL[isMeet(k)?k:isExtClip(k)?"ext":"int"];
const whoTag=k=>P[k].where==="app"?"Équipe":P[k].where==="lien"?"Invitation sur son lien privé":"Invitation par e-mail";
const whoLine=l=>l.map(x=>`${esc(x.fn)} : ${esc(nameOf(x.k))}`).join(" · ");
const CALL_POOL_BASE=["cp","charge","dg","da","societe","realExt","mgmt","editor","artist","presse"];
const isMail=v=>/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(v);
function prepItems(k){
  const p=prepOf(k),from=prepOrigin(k),call=p.org==="call";
  const src=x=>call?null:p.org==="po"?`Proposé par PO d'après ${x}`:`${p.doc.name} · ${x}`;
  if(isExtClip(k)){const shift=call&&p.call.date?Math.round((fromIso(p.call.date)-fromIso("2026-10-15"))/864e5):0;
    const due=d=>{if(!d||!shift) return d;const x=fromIso(`2026-${d.slice(3)}-${d.slice(0,2)}`);x.setDate(x.getDate()+shift);return `${String(x.getDate()).padStart(2,"0")}/${String(x.getMonth()+1).padStart(2,"0")}`;};
    return KICK_PROPS.filter(x=>!(holder("director")&&x.text==="Proposer un réalisateur")).map((x,i)=>({id:"kp"+i,text:x.text,quote:call?x.quote:null,from,src:src(call?"":"la Fiche Livrable et le Brief créatif"),r:x.r==="societe"?holder("exec")||x.r:x.r,due:due(x.due),state:"proposed"}));}
  return (PREP_POINTS[k]||[]).filter(x=>!call||p.call.agenda.includes(x.topic)).map((x,i)=>({id:`pp${k}${i}`,topic:x.topic,kind:x.kind,text:x.text,quote:call?x.quote:null,from,src:src(p.org==="po"?x.src:x.topic),r:x.r||null,due:x.due||null,state:"proposed"}));
}
function prepReveal(k){if(k==="frame"){frReveal();return;}if(k==="design"){const c=prepOf(k).call,d=S.design;d.call={date:c.date,fmt:c.fmt,by:c.created.by,at:c.created.at};d.callDone=true;d.items=designItems().map(x=>({...x,from:`Échange créatif du ${prepDay(c)}`})).concat(d.items.filter(x=>x.manual));if(!d.refs.length) d.refs=seedRefs();return;}if(k==="strat"){const c=prepOf(k).call,from=c&&c.held?`Échange stratégique du ${prepDay(c)}`:"Commencée directement";S.strat.items=c&&c.held?stratItems().map(x=>({...x,from})):[];return;}if(isExtClip(k)) S.kick.items=prepItems(k);else prepOf(k).items=prepItems(k);}
const prepReady=k=>{if(isMeet(k)){const p=prepOf(k);return p.org==="po"||(p.org==="call"&&!!(p.call&&p.call.held));}const p=prepOf(k);return p.org==="po"||(p.org==="call"&&p.call&&p.call.held)||(p.org==="import"&&!!p.doc);};
function prepModeField(k,name){
  return `<fieldset class="pick orgset${S.err[name]?" bad":""}"><legend><b>Comment organiser la préproduction ?</b> *</legend><div class="opts">${PREP_MODES.map(([m,l,d])=>`<label class="opt"><input type="radio" name="${name}" value="${m}" ${S.pqDraft&&S.pqDraft.k===k&&S.pqDraft.org===m&&name==="pqOrg"?"checked":""}><span class="grow"><b>${esc(l)}</b><br><span class="src">${esc(d)}</span></span></label>`).join("")}</div>${errOf(name)}<span class="src">Ce choix ne déclenche rien à l'extérieur.</span></fieldset>`;
}
/* Before the proposals: the choice, the call to prepare and to hold, or the document to import. */
function prepGate(k){
  const p=prepOf(k),ed=can("project"),f=ficheByKey(k);
  if(!p.org) return ed?`${prepModeField(k,"prepMode")}<div class="btnrow"><button class="btn" type="button" data-act="prepset" data-k="${k}">Confirmer</button></div>`:waitRow(holder("project"),"choisir comment organiser la préproduction");
  const decided=isExtClip(k)?S.kick.items.some(x=>x.state!=="proposed"):p.items.some(x=>x.state!=="proposed");
  const head=callFacts([[isMeet(k)?"Départ":"Organisation",`${esc(modeLabel(k,p.org))} <span class="src">· choisi par ${esc(p.orgBy)} le ${esc(p.orgAt)}</span>${ed&&!decided&&!(p.call&&p.call.created)&&!p.doc?` <button class="btn ghost sm" type="button" data-act="prepreset" data-k="${k}">Changer</button>`:""}`]]);
  if(p.org==="call"){
    const cfg=callCfg(k),c=p.call||(p.call={agenda:(cfg.agenda||(PREP_POINTS[k]||[]).map(x=>x.topic)).slice()});
    if(!c.created){
      const who=callWho(c,cfg),pool=CALL_POOL_BASE.concat(S.newPeople||[]).filter(x=>P[x]&&!who.some(y=>y.k===x));
      const ext=who.filter(x=>P[x.k].where!=="app");
      const people=`<div class="field"><label for="pcWhoQ">Participants *</label><div class="attend">${whoChips(k,who,ed)}
        ${ed&&pool.length?`<div class="sugg" role="listbox" aria-label="Personnes à inviter">${pool.map(x=>`<button type="button" role="option" data-act="prepwhoadd" data-k="${k}" data-v="${x}" data-q="${esc((nameOf(x)+" "+P[x].role).toLowerCase())}" data-n="${esc(nameOf(x).toLowerCase())}">${av(x,true)}<span class="grow"><b>${esc(nameOf(x))}</b> <span class="src">· ${esc(P[x].role)}</span></span><span class="src">${P[x].where==="app"?"Équipe":"Externe"}</span></button>`).join("")}<button type="button" class="newwho" data-act="prepwhonew" data-k="${k}" hidden></button></div>`:""}</div>${errOf("pcWhoList")}
        ${ext.length?`<span class="src">Externes : ${ext.map(x=>`${esc(nameOf(x.k))} (${P[x.k].where==="lien"?"invitation sur son lien privé":"invitation par e-mail"})`).join(", ")}.</span>`:""}</div>`;
      const facts=k==="design"?callFacts([["Objectif",esc(cfg.goal)],["Livrables",esc(S.design.fiches.map(f=>f.name).join(", "))],["Documents","Brief de sortie V1 · Fiches Livrables"]]):k==="frame"?callFacts([["Objectif",esc(cfg.goal)],["Documents","Fiche projet · Catalogue · échanges avec Jade Petit"],["Sujets","Ce qui manque ou reste à confirmer, dimension par dimension"]]):k==="strat"?callFacts([["Objectif",esc(cfg.goal)],["Documents","Brief de cadrage validé · Fiche artiste de Mona Lys"],["Sujets","Les 8 dimensions de la Stratégie, une par point de l'ordre du jour"]]):callFacts([["Objectif",esc(cfg.goal)],["Documents",`Fiche Livrable « ${esc(f.name)} » V${f.transferred.v} · Brief créatif V1 · ${S.design.refs.filter(r=>r.validated&&r.groups.includes(f.name)).length} références validées`],["Points ouverts",`${esc(fieldText(f.fields.find(x=>x.k==="open"))||"Aucun")} <span class="src">· Fiche Livrable › Points à préciser</span>`]]);
      if(!ed) return head+facts+people+waitRow(holder("project"),"préparer le call de production");
      if(S.form==="recap:"+k&&c.draft) return `${head}<div class="vers"><h3>Récapitulatif avant création</h3>${callFacts([["Quand",`${esc(fullDate(fromIso(c.draft.date)))} à ${esc(c.draft.h)} · ${esc(c.draft.fmt)}`],["Participants",whoChips(k,who,false)],["Ordre du jour",c.agenda.map((x,i)=>`${i+1}. ${esc(x)}`).join(" · ")],["Objectif",esc(cfg.goal)]])}
        <span class="src">${ext.length?`Les invitations partent à la confirmation : ${ext.map(x=>esc(nameOf(x.k))).join(", ")} ${ext.length>1?"sont externes":"est externe"}.`:"Les invitations partent à la confirmation."}</span>
        <div class="btnrow"><button class="btn" type="button" data-act="prepconfirm" data-k="${k}">Confirmer et inviter</button><button class="btn ghost" type="button" data-act="form" data-v="">Modifier</button></div></div>`;
      const dr=c.draft||{};
      return `${head}<div class="vers"><h3>${isMeet(k)?"Nouvel échange":"Nouveau call"}</h3>${people}
        <div class="grid3"><div class="field"><label for="pcDate">Date *</label><input class="in" type="date" id="pcDate" value="${esc(dr.date||"")}">${errOf("pcDate")}</div><div class="field"><label for="pcHour">Heure *</label><input class="in" type="time" id="pcHour" value="${esc(dr.h||"")}">${errOf("pcHour")}</div><div class="field"><label for="pcFmt">Format</label><select class="in" id="pcFmt"><option ${dr.fmt==="Sur place"?"":"selected"}>Visio</option><option ${dr.fmt==="Sur place"?"selected":""}>Sur place</option></select></div></div>
        <div class="vers"><h3>Ordre du jour</h3><div class="rows">${c.agenda.map((x,i)=>agendaRow(k,x,i)).join("")}</div>
         <div class="btnrow"><input class="in" id="pcAdd" placeholder="Ajouter un point" style="flex:1 1 220px"><button class="btn out sm" type="button" data-act="prepagadd" data-k="${k}">Ajouter</button></div>${errOf("pcAdd")}</div>
        <div class="vers"><h3>Envoyé avec l'invitation</h3>${facts}${isExtClip(k)||isMeet(k)?"":`<span class="src">Les équipes image et son se désignent à l'étape « Équipes et matériel » ; invitez-les ici si elles sont déjà connues.</span>`}</div>
        <div class="btnrow"><button class="btn" type="button" data-act="prepcreate" data-k="${k}">Voir le récapitulatif</button></div></div>`;
    }
    if(!c.held) return `${head}${callFacts([[isMeet(k)?"Échange prévu":"Call prévu",`${esc(fullDate(fromIso(c.date)))} à ${esc(c.h)} · ${esc(c.fmt)} <span class="src">· créé par ${esc(c.created.by)} le ${esc(c.created.at)}</span>`],...(c.meet?[["Lien de la visio",`<a href="#" data-act="nolink">${esc(c.meet)}</a>`]]:[]),["Participants",whoChips(k,callWho(c,cfg),false)],["Ordre du jour",c.agenda.map((x,i)=>`${i+1}. ${esc(x)}`).join(" · ")]])}
      <p class="note">L'${callWord(k)} s'enregistre dans PDS OS. À la fin, PO propose ce qui a été dit, point par point, avec la phrase exacte.</p>${ed?`<div><button class="protobtn" type="button" data-act="prepheld" data-k="${k}">Proto : ${isMeet(k)?"l'échange":"le call"} a eu lieu, compte rendu reçu</button></div>`:""}`;
    return "";
  }
  if(p.org==="import"&&!p.doc){
    if(!ed) return head+waitRow(holder("project"),"importer l'organisation existante");
    return `${head}<div class="vers"><h3>Importer l'organisation</h3><label class="drop" for="pdFile"><input class="sr" type="file" id="pdFile" accept=".pdf,.xlsx,.xls,.csv,.docx"><span class="grow">Glissez un planning ou un document d'organisation, ou <u>choisissez-le</u><br><span class="src">PDF, Excel ou Word. Le fichier est gardé tel quel, en lecture seule.</span></span></label>${errOf("pdFile")}
      <div class="btnrow"><button class="btn" type="button" data-act="prepdoc" data-k="${k}">Importer</button><button class="btn ghost sm" type="button" data-act="prepdoc" data-k="${k}" data-v="sample">Utiliser un document d'exemple</button></div></div>`;
  }
  return "";
}
/* The internal production's call step: proposals by kind, then the preproduction plan. */
function prepBody(s){
  const k=s.liv,p=prepOf(k),ed=can("project"),gate=prepGate(k);
  if(gate||!prepReady(k)) return gate;
  const it=p.items,open=it.filter(x=>x.state==="proposed").length,kept=it.filter(x=>x.state==="kept"),by=kd=>kept.filter(x=>x.kind===kd);
  const head=callFacts([["Organisation",`${esc(PREP_MODES.find(m=>m[0]===p.org)[1])}${p.org==="call"?` · ${esc(fullDate(fromIso(p.call.date)))} à ${esc(p.call.h)}`:p.org==="import"?` · <a href="#" data-act="nolink">${esc(p.doc.name)}</a>${p.doc.size?` <span class="src">· ${esc(fileLine(p.doc).slice(p.doc.name.length+3))}</span>`:""}`:""}`]].concat(p.org==="call"?[["Compte rendu",`${crBtn("prep:"+k)}`]]:[]));
  const rows=it.map(x=>itemRow(x,ed&&!p.plan,`${PREP_KIND[x.kind][1]} · ${esc(x.topic)}${x.r?` · ${esc(nameOf(x.r))}${x.due?" · pour le "+esc(x.due):""}`:""}`)).join("");
  const list=versionCard("prep"+k,!p.plan,p.org==="call"?"Ce qui a été dit, point par point":"Points proposés",open?pill("warn",`${open} à confirmer`):pill("ok","Tout est tranché"),"",(ed&&!p.plan?groupHead("prep:"+k,"Points","Ajouter un point",true):"")+`<div class="rows">${rows}</div>`);
  const silent=p.org==="call"?p.call.agenda.filter(t=>!it.some(x=>x.topic===t)):[];
  const quiet=silent.length?`<p class="note">Rien n'a été dit pendant le call sur : ${silent.map(esc).join(", ")}.</p>`:"";
  if(open) return `${head}${poBox(p.org==="call"?"PO a rangé le call par point de l'ordre du jour : décision, hypothèse, action proposée ou point à arbitrer. Confirmez, corrigez ou écartez chacun.":"PO propose un point par sujet. Confirmez, corrigez ou écartez chacun.")}${list}${quiet}`;
  const sec=(t,l,fmt)=>l.length?`<div><b>${t}</b><ul class="hist">${l.map(x=>`<li><span class="noc">•</span><span>${fmt(x)}</span></li>`).join("")}</ul></div>`:"";
  const plan=`<div class="vers"><h3>Plan de préproduction</h3>
    ${sec("Décisions",by("decision"),x=>`${esc(x.topic)} : ${esc(x.text)}`)}
    ${sec("Hypothèses à vérifier",by("hypothesis"),x=>`${esc(x.topic)} : ${esc(x.text)}`)}
    ${sec(p.plan?"Tâches créées":"Actions, qui deviendront des tâches",by("action"),x=>`${esc(x.text)} · ${esc(nameOf(x.r)||"à attribuer")}${x.due?" · pour le "+esc(x.due):""}`)}
    ${sec("Points à arbitrer",by("arbitrate"),x=>`${esc(x.topic)} : ${esc(x.text)}${p.plan?" · dans « Informations à confirmer »":""}`)}
    ${p.plan?`<div class="callout ok">${I.ok}<span><b>Plan approuvé</b> par ${esc(p.plan.by)} le ${esc(p.plan.at)}.</span></div>`:ed?`<span class="src">Rien n'est encore attribué : les actions deviennent des tâches à l'approbation.</span><div class="btnrow"><button class="btn" type="button" data-act="prepplan" data-k="${k}">Approuver le plan de préproduction</button></div>`:waitRow(holder("project"),"approuver le plan de préproduction")}</div>`;
  return `${head}${list}${quiet}${plan}${summaryBlock("prep:"+k)}`;
}
function prepNext(k){
  const p=prepOf(k),R=holder("project");
  if(!p.org) return {r:R,todo:"Choisir comment organiser la préproduction"};
  if(p.org==="call"&&!(p.call&&p.call.created)) return {r:R,todo:"Préparer le call de production"};
  if(p.org==="call"&&!p.call.held) return {r:R,todo:"Tenir le call de production"};
  if(p.org==="import"&&!p.doc) return {r:R,todo:"Importer l'organisation existante"};
  if(isExtClip(k)) return null;
  const n=p.items.filter(x=>x.state==="proposed").length;
  return n?{r:R,todo:`Confirmer ou écarter ${n} point${n>1?"s":""}`}:!p.plan?{r:R,todo:"Approuver le plan de préproduction"}:null;
}

/* ======================================================================
   Compte rendu d'une réunion (ticket Production § 5 : « compte rendu
   structuré ») : ce qui a été dit, point par point, cité tel quel, et ce
   qui en a été fait dans l'étape. Même lecture pour les trois réunions.
   ====================================================================== */
const crBtn=v=>`<button class="btn ghost sm" type="button" data-act="cr" data-v="${v}">Lire le compte rendu</button>`;
function crData(v){
  if(v==="strat"){const c=(S.stratPrep||{}).call;return {title:"Échange stratégique",when:c&&c.date?`${fullDate(fromIso(c.date))} à ${c.h}`:"Lun. 05/10/2026 à 14:00",how:`${c&&c.fmt||"Visio"} · 48 min`,who:c?callWho(c,PREP_CALL.strat).map(x=>[x.fn,nameOf(x.k)]):[["Projet","Lina Haddad"],["Direction","Claire Morel"],["Création","Nadia Benali"]],agenda:dims().map(d=>d.name),items:S.strat.items.map(x=>({...x,topic:x.dim}))};}
  if(v==="strat_old") return {title:"Échange stratégique",when:"Lun. 05/10/2026 à 14:00",how:"Visio · 48 min",who:[["Projet","Lina Haddad"],["Direction","Claire Morel"],["Création","Nadia Benali"]],agenda:dims().map(d=>d.name),items:S.strat.items.map(x=>({...x,topic:x.dim}))};
  if(v==="design"){const d=S.design;return {title:"Échange créatif",when:d.call?`${fullDate(fromIso(d.call.date))}`:"Ven. 09/10/2026",how:`${d.call?d.call.fmt:"Sur place"} · 55 min`,who:[["Création","Nadia Benali"],["Projet","Lina Haddad"],["Artiste","Mona Lys"]],agenda:designGroups(),items:d.items.map(x=>({...x,topic:x.group}))};}
  if(v==="kick"){const c=prodOf("clip")&&prodOf("clip").prep&&prodOf("clip").prep.call;return {title:"Call de production",when:c&&c.date?`${fullDate(fromIso(c.date))} à ${c.h}`:"Jeu. 15/10/2026 à 14:00",how:`${c&&c.fmt||"Visio"} · 52 min`,who:(c?callWho(c,PREP_CALL.ext):PREP_CALL.ext.who.map(([fn,k])=>({k,fn}))).map(x=>[x.fn,nameOf(x.k)]),agenda:c&&c.agenda||PREP_CALL.ext.agenda,items:S.kick.items.map(x=>({...x,kind:"action",topic:null})),loose:"Tâches dites pendant le call"};}
  const k=v.slice(5),p=prepOf(k);return {title:"Call de production",when:`${fullDate(fromIso(p.call.date))} à ${p.call.h}`,how:p.call.fmt,who:callWho(p.call,PREP_CALL.int).map(x=>[x.fn,nameOf(x.k)]),agenda:p.call.agenda,items:p.items};
}
function crLine(x){
  const st=x.state==="kept"?(x.edited?["ok",`Corrigé et confirmé par ${x.edited}`]:["ok",`Confirmé par ${x.by}`]):x.state==="discarded"?["",`Écarté par ${x.by}`]:["warn","À confirmer"];
  return `<div class="irow"><span class="grow">${x.kind?`<span class="cap">${esc(PREP_KIND[x.kind][1])}${x.r?` · ${esc(nameOf(x.r))}${x.due?" · pour le "+esc(x.due):""}`:""}</span><br>`:""}<b class="${x.state==="discarded"?"strike":""}">${esc(x.orig||x.text)}</b>${x.quote?`<br><span class="src">« ${esc(x.quote)} »</span>`:""}${x.orig?`<br><span class="src">Devenu : « ${esc(x.text)} »</span>`:""}</span>${pill(st[0],st[1])}</div>`;
}
function crModal(){
  const v=S.modal.v,d=crData(v),said=d.items.filter(x=>!x.manual),added=d.items.filter(x=>x.manual);
  const sec=(t,l,empty)=>`<div class="vers"><h3>${esc(t)}</h3>${l.length?`<div class="rows">${l.map(crLine).join("")}</div>`:`<p class="note">${empty}</p>`}</div>`;
  const points=(d.agenda||[]).map((t,i)=>d.loose?"":sec(`${i+1}. ${t}`,said.filter(x=>x.topic===t),"Rien n'a été dit sur ce point.")).join("");
  return `<div class="mhead"><h2 id="mtitle">Compte rendu · ${esc(d.title)}</h2><button class="mx" type="button" data-act="modalx" aria-label="Fermer">${I.x}</button></div>
   ${callFacts([["Date",esc(d.when)],["Format",esc(d.how)],["Participants",d.who.map(([f,n])=>`${esc(f)} : ${esc(n)}`).join(" · ")],...(d.loose?[["Ordre du jour",d.agenda.map((t,i)=>`${i+1}. ${esc(t)}`).join(" · ")]]:[]),["Source","Enregistré dans PDS OS, transcrit, puis rangé par PO"]])}
   ${points}${d.loose?sec(d.loose,said,"Aucune tâche dite pendant le call."):""}${added.length?sec("Ajouté après la réunion",added,""):""}
   <p class="note">Les phrases sont citées telles quelles. Ce qui fait foi, ce sont les décisions confirmées dans l'étape.</p>`;
}

/* On an external's private page: the call they are invited to, then only what was asked of them. */
function portalCallsOf(k){
  return Object.keys(S.prods).filter(l=>S.prods[l]&&S.prods[l].prep&&S.prods[l].prep.call&&S.prods[l].prep.call.created).map(l=>[l,S.prods[l].prep.call]).filter(([l,c])=>callWho(c,callCfg(l)).some(x=>x.k===k));
}
const portalInvited=k=>portalCallsOf(k).some(([l,c])=>!c.held)||(k===holder("exec")&&!holder("director")&&S.tasks.some(t=>t.r===k&&t.text==="Proposer un réalisateur"&&t.status!=="done"));
function portalCalls(k){
  return portalCallsOf(k).map(([l,c])=>{
    if(!c.held) return {g:"todo",due:"le "+prepDay(c),html:`<section class="card"><div class="dhead"><h2>Call de production</h2>${pill("info","Invité")}</div>
      ${callFacts([["Quand",`${esc(fullDate(fromIso(c.date)))} à ${esc(c.h)}`],["Où",c.meet?`<a href="#" data-act="nolink">${esc(c.meet)}</a> <span class="src">· visio</span>`:"Chez PDS"],["Participants",whoLine(callWho(c,callCfg(l)))],["Ordre du jour",c.agenda.map((x,i)=>`${i+1}. ${esc(x)}`).join(" · ")]])}
      <span class="src">Invitation envoyée par ${esc(c.created.by)} le ${esc(c.created.at)}.</span></section>`};
    const o=isExtClip(l)?kickOrigin():prepOrigin(l),t=S.tasks.filter(x=>x.origin===o&&x.r===k),settled=isExtClip(l)?!!S.kick.confirmed:!!prepOf(l).plan;
    const open=t.filter(x=>x.status!=="done");
    return {g:!settled?"wait":open.length?"todo":"done",due:open[0]&&open[0].due?"pour le "+open[0].due:null,html:`<section class="card"><div class="dhead"><h2>Call de production du ${esc(prepDay(c))}</h2>${pill(open.length&&settled?"info":"ok",open.length&&settled?"À vous":"Fait")}</div>
      ${summaryFor(isExtClip(l)?"kick":"prep:"+l,k)}${!settled?`<p class="note">PDS confirme les suites du call ; ce qui vous concerne apparaîtra ici.</p>`:t.length?`<div class="vers"><h3>Ce qui vous a été demandé</h3><div class="rows">${t.map(x=>`<div class="irow"><span class="grow"><b>${esc(x.text)}</b>${x.due?` · pour le ${esc(x.due)}`:""}<br><span class="src">${x.status==="done"&&x.doneBy?esc(x.doneBy[0].toUpperCase()+x.doneBy.slice(1)):"Confirmé par PDS après le call"}</span></span>${pill(x.status==="done"?"ok":"info",x.status==="done"?"Fait":"À faire")}</div>`).join("")}</div></div>`:`<p class="note">Rien ne vous a été demandé pendant ce call.</p>`}</section>`};
  });
}
const dueKey=d=>{const m=(d||"").match(/(\d{2})\/(\d{2})/);return m?+m[2]*100+ +m[1]:9999;};
/* Every card of the private page, sorted: yours, waiting for PDS, done. */
function portalCards(k,acts,mineSteps,shown){
  const cards=[portalDirector(k),...portalCalls(k)].filter(Boolean);
  shown.forEach(s=>{const mine=mineSteps.includes(s),done=statusOf(s)==="done",my=acts.filter(a=>a.step===s);
    cards.push({g:mine?"todo":done?"done":"wait",due:my[0]&&my[0].due,html:`<section class="card" id="ps-${s}" style="scroll-margin-top:16px"><div class="dhead"><h2>${esc(STEP(s).title)}</h2>${mine?pill("info","À vous"):pill(done?"ok":"",done?"Fait":"En attente de PDS")}</div>${my.map(a=>`<p class="note"><b>${esc(a.todo)}</b>${a.due?" · "+esc(a.due):""}</p>`).join("")}${BODY[s]()}</section>`});});
  const g=x=>cards.filter(c=>c.g===x);
  const todo=g("todo").sort((a,b)=>dueKey(a.due)-dueKey(b.due)),wait=g("wait"),done=g("done");
  const head=t=>`<h2 class="pgroup">${t}</h2>`;
  return `${todo.length?todo.map(c=>c.html).join(""):""}${wait.length?head("En attente de PDS")+wait.map(c=>c.html).join(""):""}${done.length?`<details class="pdone"><summary>${head(`Fait · ${done.length}`)}</summary><div class="pdonebody">${done.map(c=>c.html).join("")}</div></details>`:""}`;
}

/* Shooting days: the fiche's shooting date, plus every extra day decided since (a call, a note) — never a fixed number. */
function shootDays(){
  const f=ficheByKey("clip"),d0=f?(f.fields.find(x=>x.k==="tournage")||{}).value:null;
  const extra=S.decisions.filter(d=>d.extraDay&&d.kind==="decided"&&!d.discarded);
  const dates=[...new Set([d0,...extra.map(d=>d.extraDay)].filter(Boolean))].sort();
  const n=Math.max(1,dates.length);
  return {n,dates,src:extra.length?`Fiche Livrable › Tournage le, et « ${extra.map(d=>d.text).join(" », « ")} » (décidé)`:"Fiche Livrable › Tournage le"};
}
/* What an external may read about it: the dates, never the internal fiche. */
const shootDaysWhy=()=>{const s=shootDays();return P[me()].where==="app"?`d'après ${s.src}`:s.dates.map(d=>fullDate(fromIso(d))).join(" et ");};
const shootDaysText=()=>{const s=shootDays();return `${s.n} jour${s.n>1?"s":""} de tournage`;};

/* Attendees as in Teams or Outlook: one field of chips, type to find someone, Enter to add, Backspace to remove. */
function whoChips(k,who,ed){
  return `<div class="chips${ed?"":" ro"}">${who.map((x,i)=>{const e=P[x.k].where!=="app";return `<span class="chip" title="${esc(x.fn)} · ${esc(whoTag(x.k))}">${av(x.k,true)}<span>${esc(nameOf(x.k))}</span>${e?`<span class="cap">externe</span>`:""}${ed?`<button type="button" class="chipx" data-act="prepwhodel" data-k="${k}" data-i="${i}" aria-label="Retirer ${esc(nameOf(x.k))}">${I.x}</button>`:""}</span>`;}).join("")}${ed?`<input id="pcWhoQ" class="chipin" placeholder="${who.length?"Ajouter":"Ajouter des participants"}" autocomplete="off">`:""}</div>`;
}
const focusWho=()=>setTimeout(()=>{const i=document.getElementById("pcWhoQ");if(i) i.focus();},0);
document.addEventListener("input",e=>{if(e.target.id!=="pcWhoQ") return;const raw=e.target.value.trim(),q=raw.toLowerCase();
  document.querySelectorAll(".sugg button[data-q]").forEach(b=>{b.hidden=!!q&&!b.dataset.q.includes(q);});
  const n=document.querySelector(".sugg .newwho");if(!n) return;const mail=isMail(raw);
  n.hidden=raw.length<2||[...document.querySelectorAll(".sugg button[data-q]")].some(b=>!b.hidden&&b.dataset.n.split(" ").some(w=>w.startsWith(q)));
  n.dataset.v=raw;n.dataset.mail=mail?"1":"";n.innerHTML=mail?`<span class="avatar sm" aria-hidden="true">@</span><span class="grow"><b>Inviter ${esc(raw)}</b> <span class="src">· par e-mail, une fiche est créée dans le Réseau</span></span>`:`<span class="avatar sm" aria-hidden="true">+</span><span class="grow"><b>Créer la fiche de « ${esc(raw)} »</b> <span class="src">· dans le Réseau, puis l'inviter</span></span>`;});
document.addEventListener("keydown",e=>{if(e.target.id!=="pcWhoQ") return;const vis=[...document.querySelectorAll(".sugg button")].filter(x=>!x.hidden);
  const q=e.target.value.trim().toLowerCase(),named=vis.filter(x=>x.dataset.n),best=named.find(x=>q&&x.dataset.n.split(" ").some(w=>w.startsWith(q)))||named.find(x=>q&&x.dataset.n.includes(q))||(q?vis.find(x=>x.classList.contains("newwho")):null)||vis[0];
  if(e.key==="Enter"&&best){e.preventDefault();best.click();}
  else if(e.key==="ArrowDown"&&vis[0]){e.preventDefault();vis[0].focus();}
  else if(e.key==="Backspace"&&!e.target.value){const x=[...document.querySelectorAll(".chips .chipx")].pop();if(x){e.preventDefault();x.click();}}});

/* The quote's deadline is the one said in the call and confirmed as a task, not a fixed date. */
const quoteDue=()=>{const t=S.tasks.find(x=>x.r==="societe"&&x.text.startsWith("Déposer le devis")&&x.status!=="done");return t&&t.due?`avant le ${t.due}`:null;};

/* Someone outside the Réseau joins a call: their fiche is created first (Réseau), then they are invited. */
function addNetPerson(o){const k="net"+(++uid);P[k]={name:o.name,role:o.role||"Invité",ini:(w=>(w[0][0]+(w[1]?w[1][0]:w[0][1]||"")).toUpperCase())(o.name.split("@")[0].split(/[\s._-]+/).filter(Boolean).concat(["?"])),where:"reseau",email:o.email,org:o.org||null,created:o.by};S.newPeople=(S.newPeople||[]).concat(k);return k;}
function newPersonModal(){
  const m=S.modal;
  if(m.target==="co") return `<div class="mhead"><h2 id="mtitle">Nouvelle société dans le Réseau</h2><button class="mx" type="button" data-act="modalx" aria-label="Fermer">${I.x}</button></div>
   <p class="note">La société est créée dans le Réseau. Si vous la retenez, elle reçoit son lien privé pour le call, le devis et la suite.</p>
   <div class="grid2"><div class="field"><label for="npName">Nom de la société *</label><input class="in" id="npName">${errOf("npName")}</div><div class="field"><label for="npMail">E-mail du contact *</label><input class="in" id="npMail" inputmode="email" placeholder="prenom@societe.fr">${errOf("npMail")}</div>
    <div class="field"><label for="npOrg">Contact</label><input class="in" id="npOrg" placeholder="Ex. : Julie Garnier, productrice"></div></div>
   <div class="btnrow"><button class="btn" type="button" data-act="npok">Créer la société</button><button class="btn ghost" type="button" data-act="modalx">Annuler</button></div>`;
  return `<div class="mhead"><h2 id="mtitle">Nouvelle fiche dans le Réseau</h2><button class="mx" type="button" data-act="modalx" aria-label="Fermer">${I.x}</button></div>
   <p class="note">La personne est créée dans le Réseau, puis invitée au call par e-mail. Elle reste dans le Réseau pour la suite du projet.</p>
   <div class="grid2"><div class="field"><label for="npName">Nom *</label><input class="in" id="npName" value="${esc(m.name||"")}">${errOf("npName")}</div><div class="field"><label for="npMail">E-mail *</label><input class="in" id="npMail" inputmode="email" value="${esc(m.email||"")}" placeholder="prenom@structure.fr">${errOf("npMail")}</div>
    <div class="field"><label for="npOrg">Structure</label><input class="in" id="npOrg" placeholder="Ex. : Studio Ressac"></div><div class="field"><label for="npRole">Fonction dans le call</label><input class="in" id="npRole" placeholder="Ex. : Chef opérateur"></div></div>
   <div class="btnrow"><button class="btn" type="button" data-act="npok">Créer et inviter</button><button class="btn ghost" type="button" data-act="modalx">Annuler</button></div>`;
}

/* Agenda point: edited in place (Enter saves, Escape cancels), icons for the two gestures. */
Object.assign(I,{
  grip:'<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><circle cx="6" cy="4" r="1.2"/><circle cx="10" cy="4" r="1.2"/><circle cx="6" cy="8" r="1.2"/><circle cx="10" cy="8" r="1.2"/><circle cx="6" cy="12" r="1.2"/><circle cx="10" cy="12" r="1.2"/></svg>',
  up:'<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 10l4-4 4 4"/></svg>',
  down:'<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 6l4 4 4-4"/></svg>',
  edit:'<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.5 2.5l3 3L6 13H3v-3z"/><path d="M9 4l3 3"/></svg>',
  trash:'<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 4.5h11M6 4.5V3h4v1.5M4 4.5l.7 9h6.6l.7-9M6.7 7v4M9.3 7v4"/></svg>'});
const ib=(act,label,icon,extra)=>`<button class="ib" type="button" data-act="${act}" ${extra||""} aria-label="${esc(label)}" title="${esc(label.split(" «")[0])}">${icon}</button>`;
function agendaRow(k,x,i){
  if(S.form===`ag:${k}:${i}`) return `<div class="irow"><span class="grow" style="display:flex;align-items:center;gap:8px">${i+1}.<input class="in" id="agE" value="${esc(x)}" data-k="${k}" data-i="${i}" aria-label="Point ${i+1} de l'ordre du jour"></span><span class="iconrow">${ib("prepagsave","Enregistrer",I.check,`data-k="${k}" data-i="${i}"`)}${ib("form","Annuler",I.x,'data-v=""')}</span>${errOf("agE")}</div>`;
  const n=prepOf(k).call.agenda.length;
  return `<div class="irow agrow" draggable="true" data-k="${k}" data-i="${i}"><button class="ib grip" type="button" data-k="${k}" data-i="${i}" aria-label="Déplacer « ${esc(x)} » (flèches haut et bas)" title="Glisser pour déplacer">${I.grip}</button><span class="grow">${i+1}. ${esc(x)}</span><span class="iconrow">${i>0?ib("agmove",`Monter « ${x} »`,I.up,`data-k="${k}" data-i="${i}" data-v="-1" data-touch="1"`):""}${i<n-1?ib("agmove",`Descendre « ${x} »`,I.down,`data-k="${k}" data-i="${i}" data-v="1" data-touch="1"`):""}${ib("form",`Modifier « ${x} »`,I.edit,`data-v="ag:${k}:${i}"`)}${ib("prepagdel",`Retirer « ${x} »`,I.trash,`data-k="${k}" data-i="${i}"`)}</span></div>`;
}
document.addEventListener("keydown",e=>{if(e.target.id!=="agE") return;
  if(e.key==="Enter"){e.preventDefault();document.querySelector('[data-act="prepagsave"]').click();}
  else if(e.key==="Escape"){e.preventDefault();e.stopPropagation();S.form=null;render();}},true);
const focusAgenda=()=>setTimeout(()=>{const i=document.getElementById("agE");if(i){i.focus();i.select();}},0);

/* Reordering agenda points: drag the handle, arrow keys on the handle, or up / down buttons on touch screens. */
function moveAgenda(k,from,to){const a=prepOf(k).call.agenda;if(to<0||to>=a.length||from===to) return false;a.splice(to,0,a.splice(from,1)[0]);return true;}
let agDrag=null,agGrip=false;
document.addEventListener("pointerdown",e=>{agGrip=!!e.target.closest(".grip");},true);
document.addEventListener("dragstart",e=>{const r=e.target.closest&&e.target.closest(".agrow");if(!r) return;if(!agGrip){e.preventDefault();return;}agDrag={k:r.dataset.k,i:+r.dataset.i};r.classList.add("dragging");e.dataTransfer.effectAllowed="move";e.dataTransfer.setData("text/plain",r.dataset.i);});
document.addEventListener("dragover",e=>{const r=e.target.closest&&e.target.closest(".agrow");if(!r||!agDrag) return;e.preventDefault();document.querySelectorAll(".agrow.over").forEach(x=>x.classList.remove("over","before"));const box=r.getBoundingClientRect();r.classList.add("over");r.classList.toggle("before",e.clientY<box.top+box.height/2);});
document.addEventListener("drop",e=>{const r=e.target.closest&&e.target.closest(".agrow");if(!r||!agDrag) return;e.preventDefault();let to=+r.dataset.i;const box=r.getBoundingClientRect();if(e.clientY>=box.top+box.height/2) to++;if(to>agDrag.i) to--;const k=agDrag.k,from=agDrag.i;agDrag=null;if(moveAgenda(k,from,to)) render();else document.querySelectorAll(".agrow").forEach(x=>x.classList.remove("over","before","dragging"));});
document.addEventListener("dragend",()=>{agDrag=null;document.querySelectorAll(".agrow").forEach(x=>x.classList.remove("over","before","dragging"));});
document.addEventListener("keydown",e=>{const g=e.target.closest&&e.target.closest(".grip");if(!g||(e.key!=="ArrowUp"&&e.key!=="ArrowDown")) return;e.preventDefault();const k=g.dataset.k,i=+g.dataset.i,to=i+(e.key==="ArrowUp"?-1:1);
  if(moveAgenda(k,i,to)){render();setTimeout(()=>{const n=document.querySelector(`.grip[data-k="${k}"][data-i="${to}"]`);if(n) n.focus();},0);}});

/* ======================================================================
   Réalisateur proposé par la société (tâche du call) : la société propose
   depuis son lien, la cheffe de projet en retient un, qui reçoit le rôle
   « Réalisation » et son lien privé. Rien n'est désigné sans ce geste.
   ====================================================================== */
const dirOf=()=>S.directors||(S.directors={props:[]});
const DIRSTATE={proposed:["info","Proposé"],retained:["ok","Retenu"],declined:["","Non retenu"]};
function dirRow(x,i,canRetain){
  return `<div class="irow"><span class="grow"><b>${esc(x.name)}</b> · <a href="#" data-act="nolink">${esc(x.reel)}</a>${x.note?`<br><span class="src">« ${esc(x.note)} »</span>`:""}<br><span class="src">Proposé par ${esc(x.by)} le ${esc(x.at)}${x.decidedBy?` · ${x.state==="retained"?"retenu":"non retenu"} par ${esc(x.decidedBy)}`:""}</span></span>
    <span class="btnrow">${pill(DIRSTATE[x.state][0],DIRSTATE[x.state][1])}${canRetain&&x.state==="proposed"?`<button class="btn out sm" type="button" data-act="dirretain" data-i="${i}">Retenir</button>`:""}</span></div>`;
}
/* PDS side (call step, then « Proposition de réalisation » while nobody is designated). */
function directorBlock(){
  const d=dirOf(),r=holder("director");
  if(r&&!d.props.length) return "";
  const head=r?`Réalisation : <b>${esc(nameOf(r))}</b>${(d.props.find(x=>x.state==="retained")||{}).by?" · proposé par "+esc(d.props.find(x=>x.state==="retained").by):""}`:"";
  return `<div class="vers"><h3>Réalisateur</h3>${r?`<p class="note">${head}. Il a son lien privé pour la proposition de réalisation.</p>`:d.props.length?`<p class="note">${esc(nameOf(holder("exec")))} a proposé ${d.props.length>1?"des réalisateurs":"un réalisateur"}. Celui que vous retenez reçoit le rôle « Réalisation » et son lien privé ; les autres sont gardés ici.</p>`:waitRow(holder("exec"),"proposer un réalisateur")}
    ${d.props.length?`<div class="rows">${d.props.map((x,i)=>dirRow(x,i,!r&&can("project"))).join("")}</div>`:""}</div>`;
}
/* Studio side: its private page. */
function portalDirector(k){
  if(k!==holder("exec")) return null;
  const d=dirOf(),r=holder("director");
  const task=S.tasks.find(t=>t.r===k&&t.text==="Proposer un réalisateur");
  if(!r&&!d.props.length&&!task) return null;
  if(r) return d.props.length?{g:"done",html:`<section class="card"><div class="dhead"><h2>Réalisateur</h2>${pill("ok","Retenu")}</div><p class="note">PDS a retenu <b>${esc(nameOf(r))}</b>. Il reçoit son propre lien pour la proposition de réalisation.</p></section>`}:null;
  const pending=d.props.some(x=>x.state==="proposed"),more=!d.props.length||S.form==="dirmore";
  return {g:pending?"wait":"todo",due:task&&task.due?"pour le "+task.due:null,html:`<section class="card" id="ps-director"><div class="dhead"><h2>Proposer un réalisateur</h2>${pending?pill("","Envoyé à PDS"):pill("info","À vous")}</div>
    ${d.props.length?`<div class="rows">${d.props.map((x,i)=>dirRow(x,i,false)).join("")}</div>`:""}
    ${!more?`<div><button class="btn out sm" type="button" data-act="form" data-v="dirmore">Proposer un autre réalisateur</button></div>`:`<div class="vers"><h3>${d.props.length?"Proposer un autre réalisateur":"Votre proposition"}</h3><div class="grid2"><div class="field"><label for="drName">Nom *</label><input class="in" id="drName">${errOf("drName")}</div><div class="field"><label for="drReel">Lien du showreel *</label><input class="in" id="drReel" placeholder="https://vimeo.com/…">${errOf("drReel")}</div></div>
     ${ta("drNote","Pourquoi lui","Ex. : a tourné de nuit pour un clip R&B")}
     <div class="btnrow"><button class="btn" type="button" data-act="dirpropose">Proposer à PDS</button><button class="btn ghost sm" type="button" data-act="dirsample">Remplir avec un exemple</button>${d.props.length?`<button class="btn ghost sm" type="button" data-act="form" data-v="">Annuler</button>`:""}</div></div>`}</section>`};
}
BODY_MK.creative=function(){return holder("director")?BODY.creativeV2():directorBlock()||waitRow(holder("exec"),"proposer un réalisateur");};

/* A task said in the call is done when its real gesture happened (quote deposited, director proposed). */
function syncCallTasks(){syncActProof();
  const q=S.quote&&S.quote.versions[0],d=S.directors&&S.directors.props[0];
  S.tasks.forEach(t=>{if(t.status==="done") return;
    if(q&&t.text.startsWith("Déposer le devis")){t.status="done";t.doneAt=q.at;t.doneBy=`devis V1 déposé le ${q.at}`;}
    else if(t.text==="Proposer un réalisateur"&&(d||holder("director"))){t.status="done";t.doneAt=d?d.at:"";t.doneBy=d?`proposition envoyée le ${d.at}`:"réalisateur déjà désigné";}});
}

/* ======================================================================
   Quelle société ? Choisie dans le Réseau sous « Externe » (suggérée avec sa
   raison, jamais imposée), créée si besoin, changeable avec son historique.
   ====================================================================== */
const CO_INFO={societe:"a produit le précédent clip de Mona Lys",atelier:"trois clips R&B tournés de nuit en 2025",lumenf:"n'a jamais travaillé avec PDS"};
const companies=()=>["societe","atelier","lumenf"].concat(S.newCos||[]).filter(x=>P[x]);
function companyField(k,exclude){
  const d=S.pqDraft&&S.pqDraft.k===k?S.pqDraft.co:null,list=companies().filter(x=>x!==exclude);
  return `<fieldset class="pick coset${S.err.pqCo?" bad":""}"><legend><b>Quelle société ?</b> *</legend><div class="opts">${list.map((x,i)=>`<label class="opt"><input type="radio" name="pqCo" value="${x}" ${(d?d===x:i===0)?"checked":""}><span class="grow"><b>${esc(nameOf(x))}</b>${i===0&&!d&&x==="societe"?` <span class="src">· proposée par PO</span>`:""}<br><span class="src">${esc(CO_INFO[x]?"Réseau · "+CO_INFO[x]:P[x].created?`Créée dans le Réseau par ${P[x].created}`:"Réseau")}</span></span></label>`).join("")}</div>
    ${errOf("pqCo")}<div><button class="btn ghost sm" type="button" data-act="conew" data-k="${k}">Créer la fiche d'une société</button></div></fieldset>`;
}
/* The chosen company becomes the production company of the project (exec, postproduction), with its private link. */
function setCompany(co){
  const old=holder("exec");S.roles.exec=co;if(S.prods.teasers&&S.prods.teasers.mode==="decl") S.prods.teasers.who=co;if(!S.roles.post||S.roles.post===old) S.roles.post=co;
  if(!S.links[co]) S.links[co]={state:"active",n:1};if(!ROLE_ORDER.includes(co)) ROLE_ORDER.splice(ROLE_ORDER.indexOf("societe")+1,0,co);
  ["exec","post"].forEach(sl=>{const s=SLOT(sl);if(s&&!s.pool.includes(co)) s.pool.push(co);});
  if(old&&old!==co){const F=fresh();["quote","creative","locs","ready","shoot","rushes","post","delivery","kick"].forEach(x=>{if(x in F) S[x]=F[x];});if(S.kick) S.kick.items=kickItems();S.directors=null;S.roles.director=null;}
}
const pqDraftRead=k=>({k,mode:(document.querySelector('input[name="pqMode"]:checked')||{}).value,co:(document.querySelector('input[name="pqCo"]:checked')||{}).value,org:(document.querySelector('input[name="pqOrg"]:checked')||{}).value});

/* ======================================================================
   Entrée de la Stratégie (ticket « Workflow Stratégie complet », § 1) : le
   contexte, puis « Commencer la stratégie » ou « Préparer un échange ».
   ====================================================================== */
function stratEntry(){
  const p=prepOf("strat"),ed=can("project");
  if(!p.org) return `${callFacts([["Projet","« Néons » · single de Mona Lys"],["Sortie","Sam. 05/12/2026"],["Statut","Stratégie non commencée"]])}
    ${ed?`<div class="choices2"><button class="choice" type="button" data-act="stratgo" data-v="po"><b>Commencer la stratégie</b><span class="src">Directement sur les 8 dimensions, avec ce que PDS OS sait déjà.</span></button><button class="choice" type="button" data-act="stratgo" data-v="call"><b>Préparer un échange</b><span class="src">Un call avec l'équipe ; PO en tire des propositions pour chaque dimension.</span></button></div>`:waitRow(holder("project"),"démarrer la stratégie")}`;
  return prepGate("strat")||summaryBlock("strat")+callFacts([["Départ",p.org==="call"?`Échange stratégique du ${esc(fullDate(fromIso(p.call.date)))} à ${esc(p.call.h)} ${crBtn("strat")}`:`Commencée directement par ${esc(p.orgBy)} le ${esc(p.orgAt)}`]]);
}
BODY_MK.st1=stratEntry;

/* ======================================================================
   Page Activations (Sacha 18/10 : « j'ai rien compris ») : une liste à gauche,
   une ligne par activation avec sa frise et ce qu'il faut faire ; l'activation
   ouverte à droite ; les leviers à transformer en bandeau. Plus de tableau.
   ====================================================================== */
const PHASES=["Préparer","Réaliser","Prouver","Mesurer","Clôturer"];
function phaseOf(a){
  if(a.status==="closed") return 5;if(a.status==="cancelled") return -1;
  const s=a.status==="suspended"?a.prev:a.status;
  if(!a.resp||!a.due||s==="prep"||s==="ready"||statusOf(a.id)==="blocked") return 0;
  if(s==="run") return 1;if(["todo","contested","given"].includes(a.proof.state)) return 2;if(a.stats.state==="todo") return 3;return 4;
}
function frise(a,big){
  const ph=phaseOf(a);if(ph<0) return `<span class="frise"><span class="phl">Annulée</span></span>`;
  const lab=ph>=5?"Clôturée":PHASES[ph];
  return `<span class="frise${big?" big":""}" role="img" aria-label="Étape : ${lab}">${PHASES.map((p,i)=>`<span class="ph ${i<ph?"done":i===ph?"cur":""}">${big?esc(p):""}</span>`).join("")}${big?"":`<span class="phl">${lab}${a.status==="suspended"?" · suspendue":""}</span>`}</span>`;
}
function actSentence(a){
  if(a.status==="cancelled") return {t:`Annulée : ${a.cancelled.why}`};
  if(a.status==="closed") return {t:`Clôturée${a.stats.value!=null?` · ${fmtN(a.stats.value)} ${a.unit}`:""}`};
  if(statusOf(a.id)==="blocked") return {t:"Attend : Clip officiel livré"};
  const l=actorsOf(a.id),mine=l.find(x=>x.r===me()),x=mine||l[0];if(!x) return {t:"Rien à faire pour l'instant"};
  return {t:`${mine?"À vous":nameOf(x.r)} · ${lcFirst(x.todo)}${l.length>1?` · et ${l.length-1} autre${l.length>2?"s":""}`:""}`,me:!!mine};
}
const ACT_FILTERS=[["mine","À moi",a=>actorsOf(a.id).some(x=>x.r===me())],["open","En cours",a=>!["closed","cancelled"].includes(a.status)],["measure","À mesurer",a=>phaseOf(a)===3],["done","Terminées",a=>["closed","cancelled"].includes(a.status)]];
const shortDate=d=>fullDate(fromIso(d)).replace(/\/\d{4}$/,"");
function leversBanner(){
  const todo=S.actProps.filter(x=>x.state==="proposed"),later=S.actProps.filter(x=>x.state==="later");if(!todo.length&&!later.length) return "";
  const t=todo.length?`${todo.length} levier${todo.length>1?"s":""} du Brief de sortie à transformer en activation${todo.length>1?"s":""}`:`${later.length} levier${later.length>1?"s":""} gardé${later.length>1?"s":""} pour plus tard`;
  return `<details class="card levers" ${todo.length?"open":""}><summary><span class="grow"><b>${t}</b><br><span class="src">Créez l'activation quand vous êtes prêt ; un levier peut attendre.</span></span></summary>${BODY.ac0()}</details>`;
}
function actPage(){
  if(!S.acts.length) return leversBanner()||`<section class="card"><p class="note">Les activations arrivent quand la Stratégie est validée : chaque levier retenu peut en devenir une.</p></section>`;
  const f=ACT_FILTERS.find(x=>x[0]===S.actView)||ACT_FILTERS[1],open=actById(S.sel),list=S.acts.filter(a=>f[2](a)),out=open&&!list.includes(open)?open:null;
  const sel=open||list.find(a=>actorsOf(a.id).some(x=>x.r===me()))||list[0]||S.acts[0];
  const row=(a,hors)=>{const s=actSentence(a);return `<button class="step arow ${a===sel?"sel":""} ${s.me?"me":""}" type="button" data-act="go" data-step="${a.id}"><span class="t">${esc(a.title)}${hors?` <span class="pill">Hors filtre</span>`:""}</span><span class="src">${esc(a.kind)}${a.mode?" · "+esc(a.mode):""} · ${a.resp?esc(nameOf(a.resp)):"responsable à désigner"}${a.due?" · "+esc(shortDate(a.due)):""}</span>${frise(a)}<span class="s">${esc(s.t)}</span></button>`;};
  const rows=list.map(a=>row(a)).join("")+(out?`<p class="cap" style="margin:10px 2px 2px">Ouverte, hors de ce filtre</p>${row(out,true)}`:"");
  return `${leversBanner()}<div class="layout"><nav class="spine alist" aria-label="Activations"><h2>Activations</h2><div class="strip fchips" role="group" aria-label="Filtrer">${ACT_FILTERS.map(([k,l,fn])=>`<button class="chipbtn" type="button" data-act="actview" data-v="${k}" aria-pressed="${f[0]===k}">${l} <span class="t3">${S.acts.filter(fn).length}</span></button>`).join("")}</div>${list.length?"":`<p class="note">Aucune activation ici.</p>`}${rows}</nav>
   <section class="card" aria-labelledby="dtitle">${actDetail(sel)}</section></div>`;
}
function actDetail(a){
  const ex=a.status==="suspended"?["warn","Suspendue"]:a.status==="cancelled"?["","Annulée"]:statusOf(a.id)==="blocked"?["","Bloquée"]:null;
  return `<div class="dhead"><h2 id="dtitle" class="h2">${esc(a.title)}</h2>${ex?pill(ex[0],ex[1]):""}</div>
   <p class="note">${esc(ACT_WHY[a.kind]||"")}</p>${frise(a,true)}
   ${statusOf(a.id)==="blocked"?`<div class="callout">${I.lock}<span>Elle commence quand le Clip officiel est livré.</span></div>`:actBody(a)}`;
}

/* ======================================================================
   Résumé de réunion pour les participants : rédigé par PO à partir de ce qui
   a été tranché (décisions, prochaines étapes), relu et envoyé par la
   cheffe de projet. Jamais de citation, de point écarté ni d'arbitrage interne.
   ====================================================================== */
function meetingOf(v){
  if(v==="design"){const p=S.designPrep;return p&&p.org==="call"&&p.call&&p.call.held?{title:"Échange créatif",call:p.call,cfg:PREP_CALL.design,settled:S.design.items.length>0&&!S.design.items.some(x=>x.state==="proposed")}:null;}
  if(v==="frame"){const p=S.framePrep;return p&&p.org==="call"&&p.call&&p.call.held?{title:"Échange de cadrage",call:p.call,cfg:PREP_CALL.frame,settled:!frOpen().length}:null;}
  if(v==="strat"){const p=S.stratPrep;return p&&p.org==="call"&&p.call&&p.call.held?{title:"Échange stratégique",call:p.call,cfg:PREP_CALL.strat,settled:S.strat.items.length>0&&!S.strat.items.some(x=>x.state==="proposed")}:null;}
  if(v==="kick"){const p=prodOf("clip")&&prodOf("clip").prep;return p&&p.org==="call"&&p.call&&p.call.held?{title:"Call de production",call:p.call,cfg:PREP_CALL.ext,settled:!!S.kick.confirmed}:null;}
  const k=v.slice(5),p=prodOf(k)&&prodOf(k).prep;return p&&p.org==="call"&&p.call&&p.call.held?{title:"Call de production",call:p.call,cfg:PREP_CALL.int,settled:p.items.length>0&&!p.items.some(x=>x.state==="proposed")}:null;
}
const sumOf=v=>(S.summaries||(S.summaries={}))[v]||null;
function sumDraft(v){
  const m=meetingOf(v),day=prepDay(m.call),line=l=>l.map(x=>`— ${x}`).join("\n");
  let parts=[];
  if(v==="design"){parts.push(`Ce que nous retenons :\n${line(S.design.items.filter(x=>x.state==="kept").map(x=>`${x.group} : ${x.text}`))}`);parts.push(`Prochaine étape :\n— ${nameOf(holder("creative"))} soumet la direction artistique à ${nameOf(holder("direction"))}.`);}
  else if(v==="frame"){parts.push(`Ce que nous retenons :\n${line(frOf().items.filter(x=>["ok","known"].includes(x.st)&&x.d!=="budget").map(x=>`${x.label} : ${x.v}`))}`);parts.push(`Prochaine étape :\n— Le Brief de cadrage part en validation auprès de ${nameOf(holder("direction"))}.`);}
  else if(v==="strat"){
    const kept=S.strat.items.filter(x=>x.state==="kept"&&x.dim!=="Budget stratégie");
    parts.push(`Ce que nous retenons :\n${line(kept.map(x=>`${x.dim} : ${x.text}`))}`);
    parts.push(`Prochaine étape :\n— Le Brief de sortie part en validation auprès de ${nameOf(holder("direction"))}.`);
  }else{
    const items=v==="kick"?S.kick.items:prepOf(v.slice(5)).items,kept=items.filter(x=>x.state==="kept"),k=kind=>kept.filter(x=>(x.kind||"action")===kind);
    if(k("decision").length) parts.push(`Décisions :\n${line(k("decision").map(x=>`${x.topic} : ${x.text}`))}`);
    if(k("hypothesis").length) parts.push(`À confirmer :\n${line(k("hypothesis").map(x=>`${x.topic} : ${x.text}`))}`);
    if(k("action").length) parts.push(`Prochaines étapes :\n${line(k("action").map(x=>`${x.text} · ${nameOf(x.r)||"à attribuer"}${x.due?`, pour le ${x.due}`:""}`))}`);
  }
  return `Bonjour à tous,\n\nMerci pour ${v==="strat"?"l'échange":"le call"} du ${day}. Voici ce qui a été décidé.\n\n${parts.join("\n\n")}\n\n${nameOf(holder("project"))}`;
}
const sumTo=v=>callWho(meetingOf(v).call,meetingOf(v).cfg).map(x=>x.k);
const sumHow=k=>P[k].where==="app"?"dans PDS OS":P[k].where==="lien"?"sur son lien privé":"par e-mail";
/* PDS side, in the meeting's step. */
function summaryBlock(v){
  const m=meetingOf(v);if(!m||!m.settled) return "";
  const s=sumOf(v),last=s&&lastOf(s.versions),ed=can("project"),editing=!last||S.form==="sum:"+v;
  const to=sumTo(v),ext=to.filter(k=>P[k].where!=="app");
  if(editing&&ed) return `<div class="vers sumbox"><h3>Résumé pour les participants${last?` · version ${last.n+1}`:""}</h3><p class="note">Préparé par PO à partir de ce qui a été tranché, sans les phrases citées ni ce qui a été écarté. Relisez et corrigez avant d'envoyer.</p>
    <div class="field"><label for="sumText">Message</label><textarea class="in" id="sumText" rows="12">${esc(last&&S.form==="sum:"+v?last.text:sumDraft(v))}</textarea>${errOf("sumText")}</div>
    <div class="field"><b>Destinataires</b>${whoChips(v,callWho(m.call,m.cfg),false)}<span class="src">${ext.length?`${ext.map(k=>`${esc(nameOf(k))} ${sumHow(k)}`).join(", ")} ; l'équipe dans PDS OS.`:"L'équipe le reçoit dans PDS OS."}</span></div>
    <div class="btnrow"><button class="btn" type="button" data-act="sumsend" data-v="${v}">Envoyer aux participants</button>${last?`<button class="btn ghost" type="button" data-act="form" data-v="">Annuler</button>`:""}</div></div>`;
  if(!last) return ed?"":`<div class="vers"><h3>Résumé pour les participants</h3>${waitRow(holder("project"),"envoyer le résumé de la réunion")}</div>`;
  return `<div class="vers sumbox"><div class="dhead"><h3>Résumé envoyé aux participants</h3>${pill("ok",`Envoyé · version ${last.n}`)}</div><p class="note sumtext">${esc(last.text).replace(/\n/g,"<br>")}</p>
    <span class="src">Envoyé par ${esc(last.by)} le ${esc(last.at)} à ${to.length} participant${to.length>1?"s":""}${s.versions.length>1?` · versions précédentes gardées`:""}.</span>${ed?`<div><button class="btn ghost sm" type="button" data-act="form" data-v="sum:${v}">Corriger et renvoyer</button></div>`:""}</div>`;
}
/* Participant side: on a private page, the last version sent. */
function summaryFor(v,k){
  const s=sumOf(v),last=s&&lastOf(s.versions);if(!last||!s.to.includes(k)) return "";
  return `<div class="vers"><h3>Résumé de la réunion</h3><p class="note sumtext">${esc(last.text).replace(/\n/g,"<br>")}</p><span class="src">Envoyé par ${esc(last.by)} le ${esc(last.at)}${last.n>1?` · version ${last.n}`:""}.</span></div>`;
}

/* ======================================================================
   Preuve d'une activation à plusieurs publications (influence, presse en
   interne) : calculée par le code à partir de chaque publication ou
   retombée vérifiée par une personne, jamais un lien unique pour tout.
   ====================================================================== */
/* A file kept is a file described: name, size, type and when it was deposited, never a
   name alone (MKT-SIM-001). */
const fileMeta=(f,at,by)=>({name:f.name,size:f.size||0,type:f.type||"",at,by});
const fmtSize=n=>n>=1048576?`${(n/1048576).toLocaleString("fr-FR",{maximumFractionDigits:1})} Mo`:`${Math.max(1,Math.round(n/1024))} Ko`;
const fileKind=(t,n)=>t==="application/pdf"||/\.pdf$/i.test(n)?"PDF":t.startsWith("image/")?"Image "+t.slice(6).toUpperCase():t.startsWith("video/")?"Vidéo":/sheet|excel|\.xlsx?$/i.test(t+n)?"Tableur":t||"Fichier";
const fileLine=m=>`${m.name} · ${fmtSize(m.size)} · ${fileKind(m.type,m.name)} · déposé${m.by?` par ${m.by}`:""} le ${m.at}`;
/* « Copié » is said only once the clipboard took it (MKT-SIM-001). */
function copySource(el){
  if(el.dataset.from){const x=document.getElementById(el.dataset.from);if(x) return x.value||x.textContent;}
  if(el.dataset.copy) return el.dataset.copy;
  const box=el.closest(".linkbox")||el.closest(".vers,.card,.irow,.row"),x=box&&(box.querySelector("code")||box.querySelector("textarea"));
  return x?(x.value||x.textContent):"";
}
function copyText(t,ok){
  const fail=()=>toast("Copie impossible : sélectionnez le texte et copiez-le.");
  if(!t||!navigator.clipboard) return fail();
  navigator.clipboard.writeText(t).then(()=>toast(ok),fail);
}
const OUT=["refused","noanswer","abandoned"];
/* An activation run by an agency is declared done only when PDS has decided on every line,
   no line is in error and something was declared done; otherwise an exception, kept as a
   reserve with its reason, owner and deadline (MKT-ACT-001). */
function agencyIssues(a){
  if(a.mode!=="Agence externe"||!agCfg(a)) return [];
  const cfg=agCfg(a),ag=agOf(a),live=ag.rows.filter(r=>!r.removed),l=[];
  if(!ag.url||!ag.snaps.length) return [`le tableau de ${cfg.agency} n'est pas encore repris`];
  const rev=live.filter(r=>!r.dec||r.dec.d==="review"),bad=live.filter(r=>r.errs&&r.errs.length&&(!r.dec||r.dec.d!=="no"));
  if(rev.length) l.push(`${rev.length} ${cfg.rowWord[rev.length>1?1:0]} à examiner (${rev.map(r=>agName(a,r)).join(", ")})`);
  if(bad.length) l.push(`${bad.length} ligne${bad.length>1?"s":""} en erreur (${bad.map(r=>`${agName(a,r)} : ${r.errs[0]}`).join(" ; ")})`);
  const doneWord=a.k==="rp"?"Action déclarée réalisée":cfg.published;
  if(!live.some(r=>r.f.agencyStatus===doneWord||r.f.postUrl)) l.push(a.k==="rp"?"aucune retombée déclarée par l'agence":"aucune publication déclarée par l'agence");
  return l;
}
function agencyDoneForm(a){
  const iss=agencyIssues(a);if(!iss.length) return "";
  return `<div class="callout warn">${I.warn}<span><b>Pas encore réalisée :</b> ${esc(iss.join(" · "))}.</span></div>
   <div class="checks"><label><input type="checkbox" id="aExc">Déclarer réalisée quand même, avec une réserve</label></div>
   <div class="grid2"><div class="field"><label for="aExcWhy">Motif de la réserve *</label><input class="in" id="aExcWhy" placeholder="Ex. : l'agence envoie les retombées le 12/12">${errOf("aExcWhy")}</div>
    <div class="field"><label for="aExcR">Qui la règle *</label><select class="in" id="aExcR">${MEMBERS.map(k=>`<option value="${k}" ${k===(a.resp||"cp")?"selected":""}>${esc(P[k].name)}</option>`).join("")}</select></div>
    <div class="field"><label for="aExcD">Avant le *</label><input class="in" type="date" id="aExcD" min="${isoOf(new Date(...S.base))}" max="${isoOf(CAMPAIGN_END)}">${errOf("aExcD")}</div></div>`;
}
function moduleProof(a){
  if(a.mode==="Agence externe") return null;
  if(a.kind==="Influence"){const cs=collabsOf(a).filter(c=>c.accepted!=null&&!OUT.includes(c.stage));if(!collabsOf(a).length) return {n:0,pub:0,ver:0,miss:[],unit:"créateur"};
    const pub=cs.filter(c=>c.pub),ver=pub.filter(c=>c.pub.verifiedBy);
    return {n:cs.length,pub:pub.length,ver:ver.length,unit:"créateur",miss:cs.filter(c=>!c.pub||!c.pub.verifiedBy).map(c=>`${nameOf(c.k)} : ${c.pub?"publication à vérifier":"pas encore publiée"}`)};}
  if(a.kind==="Relations presse"&&a.rp){const cov=a.rp.cov.filter(c=>c.status!=="unavailable"),ver=cov.filter(c=>c.status==="verified"),sent=a.rp.targets.some(t=>t.msgs.some(m=>m.status==="sent"));
    return {n:cov.length,pub:cov.length,ver:ver.length,unit:"retombée",sent,miss:cov.filter(c=>c.status!=="verified").map(c=>`${rpMedia(c.t).name} : retombée à vérifier`)};}
  return null;
}
/* Called before each render: the activation's proof follows its publications. */
function syncActProof(){
  (S.acts||[]).forEach(a=>{const m=moduleProof(a);if(!m||["closed","cancelled"].includes(a.status)||a.proof.state==="none"||a.proof.state==="na") return;
    const state=!m.pub?"todo":m.ver===m.pub&&(a.kind!=="Influence"||m.ver===m.n)?"verified":"given";
    const text=a.kind==="Influence"?`${m.ver} publication${m.ver>1?"s":""} vérifiée${m.ver>1?"s":""} sur ${m.n} créateur${m.n>1?"s":""} engagé${m.n>1?"s":""}`:`${m.ver} retombée${m.ver>1?"s":""} vérifiée${m.ver>1?"s":""} sur ${m.n} déclarée${m.n>1?"s":""}`;
    a.proof={state,derived:true,text,miss:m.miss,by:"calculé par PDS OS",at:""};});
}
function derivedProofBox(a){
  if(!a.proof||!a.proof.derived) return "";
  return `<div class="vers"><h3>Preuves</h3><p class="note"><b>${esc(a.proof.text)}</b></p>${a.proof.miss.length?`<ul class="hist">${a.proof.miss.map(x=>`<li><span class="noc">•</span><span>${esc(x)}</span></li>`).join("")}</ul>`:""}<span class="src">${a.kind==="Influence"?"Chaque publication se vérifie dans la fiche de son créateur, plus bas.":"Chaque retombée se vérifie dans « Retombées », plus bas."} La preuve de l'activation en découle : aucun lien unique pour toute la campagne.</span></div>`;
}

/* ======================================================================
   Suivi & bilan (ticket « Bilan, validation et clôture ») : un tableau de
   bord vivant aux chiffres séparés et cliquables, un écran de préparation,
   un rapport figé au contenu du ticket, exportable.
   ====================================================================== */
const dashActs=()=>{const f=S.dashF||{};return S.acts.filter(a=>(!f.type||a.kind===f.type)&&(!f.resp||a.resp===f.resp));};
const PHASE_NAMES=["À préparer","À réaliser","À prouver","À mesurer","À clôturer","Clôturées"];
/* Every indicator lists its source items; its value is never invented (no source = « — »). */
function dashData(){
  const A=dashActs(),R=[];
  const add=(g,k,l,items,rule,sum)=>R.push({g,k,l,items,rule,sum});
  add("Activations","all","Activations",A.map(a=>({t:a.title,s:`${a.kind}${a.mode?" · "+a.mode:""}`})),"Activations du périmètre filtré");
  PHASE_NAMES.forEach((n,i)=>add("Activations","ph"+i,n,A.filter(a=>Math.min(phaseOf(a),5)===i).map(a=>({t:a.title,s:a.resp?nameOf(a.resp):"Responsable à désigner"})),`Activations dont la frise est à « ${n.replace("À ","").replace("Clôturées","Clôturer")} »`));
  add("Activations","cx","Annulées",A.filter(a=>a.status==="cancelled").map(a=>({t:a.title,s:a.cancelled.why})),"Annulées avec un motif, gardées dans le bilan");
  const infl=A.filter(a=>a.kind==="Influence"&&a.mode!=="Agence externe"),cs=infl.flatMap(a=>collabsOf(a).filter(c=>c.accepted!=null&&!OUT.includes(c.stage)));
  const agInf=A.filter(a=>a.kind==="Influence"&&a.mode==="Agence externe").flatMap(a=>agRows(a).filter(r=>!r.removed&&r.f.agencyStatus==="Publié"));
  if(infl.length||agInf.length){
    add("Publications","pd","Déclarées",[...cs.filter(c=>c.pub).map(c=>({t:nameOf(c.k),s:`déclarée le ${c.pub.at}`})),...agInf.map(r=>({t:agName({k:"influence"},r),s:"déclarée par l'agence"}))],"Publications déclarées par un créateur ou par l'agence");
    add("Publications","pv","Vérifiées",cs.filter(c=>c.pub&&c.pub.verifiedBy).map(c=>({t:nameOf(c.k),s:`vérifiée par ${c.pub.verifiedBy}`})),"Vérifiées par une personne de PDS ; une déclaration d'agence ne l'est jamais seule");
    add("Publications","pm","Liens manquants",cs.filter(c=>!c.pub).map(c=>({t:nameOf(c.k),s:STAGE[c.stage]})),"Créateurs engagés sans publication déclarée");}
  const rp=A.filter(a=>a.kind==="Relations presse"),cov=rp.filter(a=>a.rp).flatMap(a=>a.rp.cov),agRp=rp.filter(a=>a.mode==="Agence externe").flatMap(a=>agRows(a).filter(r=>!r.removed&&r.f.agencyStatus==="Action déclarée réalisée"));
  if(rp.length){
    add("Retombées","rd","Déclarées",[...cov.map(c=>({t:rpMedia(c.t).name,s:`${c.type} · ${c.src}`})),...agRp.map(r=>({t:r.key,s:"déclarée par l'agence"}))],"Retombées déclarées en interne ou par l'agence");
    add("Retombées","rv","Vérifiées",cov.filter(c=>c.status==="verified").map(c=>({t:rpMedia(c.t).name,s:`${c.ver.m} · ${c.ver.by}`})),"Vérifiées avec une méthode (lien, capture, exemplaire)");
    add("Retombées","rt","À vérifier",[...cov.filter(c=>c.status==="declared").map(c=>({t:rpMedia(c.t).name,s:c.src})),...agRp.map(r=>({t:r.key,s:r.f.postUrl?"lien fourni par l'agence":"sans preuve"}))],"Déclarées, pas encore vérifiées par PDS");}
  const st=k=>A.filter(a=>statsOf(a)===k||(k==="declared"&&a.stats.state==="declared"&&statsOf(a)!=="none"));
  add("Statistiques","sd","Déclarées",st("declared").map(a=>({t:a.title,s:`${fmtN(a.stats.value)} ${a.unit}`})),"Dernier relevé déclaré, non vérifié");
  add("Statistiques","sv","Vérifiées",A.filter(a=>a.stats.state==="verified").map(a=>({t:a.title,s:`${fmtN(a.stats.value)} ${a.unit}`})),"Tous les relevés vérifiés par la direction");
  add("Statistiques","sp","Partielles",A.filter(a=>a.stats.state==="partial").map(a=>({t:a.title,s:`${fmtN(a.stats.value)} ${a.unit} · partiel`})),"Relevé incomplet : toutes les publications ne sont pas comptées");
  add("Statistiques","sn","Indisponibles",A.filter(a=>a.stats.state==="na").map(a=>({t:a.title,s:"la plateforme ne les fournit pas"})),"Indisponible n'est jamais compté comme zéro");
  if(me()==="cp"||me()==="dg"){const B=budgetRows(),it=k=>B.rows.filter(r=>r[k]).map(r=>({t:r.t,s:`${euro(r[k])} · ${r.src}`,a:r[k]}));
    add("Budget","be","Estimé",it("est"),"Lignes de budget des leviers retenus dans la Stratégie",true);
    add("Budget","bg","Engagé",it("eng"),"Devis validés, rémunérations acceptées et dépenses engagées de chaque activation",true);
    add("Budget","bf","Facturé",it("inv"),"Dépenses dont la facture est reçue",true);
    add("Budget","bp","Payé administrativement",it("paid"),"Paiements déclarés ou vérifiés ; PDS OS ne fait aucun virement",true);}
  objResults().forEach((o,i)=>add("Objectifs","ob"+i,o.x.text,[{t:`Cible ${o.target?fmtN(o.target):"—"} au ${o.due}`,s:o.status},{t:`Déclaré ${o.decl!=null?fmtN(o.decl):"—"} · vérifié ${o.ver!=null?fmtN(o.ver):"—"}`,s:o.from.length?"Depuis : "+o.from.join(", "):"Aucune source reliée"}].concat(o.gap!=null?[{t:`Écart ${o.gap>=0?"+":""}${fmtN(o.gap)} · ${o.pct} % de la cible`,s:"Calculé sur le déclaré"}]:[]),"Somme des derniers relevés des activations qui mesurent cet indicateur, comparée à la cible du Brief de sortie"));
  const pv=A.filter(a=>a.status!=="cancelled"&&!["prep","run"].includes(a.status));
  add("Synthèse","proofs","Preuves",pv.map(a=>({t:a.title,s:a.proof.derived?a.proof.text:PRSTATE[proofOf(a)][1],st:proofOf(a)})),"La preuve de chaque activation réalisée : vérifiée, à vérifier ou manquante");
  add("Synthèse","stats","Statistiques",pv.map(a=>({t:a.title,s:a.stats.value!=null?`${fmtN(a.stats.value)} ${a.unit} · ${STSTATE[a.stats.state][1].toLowerCase()}`:STSTATE[statsOf(a)][1],st:statsOf(a)})),"Le dernier relevé de chaque activation réalisée");
  const rs=S.review.reserves;
  add("Réserves","ro","Ouvertes",rs.filter(r=>!r.arb).map(r=>({t:r.text,s:r.cat})),"Réserves pas encore arbitrées");
  add("Réserves","ra","Arbitrées",rs.filter(r=>r.arb&&!r.lifted).map(r=>({t:r.text,s:ARB[r.arb]})),"Réserves arbitrées, pas encore levées");
  add("Réserves","rl","Levées",rs.filter(r=>r.lifted).map(r=>({t:r.text,s:r.lifted})),"Réserves levées avec ce qui les a levées");
  add("Réserves","rf","Suivies après clôture",rs.filter(r=>r.arb==="follow").map(r=>({t:r.text,s:r.who?nameOf(r.who):""})),"À suivre après la clôture du Marketing");
  return R;
}
/* Money per activation: estimated in the Strategy, engaged, invoiced (invoice received),
   paid. Each line says where it comes from; the totals are compared with the envelope
   (MKT-BIL-002). PDS OS makes no payment. */
const COST_ST={engaged:"Engagé",invoiced:"Facture reçue",paid:"Payé"};
function costsOf(a){
  const l=(a.costs||[]).map(c=>({...c,src:`Saisi par ${c.by} le ${c.at}`}));
  if(a.kind==="Influence"&&a.mode!=="Agence externe") collabsOf(a).filter(c=>c.accepted!=null&&!OUT.includes(c.stage)).forEach(c=>l.push({label:nameOf(c.k),amount:c.offers[c.accepted].amount,state:["paid","paidv"].includes(c.pay)?"paid":c.invoice?"invoiced":"engaged",src:"Conditions acceptées dans la campagne",auto:true}));
  if(a.mode==="Agence externe"&&a.ag) agRows(a).filter(r=>!r.removed&&r.dec&&r.dec.d==="ok"&&r.f.fee).forEach(r=>l.push({label:agName(a,r),amount:r.f.fee,state:"engaged",src:`Validé par PDS, tarif de ${agCfg(a).agency}`,auto:true}));
  return l;
}
const sumCosts=(l,sts)=>l.filter(c=>sts.includes(c.state)).reduce((t,c)=>t+c.amount,0);
function budgetRows(){
  const est=budget().lines.filter(l=>l.state==="retenu"),q=activeQuote(),rows=[];
  const line=k=>est.filter(l=>l.lever===k).reduce((t,l)=>t+l.amount,0);
  rows.push({t:"Clip officiel · production",scope:"Production",est:line("clip"),eng:q?q.amount:0,inv:0,paid:0,src:q?`Devis V${q.n} validé`:"Aucun devis validé"});
  est.filter(l=>!l.lever).forEach(l=>rows.push({t:`${l.name} · production`,scope:"Production",est:l.amount,eng:0,inv:0,paid:0,src:"Réalisée en interne"}));
  S.acts.forEach(a=>{const c=costsOf(a);rows.push({t:a.title,scope:"Activation",id:a.id,est:a.k==="clip"?0:line(a.k),eng:sumCosts(c,["engaged","invoiced","paid"]),inv:sumCosts(c,["invoiced","paid"]),paid:sumCosts(c,["paid"]),src:c.length?`${c.length} ligne${c.length>1?"s":""}`:"Aucune dépense saisie",cancelled:a.status==="cancelled"});});
  const T=k=>rows.reduce((t,r)=>t+r[k],0),tot={est:T("est"),eng:T("eng"),inv:T("inv"),paid:T("paid")};
  return {rows,tot,rest:BUDGET_ENV-tot.eng,overEst:tot.est-BUDGET_ENV};
}
function budgetTable(B){
  const cols="minmax(0,2fr) repeat(4,minmax(0,1fr))",c=v=>`<span class="num">${v?euro(v):"—"}</span>`;
  return `<div class="table"><div class="tr h" style="grid-template-columns:${cols}"><span>Ligne</span><span>Estimé</span><span>Engagé</span><span>Facturé</span><span>Payé</span></div>
   ${B.rows.map(r=>`<div class="tr" style="grid-template-columns:${cols}"><span><b>${esc(r.t)}</b><br><span class="src">${esc(r.scope)} · ${esc(r.src)}${r.cancelled?" · annulée":""}</span></span>${c(r.est)}${c(r.eng)}${c(r.inv)}${c(r.paid)}</div>`).join("")}
   <div class="tr" style="grid-template-columns:${cols}"><span><b>Total</b></span><b class="num">${euro(B.tot.est)}</b><b class="num">${euro(B.tot.eng)}</b><b class="num">${euro(B.tot.inv)}</b><b class="num">${euro(B.tot.paid)}</b></div></div>
   <span class="src">Enveloppe ${euro(BUDGET_ENV)} · ${B.rest>=0?`reste ${euro(B.rest)} non engagés`:`engagé au-dessus de l'enveloppe de ${euro(-B.rest)}`} · estimé ${B.overEst>0?`au-dessus de l'enveloppe de ${euro(B.overEst)}`:`sous l'enveloppe de ${euro(-B.overEst)}`}. Facturé = facture reçue ; payé = paiement déclaré ou vérifié, sans virement par PDS OS.</span>`;
}
/* Each objective of the Strategy against what the activations measured, computed. */
function objResults(){
  return S.strat.items.filter(x=>x.dim==="Objectifs & KPIs"&&x.state==="kept").map(x=>{
    const m=objMetric(x),acts=m&&m[2]?S.acts.filter(a=>a.unit===m[2]&&a.status!=="cancelled"&&a.stats.value!=null):[];
    const decl=acts.length?acts.reduce((t,a)=>t+a.stats.value,0):null,va=acts.filter(a=>a.stats.state==="verified"),ver=va.length?va.reduce((t,a)=>t+a.stats.value,0):null;
    const why=!m||!x.target?"objectif à préciser":!m[2]?m[3]:!acts.length?"aucun relevé pour l'instant":"";
    return {x,label:m?m[1]:"Indicateur",target:x.target,due:x.j!=null?fullDate(relDay(x.j)):"—",decl,ver,from:acts.map(a=>a.title),gap:decl!=null&&x.target?decl-x.target:null,
      pct:decl!=null&&x.target?Math.round(decl*100/x.target):null,status:why?"Non mesurable : "+why:decl>=x.target?"Atteint (déclaré)":"Pas atteint (déclaré)"};});
}
const objText=o=>`${o.x.text} · cible ${o.target?fmtN(o.target):"—"} au ${o.due} · déclaré ${o.decl!=null?fmtN(o.decl):"—"} · vérifié ${o.ver!=null?fmtN(o.ver):"—"}${o.gap!=null?` · écart ${o.gap>=0?"+":""}${fmtN(o.gap)} (${o.pct} %)`:""} · ${o.status}`;
const dashVal=d=>d.sum?euro(d.items.reduce((s,x)=>s+(x.a||0),0)):String(d.items.length);
function dashboard(){
  const D=dashData(),get=k=>D.find(d=>d.k===k),A=S.acts,closed=A.filter(a=>a.status==="closed").length,cx=A.filter(a=>a.status==="cancelled").length;
  const pr=get("proofs").items,ok=pr.filter(x=>["verified","none","na"].includes(x.st)).length,tv=pr.filter(x=>x.st==="given").length,miss=pr.filter(x=>["todo","contested"].includes(x.st)).length;
  const sv=get("stats").items,got=sv.filter(x=>["declared","verified","partial"].includes(x.st)).length,smiss=sv.filter(x=>x.st==="todo").length,sna=sv.filter(x=>x.st==="na").length;
  const bg=get("bg");
  const row=(k,txt,sub)=>`<button class="srow" type="button" data-act="dashopen" data-v="${k}"><span class="grow"><b>${txt}</b>${sub?`<br><span class="src">${sub}</span>`:""}</span><span class="t3" aria-hidden="true">${I.chevR}</span></button>`;
  const groups=[...new Set(D.map(d=>d.g))].filter(g=>g!=="Synthèse");
  if(!A.length) return `<section class="card" aria-label="Où on en est"><h2 style="font-size:18px">Où on en est</h2><p class="note">Aucune activation pour l'instant : le bilan se remplit au fil des activations.</p></section>`;
  return `<section class="card" aria-label="Où on en est"><div class="dhead"><h2 style="font-size:18px">Où on en est</h2><span class="cap">Calculé à l'instant</span></div>
   <div class="rows">${row("all",`${closed} activation${closed>1?"s":""} sur ${A.length} clôturée${closed>1?"s":""}`,cx?`dont ${cx} annulée${cx>1?"s":""}`:"")}
    ${row("proofs",pr.length?`Preuves : ${ok} vérifiée${ok>1?"s":""}${tv?`, ${tv} à vérifier`:""}${miss?`, ${miss} manquante${miss>1?"s":""}`:""}`:"Preuves : aucune activation réalisée","")}
    ${row("stats",sv.length?`Statistiques : ${got} relevée${got>1?"s":""}${smiss?`, ${smiss} manquante${smiss>1?"s":""}`:""}${sna?`, ${sna} indisponible${sna>1?"s":""}`:""}`:"Statistiques : aucune activation réalisée","")}
    ${objResults().map((o,i)=>row("ob"+i,`${esc(o.x.text)} : ${o.decl!=null?`${fmtN(o.decl)} déclarés, ${o.pct} % de la cible`:"non mesurable"}`,esc(o.status))).join("")}
    ${bg?row("bg",`Budget : ${dashVal(bg)} engagés sur ${euro(BUDGET_ENV)}`,"Visible de la cheffe de projet et de la direction"):""}</div>
   ${bg?`<details class="infos"><summary>Budget par ligne</summary><div class="vers">${budgetTable(budgetRows())}</div></details>`:""}
   <details class="infos"><summary>Voir le détail</summary>${groups.map(g=>`<div class="vers"><h3>${esc(g)}</h3><div class="dgrid">${D.filter(d=>d.g===g).map(d=>`<button class="dtile" type="button" data-act="dashopen" data-v="${d.k}"><span class="k">${esc(d.l)}</span><b class="num">${dashVal(d)}</b></button>`).join("")}</div></div>`).join("")}</details></section>`;
}
function dashModal(){
  const d=dashData().find(x=>x.k===S.modal.v);if(!d) return "";
  return `<div class="mhead"><h2 id="mtitle">${d.g==="Synthèse"?esc(d.l):`${esc(d.g)} · ${esc(d.l)} · ${dashVal(d)}`}</h2><button class="mx" type="button" data-act="modalx" aria-label="Fermer">${I.x}</button></div>
   <p class="note">Règle de calcul : ${esc(d.rule)}.</p>${d.items.length?`<div class="rows">${d.items.map(x=>`<div class="irow"><span class="grow"><b>${esc(x.t)}</b>${x.s?`<br><span class="src">${esc(x.s)}</span>`:""}</span></div>`).join("")}</div>`:`<p class="note">Aucun élément.</p>`}`;
}
/* The report is a photograph: everything it shows is copied at generation time. */
const REPORT_SECTIONS=[["sum","Résumé exécutif et périmètre"],["strat","Objectifs et stratégie source"],["acts","Récapitulatif des activations"],["res","Résultats déclarés et vérifiés"],["stats","Statistiques"],["budget","Budget"],["gaps","Écarts, réserves et recommandations"],["annex","Annexes : preuves et liens"]];
function reportSnapshot(ids,secs,from,to,sum,reco,res){
  const A=S.acts.filter(a=>ids.includes(a.id)),D=dashData();
  return {from,to,secs,sum,reco,reserves:res,scope:A.length,excluded:S.acts.filter(a=>!ids.includes(a.id)).map(a=>a.title),
    strat:S.strat.items.filter(x=>x.state==="kept"&&["Positionnement","Narratif de sortie"].includes(x.dim)).map(x=>`${x.dim} : ${x.text}`),objs:objResults().map(objText),
    acts:A.map(a=>({t:a.title,k:`${a.kind}${a.mode?" · "+a.mode:""}`,r:a.resp?nameOf(a.resp):"—",ph:a.status==="cancelled"?"Annulée":phaseOf(a)>=5?"Clôturée":PHASES[phaseOf(a)],proof:a.proof.derived?a.proof.text:PRSTATE[proofOf(a)][1],stats:a.stats.value!=null?`${fmtN(a.stats.value)} ${a.unit} · ${STSTATE[a.stats.state][1].toLowerCase()}`:STSTATE[statsOf(a)][1]})),
    res:D.filter(d=>["Publications","Retombées"].includes(d.g)).map(d=>[`${d.g} · ${d.l}`,dashVal(d)]),
    stats:A.flatMap(a=>(a.snaps||[]).map(x=>`${a.title} : ${fmtN(x.value)} ${a.unit} · ${x.platform} · ${x.period} · ${x.source} · ${x.verifiedBy?"vérifié":"déclaré"}${x.partial?" · partiel":""}`)),
    budget:D.filter(d=>d.g==="Budget").map(d=>[d.l,dashVal(d)]),btable:budgetRows(),
    annex:A.flatMap(a=>[...(a.proof.link?[`${a.title} : ${a.proof.link} · ${PRSTATE[proofOf(a)][1].toLowerCase()}`]:[]),...collabsOf(a).filter(c=>c.pub).map(c=>`${nameOf(c.k)} : ${c.pub.url} · ${c.pub.verifiedBy?"vérifiée":"déclarée"}`),...(a.rp?a.rp.cov.map(c=>`${rpMedia(c.t).name} : ${c.url||"sans lien"} · ${c.status==="verified"?"vérifiée":"déclarée"}`):[])])};
}
function reportModal(){
  const x=S.review.reports.find(r=>r.n===+S.modal.v),s=x.snap||{},has=k=>!s.secs||s.secs.includes(k),list=l=>l&&l.length?`<ul class="hist">${l.map(y=>`<li><span class="noc">•</span><span>${esc(y)}</span></li>`).join("")}</ul>`:`<p class="note">Rien à signaler.</p>`;
  const seeBudget=me()==="cp"||me()==="dg";
  return `<div class="mhead"><h2 id="mtitle">Bilan Marketing — Néons — V${x.n}</h2><button class="mx" type="button" data-act="modalx" aria-label="Fermer">${I.x}</button></div>
   ${callFacts([["Statut",`${RSTATE[x.status][1]}`],["Période",s.from?`du ${esc(fullDate(fromIso(s.from)))} au ${esc(fullDate(fromIso(s.to)))}`:"—"],["Périmètre",`${s.scope||S.acts.length} activations${s.excluded&&s.excluded.length?` · exclues : ${esc(s.excluded.join(", "))}`:""}`],["Généré",`par ${esc(x.by)} le ${esc(x.at)}`],["Empreinte",`<code>${x.fp}</code> · règles de calcul v1 · figé à la génération`]])}
   ${has("sum")?`<div class="vers"><h3>Résumé exécutif</h3><p class="note sumtext">${esc(x.sum)}</p></div>`:""}
   ${has("strat")&&s.strat?`<div class="vers"><h3>Objectifs et stratégie source</h3>${s.objs?list(s.objs):""}${list(s.strat)}<span class="src">Brief de sortie V1 · écarts calculés sur le déclaré, au moment de la génération.</span></div>`:""}
   ${has("acts")&&s.acts?`<div class="vers"><h3>Récapitulatif des activations</h3><div class="rows">${s.acts.map(a=>`<div class="irow"><span class="grow"><b>${esc(a.t)}</b> <span class="src">· ${esc(a.k)} · ${esc(a.r)}</span><br><span class="src">Étape : ${esc(a.ph)} · Preuve : ${esc(a.proof)} · Statistiques : ${esc(a.stats)}</span></span></div>`).join("")}</div></div>`:""}
   ${has("res")&&s.res?`<div class="vers"><h3>Résultats déclarés et vérifiés</h3>${s.res.length?callFacts(s.res.map(([k,v])=>[k,esc(v)])):`<p class="note">Aucune publication ni retombée dans le périmètre.</p>`}<span class="src">Déclaré et vérifié restent séparés : une déclaration n'est jamais comptée comme vérifiée.</span></div>`:""}
   ${has("stats")&&s.stats?`<div class="vers"><h3>Statistiques</h3>${list(s.stats)}<span class="src">Chaque relevé garde sa période, sa plateforme et sa source ; ils ne s'additionnent pas.</span></div>`:""}
   ${has("budget")&&s.budget&&seeBudget?`<div class="vers"><h3>Budget</h3>${s.btable?budgetTable(s.btable):s.budget.length?callFacts(s.budget.map(([k,v])=>[k,esc(v)])):`<p class="note">Non renseigné.</p>`}</div>`:""}
   ${has("gaps")?`<div class="vers"><h3>Écarts, réserves et recommandations</h3>${list((x.reserves||[]).map(r=>`${r.cat} : ${r.text}`))}${x.reco?`<p class="note"><b>Recommandations</b> : ${esc(x.reco)}</p>`:""}</div>`:""}
   ${has("annex")&&s.annex?`<div class="vers"><h3>Annexes : preuves et liens</h3>${list(s.annex)}</div>`:""}
   <div class="btnrow noprint"><button class="btn" type="button" data-act="repprint">Exporter en PDF</button><button class="btn ghost" type="button" data-act="modalx">Fermer</button></div>`;
}

document.addEventListener("change",e=>{if(e.target.id!=="dfType"&&e.target.id!=="dfResp") return;S.dashF={type:(document.getElementById("dfType")||{}).value||"",resp:(document.getElementById("dfResp")||{}).value||""};render();});

/* ======================================================================
   Cadrage (ticket « Cadrage intelligent d'un projet », Ibé 30/09) : démarrer
   directement ou par un échange, les 6 dimensions (connu / à confirmer /
   manquant, une question à la fois), le Brief de cadrage versionné et validé
   par la direction, puis le Plan du projet. Rien ne devient vrai sans un humain.
   ====================================================================== */
MODNAME.framing="Cadrage";
const FR_DIMS=[["goal","01","Objectif"],["time","02","Temporalité"],["budget","03","Budget & contraintes"],["team","04","Équipe"],["start","05","État de départ"],["legal","06","Cadre juridique"]];
const FR_ITEMS=()=>[
 {id:"g1",d:"goal",label:"Résultat recherché",q:"Que doit accomplir cette sortie ?",v:null,st:"missing",quote:"On veut que Néons sorte de TikTok, que les gens découvrent Mona.",sug:[["Installer « Néons » comme le single de l'hiver et faire découvrir Mona Lys au-delà de TikTok","Fiche projet · note de Lina Haddad"],["Préparer l'album de 2027 en élargissant l'audience","Échange avec Jade Petit le 02/10"],["Consolider la fanbase actuelle avant la tournée","Historique de Mona Lys"]]},
 {id:"g2",d:"goal",label:"Critère de réussite",q:"À quoi verra-t-on que c'est réussi ?",v:null,st:"missing",quote:"Si on fait 200 000 streams en un mois, c'est gagné.",sug:[["200 000 streams à 4 semaines","Le précédent single a fait 140 000"],["Entrée dans 10 playlists éditoriales","Pitching du single « Lune »"],["50 000 auditeurs mensuels de plus","Spotify for Artists, relevé du 01/10"]]},
 {id:"g3",d:"goal",label:"Priorité principale",q:"Si on ne pouvait garder qu'une chose, laquelle ?",v:null,st:"missing",quote:"Le clip, c'est le cœur.",sug:[["Le clip officiel","Envie exprimée par Mona Lys"],["La présence en playlists","Stratégie du précédent single"],["L'influence sur TikTok","Historique de Mona Lys"]]},
 {id:"t1",d:"time",label:"Date de sortie",q:"La date de sortie est-elle toujours le Sam. 05/12/2026 ?",v:"Sam. 05/12/2026",src:"Évoquée par Jade Petit le 02/10",st:"confirm",quote:"On garde le 5 décembre, c'est calé avec la radio."},
 {id:"t2",d:"time",label:"Master final",v:"Sam. 21/11/2026",src:"Calculé par PDS OS : sortie moins 14 jours, délai de The Orchard",st:"known"},
 {id:"t3",d:"time",label:"Échéances imposées",q:"Y a-t-il une date qu'on ne peut pas déplacer ?",v:null,st:"missing",quote:"Le pré-save, trois semaines avant, comme d'habitude.",sug:[["Pré-save trois semaines avant la sortie, le Sam. 14/11","Habitude de PDS"],["Showcase à Paris mi-décembre","Agenda de Mona Lys"],["Aucune échéance imposée","—"]]},
 {id:"b1",d:"budget",label:"Enveloppe",v:"25 000 € HT",src:"Fiche projet · validée par Claire Morel le 01/10",st:"known"},
 {id:"b2",d:"budget",label:"Engagements existants",q:"Une partie du budget est-elle déjà engagée ?",v:"Clip officiel : environ 18 000 € HT",src:"Estimation de Lina Haddad",st:"confirm",quote:"Le clip va prendre l'essentiel, autour de 18."},
 {id:"m1",d:"team",label:"Responsable du projet",v:"Lina Haddad",src:"Prise en charge acceptée le 01/10",st:"known"},
 {id:"m2",d:"team",label:"Validation",v:"Claire Morel, directrice générale",src:"Règle de PDS",st:"known"},
 {id:"m3",d:"team",label:"Mix et mastering",q:"Qui fait le mix et le master ?",v:"Karim Haddou",src:"Dit par Mona Lys le 05/10",st:"confirm",quote:"Karim fait le mix et le master, comme sur Lune."},
 {id:"m4",d:"team",label:"Direction créative",v:"Nadia Benali",src:"Équipe de PDS",st:"known"},
 {id:"s1",d:"start",label:"Où en est le titre",v:"Maquette v3, production finie",src:"Catalogue · version du 02/10",st:"known"},
 {id:"s2",d:"start",label:"Voix",q:"Les voix sont-elles définitives ?",v:"Voix du deuxième couplet à refaire",src:"Message de Mona Lys le 05/10",st:"confirm",quote:"On refait la voix du deuxième couplet, le reste est bon."},
 {id:"l1",d:"legal",label:"Auteurs et compositeurs",v:"Mona Lys, Sami Kader",src:"Catalogue · crédits",st:"known"},
 {id:"l2",d:"legal",label:"Éléments empruntés",q:"Le titre emprunte-t-il un extrait ou une mélodie ?",v:"Un extrait de « Night Lights »",src:"Dit par Sami Kader",st:"confirm",quote:"Il y a le sample de Night Lights au début, il faudra le déclarer."},
 {id:"l3",d:"legal",label:"Contrat d'artiste",v:"Signé le 12/03/2025",src:"Contrats",st:"known"}];
const FR_ST={known:["","Connu"],ok:["ok","Confirmé"],confirm:["warn","À confirmer"],missing:["bad","Manquant"],na:["","Non applicable"],later:["info","À définir plus tard"]};
const frOf=()=>S.fr||(S.fr={items:FR_ITEMS(),brief:{versions:[]},plan:null});
const frOpen=()=>frOf().items.filter(x=>["missing","confirm"].includes(x.st));
const frDimOf=d=>FR_DIMS.find(x=>x[0]===d);
const frFrozen=()=>{const v=lastOf(frOf().brief.versions);return !!v&&v.status==="review";};
const frCounts=()=>{const it=frOf().items;return {known:it.filter(x=>["known","ok"].includes(x.st)).length,confirm:it.filter(x=>x.st==="confirm").length,missing:it.filter(x=>x.st==="missing").length};};
/* The call: what was said becomes a proposal with its sentence; what nobody said stays missing. */
function frReveal(){const c=prepOf("frame").call;frOf().items.forEach(x=>{if(["missing","confirm"].includes(x.st)&&x.quote){x.st="confirm";if(x.v==null) x.v=x.sug?x.sug[0][0]:x.v;x.src=null;x.from=`Échange de cadrage du ${prepDay(c)}`;x.said=x.quote;}});}
/* fr1 — Démarrer le cadrage */
function frEntry(){
  const p=prepOf("frame"),ed=can("project"),c=frCounts();
  if(!p.org){const reco=c.missing+c.confirm>c.known?"call":"po";
    const card=(v,t,d)=>`<button class="choice" type="button" data-act="frgo" data-v="${v}"><span class="eyebrow" style="gap:8px"><b>${t}</b>${reco===v?pill("info","Recommandé"):""}</span><span class="src">${d}</span></button>`;
    return `${callFacts([["Prise en charge","Acceptée le Jeu. 01/10/2026 par Lina Haddad"],["Projet","« Néons » · single de Mona Lys · sortie visée le Sam. 05/12/2026"]])}
     <div class="vers"><h3>Ce que le projet sait déjà</h3><p class="note">${c.known} informations connues · ${c.confirm} à confirmer · ${c.missing} manquantes. PO ne redemandera pas ce qui est connu.</p>
      <details class="infos"><summary>Voir le détail</summary><div class="rows">${frOf().items.map(x=>`<div class="irow"><span class="grow"><span class="cap">${esc(frDimOf(x.d)[2])}</span><br><b>${esc(x.label)}</b> · ${x.v?esc(x.v):`<span class="src">Pas encore connu</span>`}${x.src?`<br><span class="src">${esc(x.src)}</span>`:""}</span>${pill(FR_ST[x.st][0],FR_ST[x.st][1])}</div>`).join("")}</div></details></div>
     ${ed?`<div class="choices2">${card("po","Commencer le cadrage","PO pose une question à la fois, dans les 6 dimensions, et ne redemande jamais ce qui est connu.")}${card("call","Préparer un échange","Un call avec le management ; PO en tire des propositions, chacune avec la phrase exacte.")}</div>${reco==="call"?`<span class="src">Il manque ${c.missing} informations et ${c.confirm} sont à confirmer : un échange ira plus vite que des questions une à une.</span>`:""}`:waitRow(holder("project"),"démarrer le cadrage")}`;}
  return prepGate("frame")||callFacts([["Départ",p.org==="call"?`Échange de cadrage du ${esc(fullDate(fromIso(p.call.date)))} à ${esc(p.call.h)}`:`Commencé directement par ${esc(p.orgBy)} le ${esc(p.orgAt)}`]])+summaryBlock("frame");
}
/* fr2 — the 6 dimensions: one question at a time, then everything at a glance */
function frQuestion(x,ed){
  const dim=frDimOf(x.d),f=S.form||"",k=x.id,editing=f==="frm:"+k||x.st==="missing";
  const head=`<span class="cap">${esc(dim[2].toUpperCase())} · ${x.st==="missing"?"INFORMATION MANQUANTE":"À CONFIRMER"}</span>`;
  if(!ed) return `${head}<p class="note"><b>${esc(x.q||x.label)}</b></p>${waitRow(holder("project"),"répondre aux questions de PO")}`;
  const say=x.said?`<span class="src">« ${esc(x.said)} » · ${esc(x.from)}</span>`:x.src?`<span class="src">${esc(x.src)}</span>`:"";
  const helper=f==="frh:"+k?`<div class="rows">${(x.sug||[]).map((s,i)=>`<button class="srow" type="button" data-act="frsug" data-k="${k}" data-i="${i}"><span class="grow"><b>${esc(s[0])}</b><br><span class="src">${esc(s[1])}</span></span></button>`).join("")}</div><span class="src">Trois formulations tirées de ce que PDS OS sait ; choisissez-en une, puis corrigez-la si besoin.</span>`:"";
  const extra=f==="frna:"+k?`<div class="field"><label for="frWhy">Pourquoi ce n'est pas applicable *</label><input class="in" id="frWhy">${errOf("frWhy")}</div><div class="btnrow"><button class="btn sm" type="button" data-act="frna" data-k="${k}">Marquer non applicable</button><button class="btn ghost sm" type="button" data-act="form" data-v="">Annuler</button></div>`
    :f==="frl:"+k?`<div class="field"><label for="frWhen">À définir avant le *</label><input class="in" type="date" id="frWhen">${errOf("frWhen")}</div><div class="btnrow"><button class="btn sm" type="button" data-act="frlater" data-k="${k}">Reporter, avec une tâche</button><button class="btn ghost sm" type="button" data-act="form" data-v="">Annuler</button></div>`
    :`<div class="btnrow"><button class="btn ghost sm" type="button" data-act="form" data-v="frna:${k}">Non applicable</button><button class="btn ghost sm" type="button" data-act="form" data-v="frl:${k}">À définir plus tard</button></div>`;
  return `${head}<h3 style="font-size:20px;letter-spacing:-.02em">${esc(x.q||x.label)}</h3>
    ${editing?`${x.sug&&f!=="frh:"+k?`<div><button class="btn out sm" type="button" data-act="form" data-v="frh:${k}">M'aider à définir</button></div>`:""}${helper}
      <div class="field"><label for="frA">Votre réponse *</label><textarea class="in" id="frA" rows="2">${esc(x.st==="missing"?"":x.v||"")}</textarea>${errOf("frA")}</div>${say}
      <div class="btnrow"><button class="btn" type="button" data-act="frsave" data-k="${k}">Confirmer</button>${x.st!=="missing"?`<button class="btn ghost" type="button" data-act="form" data-v="">Annuler</button>`:""}</div>`
     :`<p class="note sumtext"><b>${esc(x.v)}</b></p>${say}<div class="btnrow"><button class="btn" type="button" data-act="frok" data-k="${k}">Confirmer</button><button class="btn out" type="button" data-act="form" data-v="frm:${k}">Modifier</button></div>`}
    ${extra}`;
}
function frDims(){
  const fr=frOf(),ed=can("project")&&!frFrozen(),open=frOpen(),cur=fr.items.find(x=>x.id===S.frQ&&open.includes(x))||open[0];
  const conf=fr.items.filter(x=>!["missing","confirm"].includes(x.st)).length;
  const dims=FR_DIMS.map(([d,n,l])=>{const it=fr.items.filter(x=>x.d===d),o=it.filter(x=>["missing","confirm"].includes(x.st)).length;
    return versionCard("frd"+d,!!o,`${n} · ${esc(l)}`,o?pill("warn",`${o} à traiter`):pill("ok","Complète"),"",`<div class="rows">${it.map(x=>`<div class="irow"><span class="grow"><b>${esc(x.label)}</b> · ${x.v&&x.st!=="missing"?esc(x.v):`<span class="src">Pas encore connu</span>`}<br><span class="src">${x.st==="ok"?`${x.edited?"Modifié":"Confirmé"} par ${esc(x.by)}`:x.st==="na"?`Non applicable · « ${esc(x.why)} »`:x.st==="later"?`À définir avant le ${esc(fullDate(fromIso(x.when)))}`:x.said?`« ${esc(x.said)} » · ${esc(x.from)}`:esc(x.src||"")}</span></span>${pill(FR_ST[x.st][0],FR_ST[x.st][1])}${ed&&["missing","confirm"].includes(x.st)&&x!==cur?`<button class="btn ghost sm" type="button" data-act="frpick" data-k="${x.id}">Répondre</button>`:""}</div>`).join("")}</div>`);}).join("");
  return `${frFrozen()?`<div class="callout info">${I.lock}<span>Le cadrage est figé pendant la relecture du Brief par ${esc(nameOf(holder("direction")))}.</span></div>`:""}
   <p class="note"><b>Confirmation humaine · ${conf}/${fr.items.length}</b> · ${FR_DIMS.filter(([d])=>!fr.items.some(x=>x.d===d&&["missing","confirm"].includes(x.st))).length} dimensions complètes sur 6</p>
   ${cur&&!frFrozen()?`<div class="nowbox"><h3>Question de PO</h3>${frQuestion(cur,can("project"))}</div>`:!open.length?`<div class="callout ok">${I.ok}<span><b>Les 6 dimensions sont complètes.</b> Le Brief de cadrage peut être créé.</span></div>`:""}
   ${dims}`;
}
/* fr3 — the Brief, versioned; a change request reopens only the dimensions concerned */
function frBriefDoc(v){return `<div class="rows">${FR_DIMS.map(([d,n,l])=>`<div class="irow"><span class="grow"><span class="cap">${n} · ${esc(l)}</span><br>${v.snap.filter(x=>x.d===d).map(x=>`<b>${esc(x.label)}</b> : ${esc(x.v)} <span class="src">· ${esc(x.src)}</span>`).join("<br>")}</span>${v.req&&v.req.dims.includes(d)?pill("warn","À revoir"):""}</div>`).join("")}</div>`;}
function frBrief(){
  const fr=frOf(),B=fr.brief,v=lastOf(B.versions),cp=can("project"),dir=me()===holder("direction"),open=frOpen().length;
  const cards=[...B.versions].reverse().map(x=>versionCard("frb"+x.n,x===v,`Brief de cadrage · version ${x.n}`,pill(x.status==="ok"?"ok":x.status==="review"?"info":x.status==="changes"?"warn":"",x.status==="ok"?"Brief validé":x.status==="review"?"En attente de validation":x.status==="changes"?"Modification demandée":x.status==="old"?"Remplacée":"À envoyer"),`Créée par ${esc(x.by)} le ${esc(x.at)}`,
    `${frBriefDoc(x)}${x.req?`<div class="callout warn">${I.warn}<span><b>Retour de ${esc(x.req.by)}</b> : « ${esc(x.req.note)} » · ${x.req.dims.map(d=>esc(frDimOf(d)[2])).join(", ")}</span></div>`:""}`)).join("");
  let act="";
  if(v&&v.status==="ok") act=`<div class="callout ok">${I.ok}<span><b>✓ Brief validé · ✓ Cadrage terminé.</b> Validé par ${esc(v.decidedBy)} le ${esc(v.decidedAt)}. PO propose maintenant le plan du projet.</span></div>`;
  else if(v&&v.status==="review") act=dir?`<div class="vers"><h3>Le projet est-il assez clair pour que PO organise la suite ?</h3>
      <div class="field"><b>Dimensions à revoir</b><div class="checks">${FR_DIMS.map(([d,n,l])=>`<label><input type="checkbox" id="frq-${d}">${n} · ${esc(l)}</label>`).join("")}</div></div>
      ${ta("frNote","Commentaire","Obligatoire pour demander une modification")}
      <div class="btnrow"><button class="btn" type="button" data-act="frdecide" data-v="ok">Valider le Brief</button><button class="btn out" type="button" data-act="frdecide" data-v="changes">Demander une modification</button></div></div>`:waitRow(holder("direction"),"valider le Brief de cadrage");
  else if(cp&&!open&&(!v||v.status==="changes")) act=`<div class="btnrow"><button class="btn" type="button" data-act="frcreate">${v?`Créer la version ${v.n+1}`:"Créer le Brief"}</button></div>`;
  else if(cp&&v&&v.status==="draft") act=`<div class="btnrow"><button class="btn" type="button" data-act="frsend">Envoyer en validation à ${esc(nameOf(holder("direction")))}</button></div>`;
  else if(open) act=`<p class="note">Le Brief se crée quand les 6 dimensions sont complètes : ${open} point${open>1?"s":""} à traiter dans « Les 6 dimensions ».</p>`;
  return `${cards}${act}`;
}
/* fr4 — the plan: PO proposes, a person changes and launches */
const FR_COLS=[["focus","Focus","Ce qui commence maintenant"],["next","Ensuite","Ce qui suit une étape"],["along","Pendant ce temps","Ce qui avance en parallèle"],["anticip","À anticiper","Ce qu'il faut prévoir"]];
const FR_PLAN=()=>[
 {k:"strategy",wf:"Stratégie",grp:"Marketing",col:"focus",pilot:"cp",due:"Ven. 09/10",why:"Elle décide du dispositif et des livrables"},
 {k:"master",wf:"Master",grp:"",col:"focus",pilot:"cp",due:"Master final le Sam. 21/11",why:"Master final dans 7 semaines : il démarre maintenant"},
 {k:"legal",wf:"Juridique",grp:"",col:"focus",pilot:"cp",due:"Avant le Sam. 21/11",why:"Un emprunt à sécuriser : « Night Lights »"},
 {k:"design",wf:"Conception",grp:"Marketing",col:"next",pilot:"da",due:"",why:"Après la Stratégie"},
 {k:"production",wf:"Production",grp:"Marketing",col:"next",pilot:"charge",due:"Livraison le Sam. 28/11",why:"Après la Conception"},
 {k:"activations",wf:"Activations",grp:"Marketing",col:"next",pilot:"cp",due:"",why:"Après la Stratégie"},
 {k:"distribution",wf:"Distribution",grp:"",col:"anticip",pilot:"cp",due:"Pré-save le Sam. 14/11",why:"Après le Master final"},
 {k:"review",wf:"Suivi & bilan",grp:"Marketing",col:"anticip",pilot:"cp",due:"",why:"Après la sortie"}];
const frPlan=()=>frOf().plan||(frOf().plan={rows:FR_PLAN(),launched:null});
function frPlanView(){
  const p=frPlan(),cp=can("project"),edit=S.form==="frplan"&&!p.launched;
  const card=r=>`<div class="pcard"><span><b>${esc(r.wf)}</b>${r.grp?` <span class="src">· ${esc(r.grp)}</span>`:""}</span><span class="src">${esc(r.why)}</span><span class="src">${esc(nameOf(r.pilot))}${r.due?` · ${esc(r.due)}`:""}</span>
    ${edit?`<div class="grid2"><select class="in" id="fpc-${r.k}" aria-label="Colonne de ${esc(r.wf)}">${FR_COLS.map(([c,l])=>`<option value="${c}" ${r.col===c?"selected":""}>${l}</option>`).join("")}</select><select class="in" id="fpp-${r.k}" aria-label="Pilote de ${esc(r.wf)}">${MEMBERS.map(m=>`<option value="${m}" ${r.pilot===m?"selected":""}>${esc(nameOf(m))}</option>`).join("")}</select></div>`:""}</div>`;
  return `${p.launched?`<div class="callout ok">${I.ok}<span><b>Plan lancé</b> par ${esc(p.launched.by)} le ${esc(p.launched.at)}. Les workflows du Focus et de « Pendant ce temps » ont démarré.</span></div>`:poBox("PO propose l'organisation à partir du Brief validé. Modifiez-la si besoin : rien ne démarre avant « Lancer le plan ».")}
   <div class="plan4">${FR_COLS.map(([c,l,d])=>`<div class="pcol"><h3>${l}</h3><span class="src">${d}</span>${p.rows.filter(r=>r.col===c).map(card).join("")||`<span class="src">—</span>`}</div>`).join("")}</div>
   ${p.launched||!cp?(p.launched?"":waitRow(holder("project"),"lancer le plan du projet")):edit?`<div class="btnrow"><button class="btn" type="button" data-act="frplansave">Enregistrer le plan</button><button class="btn ghost" type="button" data-act="form" data-v="">Annuler</button></div>`:`<div class="btnrow"><button class="btn" type="button" data-act="frlaunch">Lancer le plan</button><button class="btn out" type="button" data-act="form" data-v="frplan">Modifier le plan</button></div>`}`;
}
const FR_STEPS=[
 {id:"fr1",mod:"framing",get title(){const p=S.framePrep;return !p||!p.org?"Démarrer le cadrage":p.org==="call"?"Échange de cadrage":"Départ";},why:"Commencer directement avec PO, ou préparer un échange : les deux chemins mènent au même Brief de cadrage.",exec:"project",coord:null,valid:[],prereq:[]},
 {id:"fr2",mod:"framing",title:"Les 6 dimensions",why:"Ce que le projet sait déjà, ce qui reste à confirmer, ce qui manque. PO pose une question à la fois et ne redemande jamais ce qui est connu.",exec:"project",coord:null,valid:[],prereq:["fr1"]},
 {id:"fr3",mod:"framing",title:"Brief de cadrage",why:"Les 6 dimensions dans un document versionné, avec leurs sources. La direction le valide ; une demande de modification ne rouvre que les dimensions concernées.",exec:"project",coord:null,valid:["direction"],prereq:["fr2"]},
 {id:"fr4",mod:"framing",title:"Plan du projet",why:"Ce qui commence maintenant, ce qui suit, ce qui avance en parallèle, ce qu'il faut prévoir. Rien ne démarre avant « Lancer le plan ».",exec:"project",coord:null,valid:[],prereq:["fr3"]}];
function frDone(id){const fr=frOf(),v=lastOf(fr.brief.versions);
  if(id==="fr1") return prepReady("frame");if(id==="fr2") return !frOpen().length;if(id==="fr3") return !!v&&v.status==="ok";if(id==="fr4") return !!(fr.plan&&fr.plan.launched);}
function frActors(id){const fr=frOf(),v=lastOf(fr.brief.versions),R=holder("project"),A=(r,todo)=>r?[{r,todo,step:id}]:[];
  if(id==="fr1"){if(prepReady("frame")) return [];const g=prepNext("frame");return g?[{...g,todo:g.todo.replace("Choisir comment organiser la préproduction","Démarrer le cadrage").replace("call de production","échange de cadrage"),step:id}]:[];}
  if(id==="fr2"){const n=frOpen().length;return n&&!frFrozen()?A(R,`Répondre à ${n} question${n>1?"s":""} de PO`):[];}
  if(id==="fr3"){if(v&&v.status==="review") return A(holder("direction"),"Valider le Brief de cadrage");if(!v||v.status==="changes") return frOpen().length?[]:A(R,v?`Créer la version ${v.n+1} du Brief`:"Créer le Brief de cadrage");if(v.status==="draft") return A(R,"Envoyer le Brief en validation");return [];}
  if(id==="fr4") return fr.plan&&fr.plan.launched?[]:A(R,"Lancer le plan du projet");}
function frSummary(id){const fr=frOf(),v=lastOf(fr.brief.versions);
  if(id==="fr1"){const p=S.framePrep||{};return p.org==="call"?`Échange du ${prepDay(p.call)}`:"Commencé directement";}
  if(id==="fr2") return `${fr.items.length} informations confirmées`;if(id==="fr3") return v?`Version ${v.n} validée`:"";if(id==="fr4") return fr.plan&&fr.plan.launched?`Lancé le ${fr.plan.launched.at.split(",")[0]}`:"";}
Object.assign(BODY_MK,{fr1:frEntry,fr2:frDims,fr3:frBrief,fr4:frPlanView});
/* A project already framed: every scenario after the start of the project. */
function frSeed(s){
  const fr={items:FR_ITEMS().map(x=>({...x,st:["missing","confirm"].includes(x.st)?"ok":x.st,v:x.v||(x.sug?x.sug[0][0]:x.v),by:"Lina Haddad"})),brief:{versions:[]},plan:null};
  fr.brief.versions.push({n:1,at:"02/10, 16:00",by:"Lina Haddad",status:"ok",decidedBy:"Claire Morel",decidedAt:"03/10, 10:00",snap:fr.items.map(x=>({d:x.d,label:x.label,v:x.v,src:x.src||"Confirmé par Lina Haddad"}))});
  fr.plan={rows:FR_PLAN(),launched:{by:"Lina Haddad",at:"03/10, 11:00"}};
  s.fr=fr;s.framePrep={org:"po",orgBy:"Lina Haddad",orgAt:"01/10, 10:00",call:null,doc:null,items:[],plan:null};
}
/* The call being prepared keeps its date, hour and format at every redraw (adding a
   participant, an agenda point, a refused recap): CONC-001. */
document.addEventListener("input",e=>{const t=e.target;if(!["pcDate","pcHour","pcFmt"].includes(t.id)) return;const b=document.querySelector('[data-act="prepcreate"]');if(!b) return;
  const c=prepOf(b.dataset.k).call;if(!c) return;c.draft=Object.assign({},c.draft,{[t.id==="pcDate"?"date":t.id==="pcHour"?"h":"fmt"]:t.value});});
document.addEventListener("change",e=>{if(e.target.id==="pcFmt") e.target.dispatchEvent(new Event("input",{bubbles:true}));});
/* Motif becomes required as soon as the choice needs one (MKT-001). */
document.addEventListener("change",e=>{const id=e.target.dataset&&e.target.dataset.arb;if(!id) return;const l=document.getElementById("ryl-"+id);if(l) l.textContent=["na","limit"].includes(e.target.value)?"Motif *":"Motif";});
