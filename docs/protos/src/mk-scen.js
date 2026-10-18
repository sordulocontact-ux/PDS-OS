const newAct=x=>({id:id("act"),k:x.k,mode:x.mode||null,lever:x.lever,title:x.title,kind:x.kind,unit:x.unit,j:x.j,needs:x.needs||null,resp:null,due:null,status:"prep",proof:{state:"todo"},stats:{state:"todo"}});
/* Scenarios: moments of the Marketing of « Néons », built by doing what people did. */
function scenario(k){
  S=fresh();const s=S;
  const L=(text,who,at)=>s.log.unshift({text,who,at});
  s.strat.items=stratItems();s.design.items=[];s.design.refs=[];s.kick.items=kickItems();
  s.base=[2026,9,5,11,0];s.mod="strategy";s.role="cp";
  if(k==="framestart"){s.mod="framing";s.sel="fr1";s.base=[2026,9,1,9,0];return s;}
  if(k==="framebrief"){s.mod="framing";s.base=[2026,9,2,9,0];const fr=frOf();fr.items.forEach(x=>{if(["missing","confirm"].includes(x.st)){x.st="ok";x.v=x.v||x.sug[0][0];x.by="Lina Haddad";}});s.framePrep={org:"po",orgBy:"Lina Haddad",orgAt:"01/10, 10:00"};
    fr.brief.versions.push({n:1,at:"02/10, 16:00",by:"Lina Haddad",status:"review",snap:fr.items.map(x=>({d:x.d,label:x.label,v:x.v,src:x.src||"Confirmé par Lina Haddad"}))});s.role="dg";s.sel="fr3";L("Brief de cadrage V1 envoyé en validation à Claire Morel","Lina Haddad","02/10, 16:05");return s;}
  frSeed(s);
  if(k==="planready"){s.fr.plan={rows:FR_PLAN(),launched:null};s.mod="framing";s.sel="fr4";s.base=[2026,9,3,10,0];return s;}
  if(k==="stratstart"){s.strat.items=[];s.sel="st1";s.base=[2026,9,1,9,0];return s;}
  s.stratPrep={org:"call",orgBy:"Lina Haddad",orgAt:"01/10, 10:00",call:{agenda:dims().map(d=>d.name),date:"2026-10-05",h:"14:00",fmt:"Visio",meet:"https://meet.google.com/neo-strat-pds",created:{by:"Lina Haddad",at:"01/10, 10:05"},held:{at:"05/10, 14:50"}},doc:null,items:[],plan:null};
  L("Échange stratégique créé pour le Lun. 05/10/2026","Lina Haddad","01/10, 10:05");
  if(k==="strat") return s;
  s.strat.items.forEach(x=>{x.state="kept";x.by="Lina Haddad";});L("Les 10 propositions de PO sur les 8 dimensions confirmées","Lina Haddad","05/10, 12:10");
  s.strat.arb.pub="non";s.strat.arbBy.pub="Lina Haddad";s.strat.arb.live="retenu";s.strat.arbBy.live="Lina Haddad";
  L("Dispositif · Publicité en ligne : non retenu","Lina Haddad","06/10, 10:00");L("Dispositif · Live / showcase : retenu","Lina Haddad","06/10, 10:02");
  s.strat.review={round:1,validators:["dg","da"],dec:{},changes:null,at:"06/10, 10:30",by:"Lina Haddad"};L("Brief de sortie envoyé en validation à Claire Morel et Nadia Benali","Lina Haddad","06/10, 10:30");
  if(k==="stratval"){s.role="dg";s.sel="st3";s.base=[2026,9,7,9,0];return s;}
  s.strat.review.dec={dg:{kind:"res",note:"Prévoir un temps fort radio si le titre prend",at:"07/10, 18:00"},da:{kind:"ok",note:"",at:"07/10, 19:10"}};s.strat.validated={v:1,at:"07/10, 19:10"};
  s.tasks.push({id:id("t"),step:"st3",text:"Réserve : Prévoir un temps fort radio si le titre prend",r:"cp",due:null,status:"todo",origin:"Réserve de Claire Morel sur le Brief de sortie"});
  L("Brief de sortie — V1 validé, avec une réserve de Claire Morel","Nadia Benali","07/10, 19:10");
  onStrategyValidated();
  if(k==="designstart"){s.role="cp";s.mod="design";s.sel="de0";s.base=[2026,9,8,9,0];return s;}
  if(k==="actstart"){s.role="cp";s.mod="activations";s.sel="ac0";s.base=[2026,9,8,9,0];return s;}
  // Activations created from the levers, the show kept for later.
  s.actProps.forEach(x=>{if(x.k==="live"){x.state="later";return;}x.mode=x.k==="influence"?"Gestion interne":x.k==="rp"?"Agence externe":null;x.state="created";s.acts.push(newAct(x));});
  L(`${s.acts.length} activations créées depuis le Brief de sortie, le showcase reporté`,"Lina Haddad","08/10, 09:00");
  // Conception: responsable, échange créatif, intentions, références, direction, brief, fiches.
  s.roles.creative="da";s.design.respBy="Lina Haddad";s.design.path="call";s.design.pathBy="Lina Haddad";s.design.call={date:"2026-10-09",fmt:"Sur place",by:"Lina Haddad",at:"08/10, 10:00"};s.design.callDone=true;
  L("Nadia Benali désignée responsable créative · échange créatif créé pour le Ven. 09/10","Lina Haddad","08/10, 10:00");
  s.design.items=designItems();s.design.items.forEach(x=>{x.state="kept";x.by="Nadia Benali";});L("Intentions de l'échange créatif confirmées","Nadia Benali","09/10, 17:30");
  s.design.refs=seedRefs();s.design.refs.find(r=>r.id==="rref6").groups=["Clip officiel"];L("Références rattachées aux livrables","Nadia Benali","10/10, 09:30");
  Object.assign(s.design.dir,{status:"approved",decidedBy:"Claire Morel",decidedAt:"12/10, 11:00",sections:designGroups(),rounds:["Soumise par Nadia Benali le 10/10, 10:00","Validée par Claire Morel le 12/10, 11:00"]});s.design.refs.forEach(r=>{r.validated=true;});L("Direction artistique validée","Claire Morel","12/10, 11:00");
  s.design.brief={v:1,by:"Nadia Benali",at:"12/10, 14:00"};L("Brief créatif V1 établi","Nadia Benali","12/10, 14:00");
  s.design.fiches.forEach(f=>{f.resp="da";f.respBy="Lina Haddad";f.fields.forEach(x=>{if(x.k==="soustitres"&&x.value==null){x.value="Oui, intégrés aux exports";x.edited="Nadia Benali";}});f.status="submitted";f.rounds.push("V1 soumise par Nadia Benali le 12/10, 16:00");});L("Fiches Livrables soumises à Claire Morel","Nadia Benali","12/10, 16:00");
  if(k==="design"){s.role="dg";s.mod="design";s.sel="de3";s.base=[2026,9,13,9,0];return s;}
  s.design.fiches.forEach(f=>{f.status="approved";f.decidedBy="Claire Morel";f.rounds.push("V1 validée par Claire Morel le 13/10, 10:00");f.transferred={by:"Lina Haddad",at:"14/10, 17:00",v:1};});L("Fiches Livrables validées","Claire Morel","13/10, 10:00");
  L("Clip, teasers et pochette transférés en Production","Lina Haddad","14/10, 17:00");
  if(k==="prodstart"){s.prods={clip:{mode:null},teasers:{mode:null},pochette:{mode:null}};s.role="cp";s.mod="production";s.liv="clip";s.sel="pq-clip";s.base=[2026,9,14,17,5];return s;}
  s.prods={clip:{mode:"ext",who:"societe",by:"Lina Haddad",at:"14/10, 17:20",prep:{org:"call",orgBy:"Lina Haddad",orgAt:"14/10, 17:20",call:{agenda:PREP_CALL.ext.agenda.slice(),date:"2026-10-15",h:"14:00",fmt:"Visio",created:{by:"Lina Haddad",at:"14/10, 17:30"},held:{at:"15/10, 15:00"}},doc:null,items:[],plan:null}},teasers:{mode:"decl",who:"societe",by:"Lina Haddad",at:"14/10, 17:22"},pochette:{mode:"int",who:"da",by:"Lina Haddad",at:"14/10, 17:25"}};
  L("Clip : production externe · Studio Ressac ; teasers déclinés du clip ; pochette en interne · Nadia Benali","Lina Haddad","14/10, 17:25");s.liv="clip";
  s.kick.items.forEach((x,i)=>{x.state=i<3?"kept":"discarded";x.by="Lina Haddad";});s.kick.confirmed={by:"Lina Haddad",at:"15/10, 15:40"};s.mod="production";
  s.roles.director="realExt";s.directors={props:[{name:"Bastien Roy",reel:"https://vimeo.com/bastienroy",note:"A tourné de nuit pour deux clips R&B",by:"Studio Ressac",at:"16/10, 11:00",state:"retained",decidedBy:"Lina Haddad"}]};L("Réalisateur retenu : Bastien Roy (proposé par Studio Ressac)","Lina Haddad","16/10, 15:00");
  if(seedProd(k)) return s;
  // The shoot took place on the 23rd: the « 24/10 » information is set aside.
  s.decisions.filter(d=>d.text.startsWith("Tournage possible le 24/10")).forEach(d=>{d.discarded=true;});L("Écarté : « Tournage possible le 24/10 en plus du 23/10 »","Lina Haddad","23/10, 18:00");
  // The cut validated, delivered and closed (Ven. 27/11).
  Object.assign(s.post.versions[0],{status:"approved",int:"approved",ext:"approved",validatedBy:"Nadia Benali et Jade Petit"});
  s.delivery={link:{name:"Neons_Clip_V1_master.mov",by:"Studio Ressac",at:"27/11, 11:00"},confirmed:{to:["cp","da","mgmt"],at:"27/11, 14:00",by:"Lina Haddad"},closed:{at:"27/11, 14:05",by:"Lina Haddad"}};
  L("Montage V1 validé","Nadia Benali","09/11, 10:00");
  // The cover and the teasers, made in parallel and delivered.
  const cov=sampleCover();s.light.pochette={versions:[{n:1,img:cov.url,name:cov.name,w:cov.w,h:cov.h,type:cov.type,by:"Nadia Benali",at:"04/11, 15:00",status:"approved",decidedBy:"Claire Morel"}],checks:{0:true,1:true},controlled:{by:"Tom Mercier",at:"05/11, 10:00"},delivered:{by:"Lina Haddad",at:"05/11, 11:00"}};
  s.light.teasers={versions:[{n:1,url:"https://frame.io/r/neons-teasers-v1",by:"Studio Ressac",at:"16/11, 18:00",status:"approved",decidedBy:"Nadia Benali"}],checks:{},controlled:{by:"Tom Mercier",at:"17/11, 10:00"},delivered:{by:"Lina Haddad",at:"17/11, 11:00"}};
  L("Pochette livrée : pochette validée transmise à la Distribution","Lina Haddad","05/11, 11:00");L("Teasers livrés","Lina Haddad","17/11, 11:00");L("Livraison confirmée à Lina Haddad, Nadia Benali, Jade Petit","Lina Haddad","27/11, 14:00");L("Production clôturée","Lina Haddad","27/11, 14:05");
  const setA=(t,o)=>{const a=s.acts.find(x=>x.title===t);if(a) Object.assign(a,o);};
  setA("Contenus sur les réseaux",{resp:"cp",due:"2026-11-28",status:"closed",proof:{state:"verified",link:"https://www.instagram.com/p/neons-teaser",by:"Lina Haddad",at:"29/11, 10:00"},stats:{state:"declared",value:48200,by:"Lina Haddad",at:"10/12, 09:00"},snaps:[{n:1,value:48200,platform:"Instagram",period:"du 28/11 au 09/12",source:"Relevé sur la plateforme",by:"Lina Haddad",at:"10/12, 09:00"}]});
  setA("Influence · 12 créateurs",{resp:"cp",due:"2026-12-12",status:"done",proof:{state:"given",link:"https://www.tiktok.com/@monalys/video/7431",by:"Lina Haddad",at:"13/12, 18:00"},stats:{state:"todo"}});
  { const a=s.acts.find(y=>y.k==="influence"); if(a){ const offerL={by:"PDS",amount:800,deliverables:"1 vidéo TikTok, 30 s, sur le refrain",organic:"Sur son compte TikTok · republication par Mona Lys",ads:"Spark Ads · 30 jours · +200 € HT",at:"20/11, 10:00"};
    campOf(a).collabs=[
     {k:"lea",stage:"admin",pay:"invoice",concept:{angle:"Sa nuit blanche à Paris, du coucher au lever du jour",format:"1 vidéo TikTok, 30 s, sur le refrain",message:"« Néons » sort le Sam. 05/12"},conceptOk:"Claire Morel",offers:[offerL,{...offerL,by:"Créateur",amount:950,at:"21/11, 09:30"}],accepted:1,token:"k3v9q2lm",agreement:{status:"accepted",at:"21/11, 18:02"},
      versions:[{n:1,url:"https://drive.google.com/neons-lea-v1",at:"01/12, 11:00",status:"changes",notes:[{tc:"0:12",cat:"Mentions",text:"Ajouter la mention partenariat",by:"Nadia Benali"}]},{n:2,url:"https://drive.google.com/neons-lea-v2",at:"02/12, 15:00",status:"ok",notes:[]}],pub:{url:"https://www.tiktok.com/@leamoreau/video/7442",at:"06/12, 19:00",verifiedBy:"Claire Morel"},log:["Ajoutée depuis le Réseau par Lina Haddad le 18/11, 10:00","« Bon pour accord » donné par Léa Moreau le 21/11, 18:02"]},
     {k:"sami",stage:"noanswer",pay:"none",offers:[{...offerL,amount:300,at:"20/11, 10:05"}],versions:[],concept:{angle:"La ville vue depuis le bus de nuit",format:"1 vidéo TikTok",message:"« Néons »"},conceptOk:"Claire Morel",log:["Sans réponse après deux relances"]},
     {k:"noa",stage:"nego",pay:"none",offers:[{...offerL,amount:150,ads:"Non demandés",at:"10/12, 10:00"}],versions:[],concept:{angle:"Un néon par quartier",format:"1 vidéo TikTok, 20 s",message:"« Néons » est sorti"},conceptOk:"Claire Morel",log:[]}];}}
  setA("Relations presse",{resp:"cp",due:"2026-11-28",status:"run",proof:{state:"todo"},stats:{state:"todo"}});
  setA("Pitching playlists",{resp:"cp",due:"2026-11-21",status:"done",proof:{state:"verified",link:"https://open.spotify.com/playlist/neons",by:"Lina Haddad",at:"06/12, 10:00"},stats:{state:"todo"}});
  setA("Sortie du clip",{resp:"da",due:"2026-12-12",status:"done",proof:{state:"todo"},stats:{state:"todo"}});
  { const a=s.acts.find(y=>y.k==="rp"),r=rpOf(a);
    r.cad.status="ok";r.cad.hist=["Version 1 soumise par Lina Haddad le 12/11, 16:00","Version 1 validée par Claire Morel le 13/11, 10:00"];
    const bio=r.kit.sections.find(x=>x.k==="bio");bio.v="Née à Paris en 2003, Mona Lys écrit ses premiers titres à 16 ans et se fait connaître sur TikTok avec « Lune » en 2025.";bio.edited="Lina Haddad";
    r.kit.status="ok";r.kit.validated={v:1,by:"Claire Morel",at:"18/11, 11:00"};r.kit.hist=["V1 soumise par Lina Haddad le 17/11, 17:00","V1 validée par Claire Morel le 18/11, 11:00"];
    if(k==="rpint"){a.mode="Gestion interne";
      const T=(k2,prio,angle,why)=>({k:k2,prio,angle,why,msgs:[],resp:null});r.targets=[T("contrechamp","Haute","Session acoustique","A chroniqué « Lune »"),T("urbania","Haute","Portrait de Mona Lys","Lectorat 18-25 ans"),T("lumen","Moyenne","Session acoustique","Radio de la cible en Île-de-France")];
      r.tpl={subject:"« Néons », le nouveau single de Mona Lys",body:"Bonjour,\n\n{accroche}\n\n« Néons », une nuit blanche à Paris entre deux lumières. Mona Lys sort « Néons » le Sam. 05/12 ; le dossier de presse est joint.\n\nBelle journée,\nLina Haddad",status:"ok"};
      r.targets[0].msgs=[{kind:"first",status:"sent",text:"Camille, je pense au Contrechamp pour une session acoustique : vous aviez chroniqué « Lune » en 2025.",canal:"E-mail",okBy:"Claire Morel, 20/11, 10:00",sent:{by:"Lina Haddad",at:"23/11, 09:30"}}];r.targets[0].resp="positive";
      r.targets[1].msgs=[{kind:"first",status:"ok",text:"Sarah, je pense à Urbania Mag pour un portrait de Mona Lys.",canal:"E-mail",okBy:"Claire Morel, 20/11, 10:05"}];
      r.targets[2].msgs=[{kind:"first",status:"review",text:"Hugo, je pense à Radio Lumen pour une session acoustique en direct.",canal:"E-mail"}];
      r.kit.sent={v:1,at:"23/11, 09:30",how:"envoyé aux médias"};
      r.opps=[{id:"o"+(++uid),t:"contrechamp",type:"Interview",angle:"Session acoustique",stage:"confirmed",slot:{d:"2026-11-30",h:"15:00",f:"En studio",w:"Camille Roy par e-mail"},log:["Réponse positive notée par Lina Haddad le 24/11, 11:00 : interview proposée","Disponibilité de principe · Lina Haddad, 24/11, 15:00","Créneau confirmé · Lina Haddad, 25/11, 10:00"]}];
      L("Relations presse · Le Contrechamp : créneau confirmé","Lina Haddad","25/11, 10:00");
      s.role="cp";s.mod="activations";s.sel=a.id;s.base=[2026,11,1,10,0];return s;}
    const ag=agOf(a),cfg=agCfg(a);r.kit.sent={v:1,at:"19/11, 09:30",how:"transmis à Agence Plume (déclaré par Lina Haddad)"};
    Object.assign(ag,{url:cfg.url,by:"Lina Haddad",at:"19/11, 10:00",map:{...cfg.auto},mapBy:"Lina Haddad",sheetV:1});agApply(a,agPreview(a),"Lina Haddad","19/11, 10:05");
    const D={"Le Contrechamp":["ok",""],"Urbania Mag":["ok",""],"Sillon":["fix","Préciser l'angle : une newsletter ne fait pas de session"],"Le Contrechamp · ligne 6":["no","Doublon de la ligne 2"]};
    ag.rows.forEach(x=>{if(D[x.key]) x.dec={d:D[x.key][0],note:D[x.key][1],by:"Lina Haddad",at:"20/11, 10:00"};});
    ag.decSeq=4;ag.recapSeq=4;ag.recaps=[{at:"20/11, 10:30",by:"Lina Haddad"}];ag.sheetV=2;
    L("Relations presse : récapitulatif envoyé à Agence Plume (envoi déclaré)","Lina Haddad","20/11, 10:30"); }
  L("Sortie du clip : réalisée déclarée","Nadia Benali","12/12, 18:00");L("Influence · 12 créateurs : preuve fournie","Lina Haddad","13/12, 18:00");
  if(k==="agency"){const a=s.acts.find(y=>y.k==="influence");delete a.camp;a.mode="Agence externe";const ag=agOf(a),cfg=agCfg(a);
    Object.assign(ag,{url:cfg.url,by:"Lina Haddad",at:"16/11, 10:00",map:{...cfg.auto},mapBy:"Lina Haddad",sheetV:1});agApply(a,agPreview(a),"Lina Haddad","16/11, 10:05");
    const D={"@jadecrm":["ok",""],"@maliksow":["ok",""],"@lou.arnaud":["discuss","Budget : 700 € pour 156 000 abonnés, à négocier"],"@yanisfrd":["info","Nombre d'abonnés illisible dans leur tableau"],"@claranguyen":["no","Univers trop éloigné du titre"]};
    ag.rows.forEach(r=>{if(D[r.key]) r.dec={d:D[r.key][0],note:D[r.key][1],by:"Lina Haddad",at:"17/11, 11:00"};});
    ag.decSeq=5;ag.recapSeq=5;ag.recaps=[{at:"17/11, 11:30",by:"Lina Haddad"}];ag.sheetV=2;
    L("Influence · 12 créateurs : récapitulatif envoyé à Agence Halo (envoi déclaré)","Lina Haddad","17/11, 11:30");
    s.role="cp";s.mod="activations";s.sel=a.id;s.base=[2026,11,14,10,0];return s;}
  if(k==="acts"){s.role="cp";s.mod="activations";s.sel=null;s.base=[2026,11,14,10,0];return s;}
  // Four weeks after the release: every activation closed.
  const fin={"Contenus sur les réseaux":48200,"Influence · 12 créateurs":312000,"Relations presse":14,"Pitching playlists":9,"Sortie du clip":186000};
  s.acts.forEach(a=>{a.resp=a.resp||"cp";a.due=a.due||"2026-12-19";a.status="closed";a.closedBy=nameOf(a.resp);
    a.proof={state:a.title==="Relations presse"?"given":"verified",link:a.proof.link||"https://drive.google.com/neons-preuves",by:nameOf(a.resp),at:"20/12, 10:00"};
    a.stats=fin[a.title]?{state:"declared",value:fin[a.title],by:nameOf(a.resp),at:"02/01, 10:00"}:{state:"na",by:nameOf(a.resp)};
    if(fin[a.title]) a.snaps=[{n:1,value:fin[a.title],platform:a.k==="rp"?"Presse":a.k==="playlists"?"Spotify":a.k==="clip"?"YouTube":"TikTok",period:"du 05/12 au 02/01",source:a.k==="influence"?"Déclaré par le créateur":"Relevé sur la plateforme",by:nameOf(a.resp),at:"02/01, 10:00"}];});
  L("Toutes les activations clôturées","Lina Haddad","02/01, 11:00");
  if(k==="bilan"){s.role="cp";s.mod="review";s.base=[2027,0,5,10,0];return s;}
  return s;
}
