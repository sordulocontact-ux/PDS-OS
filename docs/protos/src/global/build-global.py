import re,sys,html as _h
ROOT="/Users/smoricet/Documents/GitHub/SORDULO/PDS OS"
DESK="/Users/smoricet/Desktop/Protos PDS OS/"
G=sys.argv[1]
SRC={"marketing":ROOT+"/docs/protos/marketing.html","master":ROOT+"/docs/protos/master-v2.html","legal":ROOT+"/docs/protos/juridique-v2.html","distribution":ROOT+"/docs/protos/distribution.html"}
def part(t,a,b):
    i=t.index(a)+len(a);j=t.index(b,i);return t[i:j]
files={k:open(v,encoding="utf-8").read() for k,v in SRC.items()}
# ---------------- scripts: each engine wrapped in a module function ----------------
API={
"generic":'''
return {P,get S(){return S;},go(k){S=fresh();(SCEN[k]||function(){})();S.flash=null;S.sel=null;},setRole(k){S.role=k;S.sel=null;S.flash=null;S.view="parcours";},
  html(){render0();return app.innerHTML;},actions(){return allActors();},steps(){return STEPS.filter(s=>typeof active!=="function"||active(s));},status(id){return STEPS.some(s=>s.id===id)?statusOf(id):"done";},
  title(id){const s=STEPS.find(x=>x.id===id);return s?s.title:"";},select(id){S.sel=id;S.view="parcours";},log(){return S.log;},blocked(){return typeof wfStatus==="function"&&/Bloqu/.test(wfStatus()[1]||wfStatus());}};
''',
"marketing":'''
return {P,get S(){return S;},go(k){S=scenario(k);},setRole(k){S.role=k;S.flash=null;S.sel=null;S.form=null;S.tab="parcours";},setMod(v){if(S.mod!==v){S.mod=v;S.sel=null;S.tab="parcours";}},mod(){return S.mod;},
  html(){render0();return app.innerHTML;},actions(){return allActions().filter(a=>a.step);},steps(){return steps();},status(id){return statusOf(id);},title(id){const s=STEP(id);return s?s.title:"";},modOf(id){const s=STEP(id);return s?s.mod:"";},
  select(id){const s=STEP(id);if(!s) return;S.mod=s.mod;S.sel=id;S.tab="parcours";if(s.liv) S.liv=s.liv;if(actById(id)) S.actOpen=id;},planLaunched(){return frDone("fr4");},coverDelivered(){return livDelivered("pochette");},log(){return S.log;}};
'''}
import re as _re
_mt=open(SRC["master"],encoding="utf-8").read()
_i=_mt.index('  if(c.stage==="prep") return `<div class="doccard">');_j=_mt.index('"Commencer directement plutôt",{cls:"ghost sm",v:"direct"})}</div>`:""}`;',_i)+len('"Commencer directement plutôt",{cls:"ghost sm",v:"direct"})}</div>`:""}`;')
_k=_mt.index("function briefStartChoice(miss){");_l=_mt.index("\n}\n",_k)+3
PATCH={"master":[(_mt[_i:_j],'  if(c.stage==="prep") return mxPrep(agenda);'),
 (_mt[_k:_l],"""function briefStartChoice(miss){
  const meet=miss.length>=2,why=`Il manque ${miss.length>1?miss.slice(0,-1).join(", ")+" et "+miss[miss.length-1]:miss[0]||"peu de choses"}`;
  const card=(v,t,d,reco)=>`<button class="choice" type="button" data-act="briefstart" data-v="${v}"><span class="eyebrow" style="gap:8px"><b>${t}</b>${reco?pill("info","Recommandé"):""}</span><span class="src">${d}</span></button>`;
  return `<div class="choices2">${card("direct","Commencer directement","Tout ce qui est connu est déjà là. PO pose à Nadia Benali la question de la direction artistique ; vous complétez le reste.",!meet)}${card("exchange","Préparer un échange","Un call avec l'équipe et l'ingénieur ; PO propose ensuite les réponses, avec leurs citations.",meet)}</div>${meet?`<span class="src">${esc(why)} : un échange ira plus vite que des questions séparées.</span>`:""}`;
}
"""),
 ('<b>Call prévu le Mar. 20/10 à 14 h</b> avec Nadia Benali, Mona Lys et Karim Haddou. L\'invitation est partie avec l\'ordre du jour.','<b>Échange prévu le ${esc(frDate(c.date||"2026-10-20"))} à ${esc(c.h||"14:00")}</b> avec ${esc((c.who||["da","mona","karim"]).filter(k=>k!=="cp"&&P[k]).map(k=>P[k].name).join(", "))}. L\'invitation est partie avec l\'ordre du jour.')]}
INJECT={"master":open(G+"/master-patch.js",encoding="utf-8").read()}
def wrap(name,t):
    s=part(t,"<script>","</script>").strip()
    assert s.startswith("(function(){"),name
    s=s[len("(function(){"):]
    assert s.rstrip().endswith("})();"),name
    s=s.rstrip()[:-len("})();")]
    s=s.replace("document.addEventListener(","api.on(")
    for i in ["roleSel","scenSel","resetBtn","app"]:
        s=s.replace(f'document.getElementById("{i}")',f'api.el("{i}")')
    for old,new in PATCH.get(name,[]):
        assert s.count(old)==1,(name,old[:80]);s=s.replace(old,new)
    if name in INJECT: s=s+"\n"+INJECT[name]
    n=s.count("function render(){");assert n==1,(name,n)
    s=s.replace("function render(){","function render(){render0();api.changed();}\nfunction render0(){",1)
    return f"function MOD_{name}(api){{\n{s}\n{API['marketing' if name=='marketing' else 'generic']}}}\n"
scripts="".join(wrap(k,v) for k,v in files.items())
# ---------------- CSS: the Marketing set is the base; others keep only what it lacks ----------------
base=part(files["marketing"],"<style>","</style>")
def classes(css): return set(re.findall(r"\.([a-zA-Z][\w-]*)",re.sub(r"\{[^{}]*\}","{}",css)))
basecls=classes(base)
norm=lambda x:re.sub(r"\s+"," ",x.strip())
basesels=set()
def _collect(css):
    for sel,body,at in rules(css):
        if at and sel.startswith("@media"): _collect(body)
        elif not at: basesels.update(norm(x) for x in sel.split(","))
def rules(css):
    out=[];i=0;n=len(css)
    while i<n:
        j=css.find("{",i)
        if j<0: break
        sel=css[i:j].strip()
        if sel.startswith("@"):
            depth=1;k=j+1
            while depth and k<n:
                if css[k]=="{": depth+=1
                elif css[k]=="}": depth-=1
                k+=1
            out.append((sel,css[j+1:k-1],True));i=k
        else:
            k=css.find("}",j);out.append((sel,css[j+1:k],False));i=k+1
    return out
def scoped(name,css):
    res=[]
    for sel,body,at in rules(css):
        if at:
            if sel.startswith("@media"):
                inner_=scoped(name,body)
                if inner_.strip(): res.append(f"{sel}{{{inner_}}}")
            elif sel.startswith("@keyframes"):
                if sel not in base: res.append(f"{sel}{{{body}}}")
            continue
        sels=[x.strip() for x in sel.split(",")]
        keep=[x for x in sels if norm(x) not in basesels]
        if not keep: continue
        res.append(",".join(f'[data-mod="{name}"] {x}' for x in keep)+"{"+body+"}")
    return "\n".join(res)
_collect(base)
extra="\n".join(f"/* {k}: only what the common set lacks */\n"+scoped(k,part(v,"<style>","</style>")) for k,v in files.items() if k!="marketing")
host_css='''
/* Shared shell */
.wfgrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px}
.wfcard{display:flex;flex-direction:column;gap:6px;align-items:flex-start;text-align:left;padding:16px;border-radius:12px;border:1px solid var(--hair);background:var(--raised);font:inherit;color:inherit;cursor:pointer;min-width:0}
.wfcard .s{font-size:14px;color:var(--text-2)} .wfcard .s.me{color:var(--sel);font-weight:600}
@media (hover:hover) and (pointer:fine){.wfcard:hover{border-color:var(--border)}}
.wfcard:focus-visible{outline:2px solid var(--sel);outline-offset:2px}
.prog{display:block;width:100%;height:4px;border-radius:2px;background:var(--hair);overflow:hidden}.prog>span{display:block;height:100%;background:var(--ok-fg)}
.pmod{display:flex;flex-direction:column;gap:16px}
.portal .pgroup{margin-top:8px}
.mnav{display:none}
@media (max-width:760px){.mnav{display:flex;gap:6px;overflow-x:auto;padding:10px 16px 0;scrollbar-width:none}.mnav::-webkit-scrollbar{display:none}.mnav .chipbtn{flex:none}.mnav .chipbtn[aria-pressed="true"]{border-color:var(--text);background:var(--soft)}}
'''
css=base+"\n"+extra+"\n"+host_css
# ---------------- moments of each workflow for « Aller à » ----------------
def opts(t):
    sel=part(t,'<select id="scenSel">','</select>')
    return re.findall(r'<option value="([^"]+)"[^>]*>([^<]*)</option>',sel)
scens=[("master","Master",opts(files["master"])),("legal","Juridique",opts(files["legal"])),("marketing","Marketing",opts(files["marketing"])),("distribution","Distribution",opts(files["distribution"]))]
import json
scenjs=json.dumps([[n,l,[[v,_h.unescape(x)] for v,x in o]] for n,l,o in scens],ensure_ascii=False)
host=open(G+"/host.js",encoding="utf-8").read()
head=files["marketing"][:files["marketing"].index("<style>")]
head=re.sub(r"<title>[^<]*</title>","<title>Projet complet</title>",head)
head='<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">\n'+head
out=f'''{head}<style>{css}</style>
</head><body>
<div id="app"></div>
<div class="toast" id="toast" role="status" aria-live="polite" hidden></div>
<div class="proto" role="region" aria-label="Commandes du prototype">
  <span class="lbl">Proto</span>
  <label for="roleSel">Voir comme</label><select id="roleSel"></select>
  <label for="scenSel">Aller à</label><select id="scenSel"></select>
  <button type="button" id="resetBtn">Recommencer</button>
</div>
<script>
"use strict";
{scripts}
{host}
bootH({scenjs});
</script>
</body></html>'''
open(ROOT+"/docs/protos/projet.html","w",encoding="utf-8").write(out)
print("ok",len(out.encode())//1024,"KB")
