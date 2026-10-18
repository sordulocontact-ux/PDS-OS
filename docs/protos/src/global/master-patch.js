/* Shared call form, as in the Cadrage and the Marketing: attendees as chips (type a name, Enter adds,
   × or Backspace removes), agenda edited in place with icons and reordered, a recap before creating. */
const MXI={edit:'<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.5 2.5l3 3L6 13H3v-3z"/><path d="M9 4l3 3"/></svg>',
  trash:'<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 4.5h11M6 4.5V3h4v1.5M4 4.5l.7 9h6.6l.7-9M6.7 7v4M9.3 7v4"/></svg>',
  up:'<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 10l4-4 4 4"/></svg>',
  down:'<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 6l4 4 4-4"/></svg>'};
const mxIb=(act,label,icon,extra)=>`<button class="ib" type="button" data-act="${act}" ${extra||""} aria-label="${esc(label)}" title="${esc(label.split(" «")[0])}">${icon}</button>`;
const mxTag=k=>P[k].where==="app"?"Équipe":P[k].where==="lien"?"Invitation sur son lien privé":"Invitation par e-mail";
function mxChips(c,ed){return `<div class="chips${ed?"":" ro"}">${c.who.map((k,i)=>`<span class="chip" title="${esc(P[k].role)} · ${esc(mxTag(k))}"><span class="avatar sm" aria-hidden="true">${esc(P[k].ini||P[k].name.split(" ").map(w=>w[0]).join("").slice(0,2))}</span><span>${esc(P[k].name)}</span>${P[k].where!=="app"?`<span class="cap">externe</span>`:""}${ed?`<button type="button" class="chipx" data-act="mxwdel" data-i="${i}" aria-label="Retirer ${esc(P[k].name)}">${I.x}</button>`:""}</span>`).join("")}${ed?`<input id="mxWhoQ" class="chipin" placeholder="Ajouter" autocomplete="off">`:""}</div>`;}
function mxPrep(ag){
  const c=S.brief.call,own=me()==="cp";
  if(!c.who) c.who=["cp","da","mona",S.eng.mix||"karim"].filter((x,i,a)=>P[x]&&a.indexOf(x)===i);
  if(!c.agenda) c.agenda=ag.map(x=>x[0]);
  if(!c.date){c.date="2026-10-20";c.h="14:00";c.fmt="Visio";}
  const facts=`<div class="rows">${fact("Objectif","<b>Compléter le Brief mix et master avec ce qu'il ne sait pas encore</b>","Calculé depuis le Brief")}${fact("Documents","Brief_Mix_Master_Neons.pdf · version en cours","Brief")}</div>`;
  if(!own) return `<div class="vers"><h3>Échange en préparation</h3><div class="rows">${fact("Participants",c.who.map(k=>esc(P[k].name)).join(", "),"")}${fact("Ordre du jour",c.agenda.map((x,i)=>`${i+1}. ${esc(x)}`).join(" · "),"")}</div></div>`;
  if(c.recap) return `<div class="vers"><h3>Récapitulatif avant création</h3><div class="rows">${fact("Quand",`${esc(frDate(c.date))} à ${esc(c.h)} · ${esc(c.fmt)}`,"")}${fact("Participants",mxChips(c,false),"")}${fact("Ordre du jour",c.agenda.map((x,i)=>`${i+1}. ${esc(x)}`).join(" · "),"")}</div>
    <span class="src">Les invitations partent à la confirmation${c.who.some(k=>P[k].where!=="app")?" : "+c.who.filter(k=>P[k].where!=="app").map(k=>esc(P[k].name)).join(", ")+(c.who.filter(k=>P[k].where!=="app").length>1?" sont externes":" est externe"):""}.</span>
    <div class="btnrow">${btn("mxok","Confirmer et inviter")}${btn("mxback","Modifier",{cls:"ghost"})}</div></div>`;
  const pool=Object.keys(P).filter(k=>!c.who.includes(k)&&["cp","da","dg","mona","karim","lea","hugo","arp"].includes(k));
  const rows=c.agenda.map((x,i)=>S.draft.mxEdit===i?`<div class="irow"><span class="grow" style="display:flex;align-items:center;gap:8px">${i+1}.<input class="in" id="mxAgE" value="${esc(x)}" aria-label="Point ${i+1}"></span><span class="iconrow">${mxIb("mxagsave","Enregistrer",I.check,`data-i="${i}"`)}${mxIb("mxagcancel","Annuler",I.x,"")}</span></div>`
    :`<div class="irow"><span class="grow">${i+1}. ${esc(x)}</span><span class="iconrow">${i>0?mxIb("mxagmove",`Monter « ${x} »`,MXI.up,`data-i="${i}" data-v="-1"`):""}${i<c.agenda.length-1?mxIb("mxagmove",`Descendre « ${x} »`,MXI.down,`data-i="${i}" data-v="1"`):""}${mxIb("mxagedit",`Modifier « ${x} »`,MXI.edit,`data-i="${i}"`)}${mxIb("mxagdel",`Retirer « ${x} »`,MXI.trash,`data-i="${i}"`)}</span></div>`).join("");
  return `<div class="vers"><h3>Nouvel échange</h3>
    <div class="field"><label for="mxWhoQ">Participants *</label><div class="attend">${mxChips(c,true)}${pool.length?`<div class="sugg" role="listbox">${pool.map(k=>`<button type="button" role="option" data-act="mxwadd" data-v="${k}" data-n="${esc(P[k].name.toLowerCase())}"><span class="avatar sm" aria-hidden="true">${esc(P[k].ini||"")}</span><span class="grow"><b>${esc(P[k].name)}</b> <span class="src">· ${esc(P[k].role)}</span></span><span class="src">${P[k].where==="app"?"Équipe":"Externe"}</span></button>`).join("")}</div>`:""}</div>${S.err.mxWho?`<span class="err" role="alert">${esc(S.err.mxWho)}</span>`:""}</div>
    <div class="grid3"><div class="field"><label for="mxDate">Date *</label><input class="in" type="date" id="mxDate" value="${esc(c.date)}"></div><div class="field"><label for="mxHour">Heure *</label><input class="in" type="time" id="mxHour" value="${esc(c.h)}"></div><div class="field"><label for="mxFmt">Format</label><select class="in" id="mxFmt"><option ${c.fmt==="Sur place"?"":"selected"}>Visio</option><option ${c.fmt==="Sur place"?"selected":""}>Sur place</option></select></div></div>
    <div class="vers"><h3>Ordre du jour</h3><div class="rows">${rows}</div><div class="btnrow"><input class="in" id="mxAdd" placeholder="Ajouter un point" style="flex:1 1 220px"><button class="btn out sm" type="button" data-act="mxagadd">Ajouter</button></div></div>
    <div class="vers"><h3>Envoyé avec l'invitation</h3>${facts}<span class="src">L'ordre du jour vient de ce que le Brief ne sait pas encore.</span></div>
    <div class="btnrow">${btn("mxrecap","Voir le récapitulatif")}${btn("briefstart","Commencer directement plutôt",{cls:"ghost sm",v:"direct"})}</div></div>`;
}
const mxFocus=()=>setTimeout(()=>{const i=document.getElementById("mxWhoQ");if(i) i.focus();},0);
api.on("click",e=>{const el=e.target.closest&&e.target.closest("[data-act]");if(!el||!/^mx/.test(el.dataset.act)) return;const c=S.brief.call,a=el.dataset.act,i=+el.dataset.i;S.err={};
  const grab=()=>{const d=document.getElementById("mxDate"),h=document.getElementById("mxHour"),f=document.getElementById("mxFmt");if(d) c.date=d.value;if(h) c.h=h.value;if(f) c.fmt=f.value;};
  if(a==="mxwadd"){grab();c.who.push(el.dataset.v);mxFocus();}
  else if(a==="mxwdel"){grab();c.who.splice(i,1);mxFocus();}
  else if(a==="mxagmove"){grab();const t=i+(+el.dataset.v);c.agenda.splice(t,0,c.agenda.splice(i,1)[0]);}
  else if(a==="mxagedit"){grab();S.draft.mxEdit=i;setTimeout(()=>{const x=document.getElementById("mxAgE");if(x){x.focus();x.select();}},0);}
  else if(a==="mxagsave"){const v=(document.getElementById("mxAgE")||{}).value||"";if(v.trim()) c.agenda[i]=v.trim();S.draft.mxEdit=null;}
  else if(a==="mxagcancel"){S.draft.mxEdit=null;}
  else if(a==="mxagdel"){grab();c.agenda.splice(i,1);}
  else if(a==="mxagadd"){grab();const v=(document.getElementById("mxAdd")||{}).value||"";if(v.trim()) c.agenda.push(v.trim());}
  else if(a==="mxrecap"){grab();if(c.who.length<2){S.err.mxWho="Un échange réunit au moins deux personnes.";}else c.recap=true;}
  else if(a==="mxback"){c.recap=false;}
  else if(a==="mxok"){const before=snap();c.recap=false;c.stage="planned";hist("brief",`Échange créé pour le ${frDate(c.date)} à ${c.h} · invitations envoyées à ${c.who.filter(k=>k!=="cp").map(k=>P[k].name).join(", ")}`);after("brief","Échange créé",before);}
  render();e.stopImmediatePropagation();},true);
api.on("input",e=>{if(e.target.id!=="mxWhoQ") return;const q=e.target.value.trim().toLowerCase();document.querySelectorAll(".sugg button[data-n]").forEach(b=>{b.hidden=!!q&&!b.dataset.n.split(" ").some(w=>w.startsWith(q));});});
api.on("keydown",e=>{if(e.target.id==="mxAgE"){if(e.key==="Enter"){e.preventDefault();document.querySelector('[data-act="mxagsave"]').click();}else if(e.key==="Escape"){e.preventDefault();S.draft.mxEdit=null;render();}return;}
  if(e.target.id!=="mxWhoQ") return;const vis=[...document.querySelectorAll(".sugg button[data-n]")].filter(x=>!x.hidden);
  if(e.key==="Enter"&&vis[0]){e.preventDefault();vis[0].click();}else if(e.key==="Backspace"&&!e.target.value){const x=[...document.querySelectorAll(".chips .chipx")].pop();if(x){e.preventDefault();x.click();}}});
