const { chromium } = require("playwright-core");
const file = "file://" + require("path").join(__dirname, "..", process.env.PROTO || "finance.html");
const FLOWS = {
  dep: ["#/app/finance/depenses", "text=Réparation enceinte >> nth=0", "key:Escape", "[aria-label*='olonnes']", "key:Escape", "text=Sans justificatif", "text=Tous les budgets", "text=Mona Lys >> nth=-1"],
  rap: ["#/app/finance/rapprochement", "hover:main button:has(svg) >> nth=-1", "text=Frais de tenue de compte", "text=Rattacher à…"],
  bud: ["#/app/finance/budgets", "text=PDS MIC #6", "[aria-label='Autres actions']", "key:Escape", "text=Ajouter une dépense"],
  fac: ["#/app/finance/encaissements", "text=FA-2026-031", "text=Marquer envoyée"],
  fin: ["#/app/finance/financements", "[aria-label='Autres actions']", "text=Nouveau crédit Pay Later"],
  jus: ["#/app/finance/justificatifs", "tbody tr >> nth=0", "key:Escape", "text=Déposer"],
};
(async () => {
  const b = await chromium.launch({ channel: "chrome", headless: true });
  for (const [name, steps] of Object.entries(FLOWS)) {
    const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
    const log = [];
    p.on("pageerror", (e) => log.push("ERR " + e.message));
    p.on("filechooser", () => log.push("filechooser"));
    await p.goto(file + steps[0]); await p.waitForTimeout(1500);
    for (const [i, s] of steps.slice(1).entries()) {
      try {
        if (s.startsWith("key:")) await p.keyboard.press(s.slice(4));
        else if (s.startsWith("hover:")) { await p.hover(s.slice(6), { timeout: 4000 }); await p.waitForTimeout(400); }
        else await p.click(s, { timeout: 4000 });
      } catch (e) { log.push(`step ${i} ${s}: ${e.message.split("\n")[0]}`); }
      await p.waitForTimeout(600);
      const st = await p.evaluate(() => ({ h: location.hash, layer: document.getElementById("proto-layer").innerText.slice(0, 60).replace(/\s+/g, " "), tip: document.getElementById("proto-tip").innerText, toast: document.getElementById("proto-toasts").innerText }));
      log.push(`${i} ${s} → ${st.h} | layer: ${st.layer} | tip: ${st.tip} | toast: ${st.toast}`);
      await p.screenshot({ path: `/tmp/finance-proto-${name}-${i}.png` });
    }
    console.log("== " + name + "\n" + log.join("\n"));
    await p.close();
  }
  await b.close();
})();
