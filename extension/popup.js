fetch("tools.json").then((r) => r.json()).then(({ site, groups }) => {
  const list = document.getElementById("list"), q = document.getElementById("q");
  const render = (term) => {
    list.textContent = "";
    const t = term.trim().toLowerCase(); let n = 0;
    for (const g of groups) {
      const items = g.tools.filter((x) => !t || (x.title + " " + x.desc).toLowerCase().includes(t));
      if (!items.length) continue;
      const h = document.createElement("h2"); h.textContent = g.title; list.append(h);
      for (const x of items) {
        n++; const a = document.createElement("a"); a.href = `${site}/${x.slug}?source=extension`; a.target = "_blank"; a.rel = "noopener";
        a.textContent = x.title; const s = document.createElement("small"); s.textContent = x.desc; a.append(s); list.append(a);
      }
    }
    if (!n) { const p = document.createElement("p"); p.textContent = "No tools match."; list.append(p); }
  };
  q.addEventListener("input", () => render(q.value)); render("");
  q.addEventListener("keydown", (e) => { if (e.key === "Enter") list.querySelector("a")?.click(); });
});
