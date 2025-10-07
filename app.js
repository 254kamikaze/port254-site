// app.js v1.1 — resilient loader with on-page error + fallback
const state = { all: [], shown: [], q: "", domain: "", sort: "title-asc" };
const els = {
  grid: document.getElementById("grid"),
  q: document.getElementById("q"),
  sort: document.getElementById("sort-select"),
  statTotal: document.getElementById("stat-total"),
  statDomains: document.getElementById("stat-domains"),
  statShowing: document.getElementById("stat-showing"),
  statHigh: document.getElementById("stat-high"),
};

init();

async function init(){
  try {
    const res = await fetch("./tests.json?v=2", { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) throw new Error("Empty or invalid JSON array");
    state.all = data;
    console.log(`Loaded ${data.length} tests.json records`);
  } catch (err) {
    console.warn("tests.json failed, using embedded fake data:", err);
    state.all = fakeData();
    toastError(`Couldn’t load tests.json (${err.message}). Using demo data.`);
  }
  bindUI();
  applyAndRender();
}

function bindUI(){
  els.q?.addEventListener("input", e => { state.q = e.target.value.trim().toLowerCase(); applyAndRender(); });
  els.sort?.addEventListener("change", e => { state.sort = e.target.value; applyAndRender(); });
  document.querySelectorAll(".filter-btn").forEach(btn=>{
    btn.addEventListener("click", () => {
      document.querySelectorAll(".filter-btn").forEach(b=>b.classList.remove("active"));
      btn.classList.add("active");
      state.domain = btn.dataset.domain || "";
      applyAndRender();
    });
  });
  window.addEventListener("port254:sortChanged", ev => { state.sort = ev.detail; applyAndRender(); });
}

function applyAndRender(){
  const filtered = state.all.filter(t=>{
    if (state.domain && t.domain !== state.domain) return false;
    if (!state.q) return true;
    const hay = [
      t.title, t.category, t.criticality, t.domain,
      ...(t.tags||[]), ...(t.mitre_attack_ids||[]), ...(t.iec62443_controls||[]),
      t.description||"", t.id||""
    ].join(" ").toLowerCase();
    return hay.includes(state.q);
  });

  filtered.sort(sorter(state.sort));
  renderCards(filtered);
  renderStats(filtered);
}

function sorter(mode){
  if (mode === "title-desc") return (a,b)=>b.title.localeCompare(a.title);
  if (mode === "category") return (a,b)=>a.category.localeCompare(b.category)||a.title.localeCompare(b.title);
  if (mode === "criticality"){
    const rank = k=>({critical:1,high:2,medium:3,low:4}[k]||9);
    return (a,b)=>rank(a.criticality)-rank(b.criticality)||a.title.localeCompare(b.title);
  }
  if (mode === "recent") return (a,b)=>new Date(b.added_at)-new Date(a.added_at);
  return (a,b)=>a.title.localeCompare(b.title);
}

function renderCards(list){
  if (!els.grid) return;
  if (!list.length){
    els.grid.innerHTML = `<div class="card"><div class="title">No matches</div><div class="path">Try different filters or query</div></div>`;
    return;
  }
  els.grid.innerHTML = list.map(cardHTML).join("");
}

function cardHTML(t){
  const pills = (arr)=> (arr||[]).map(x=>`<span class="badge">${x}</span>`).join(" ");
  const links = [
    t.kibana_url ? `<a href="${t.kibana_url}" target="_blank">Kibana</a>` : "",
    t.youtube_url ? `<a href="${t.youtube_url}" target="_blank">YouTube</a>` : "",
    t.kml_url ? `<a href="${t.kml_url}" target="_blank">KML</a>` : ""
  ].filter(Boolean).join(" • ");

  return `
  <div class="card">
    <div class="title">${t.title}</div>
    <div class="small" style="margin:-2px 0 6px;opacity:.85">
      <strong>${t.category}</strong> • ${t.domain.toUpperCase()} • <em>${t.criticality.toUpperCase()}</em>
    </div>
    <div class="path">${t.description||""}</div>
    <div style="margin:8px 0 6px">${pills(t.mitre_attack_ids)} ${pills(t.iec62443_controls)}</div>
    <div class="small">${links}</div>
  </div>`;
}

function renderStats(list){
  const domains = new Set(state.all.map(t=>t.domain));
  const high = list.filter(t=>["high","critical"].includes(t.criticality)).length;
  els.statTotal.textContent = state.all.length;
  els.statDomains.textContent = domains.size;
  els.statShowing.textContent = list.length;
  els.statHigh.textContent = high;
}

function toastError(msg){
  if (!els.grid) return;
  const note = document.createElement("div");
  note.className = "card";
  note.innerHTML = `<div class="title">Notice</div><div class="path">${msg}</div>`;
  els.grid.prepend(note);
}

function fakeData(){
  return [
    {"id":"ot-001","title":"S7 Session Failure Storm (simulated)","domain":"ot","category":"Network","criticality":"high","added_at":"2025-10-07T00:00:00Z","tags":["s7","plc","conpot"],"mitre_attack_ids":["T1110"],"iec62443_controls":["SR 1.1"],"description":"Simulated repeated S7 session failures from a single IP.","kibana_url":"#","youtube_url":"#","kml_url":"kml/plant.kml"},
    {"id":"ot-002","title":"Modbus Read Flood (simulated)","domain":"ot","category":"Protocol Abuse","criticality":"medium","added_at":"2025-10-05T00:00:00Z","tags":["modbus","flood"],"mitre_attack_ids":["T1040"],"iec62443_controls":["SR 3.2"],"description":"Fake Modbus read spike for UI layout.","kibana_url":"#","youtube_url":"#","kml_url":"kml/plant.kml"},
    {"id":"fin-001","title":"Cardholder Geo-Velocity Spike (demo)","domain":"fintech","category":"Fraud","criticality":"critical","added_at":"2025-10-06T00:00:00Z","tags":["card","velocity","geo"],"mitre_attack_ids":["T1078"],"iec62443_controls":["SR 5.2"],"description":"Demo-only distant card usage within minutes.","kibana_url":"#","youtube_url":"#","kml_url":"kml/branches.kml"},
    {"id":"fin-002","title":"Account Takeover — Unusual Login Pattern","domain":"fintech","category":"Auth","criticality":"high","added_at":"2025-09-01T00:00:00Z","tags":["ato","login"],"mitre_attack_ids":["T1078"],"iec62443_controls":["SR 7.6"],"description":"Simulated ATO pattern for UI testing.","kibana_url":"#","youtube_url":"#","kml_url":"kml/branches.kml"}
  ];
}
