// Simple state
let TESTS = [];
let filtered = [];
let currentQuick = "all";
let adv = { domain:"", severity:"", attack:"", iec:"" };

// Load data
(async function init(){
  const res = await fetch("../tests.json").catch(()=>fetch("tests.json"));
  TESTS = await res.json();
  filtered = TESTS.slice();
  hydrateStats();
  populateAdvancedDropdowns();
  bindUI();
  renderGrid();
})();

function bindUI(){
  const q = el("#search");
  q.addEventListener("input", ()=>{ renderGrid(searchFilter(q.value.trim().toLowerCase())); });

  // Advanced panel
  const advBtn = el("#advanced-search-btn");
  const advPanel = el("#advanced-search-panel");
  advBtn.onclick = ()=> advPanel.classList.toggle("open");

  // Quick buttons
  $all(".filter-btn").forEach(b=>{
    b.onclick = ()=>{
      $all(".filter-btn").forEach(x=>x.classList.remove("active"));
      b.classList.add("active");
      currentQuick = b.dataset.filter;
      renderGrid();
    };
  });

  // Sort
  el("#sort-select").onchange = ()=> renderGrid();

  // Advanced selects
  el("#apply-filters").onclick = ()=>{
    adv.domain   = el("#filter-category").value;
    adv.severity = el("#filter-criticality").value;
    adv.attack   = el("#filter-attack-technique").value;
    adv.iec      = el("#filter-hive").value;
    renderGrid();
  };
  el("#clear-filters").onclick = ()=>{
    ["filter-category","filter-criticality","filter-attack-technique","filter-hive"].forEach(id=> el("#"+id).value="");
    adv = { domain:"", severity:"", attack:"", iec:"" };
    renderGrid();
  };
}

// Helpers
const el = s=>document.querySelector(s);
const $all = s=>Array.from(document.querySelectorAll(s));

function hydrateStats(){
  el("#total-artifacts").textContent = TESTS.length;
  el("#total-categories").textContent = new Set(TESTS.map(t=>t.domain)).size;
  el("#high-criticality").textContent =
    TESTS.filter(t=>["high","critical"].includes((t.severity||"").toLowerCase())).length;
  el("#visible-artifacts").textContent = TESTS.length;
}

function populateAdvancedDropdowns(){
  // ATT&CK techniques
  const atk = [...new Set(TESTS.map(t=>t.technique).filter(Boolean))].sort();
  const selAtk = el("#filter-attack-technique");
  atk.forEach(v=>{
    const o=document.createElement("option"); o.value=v; o.textContent=v; selAtk.appendChild(o);
  });
  // IEC controls
  const iec = [...new Set(TESTS.flatMap(t=>t.iec||[]))].sort();
  const selI = el("#filter-hive");
  iec.forEach(v=>{
    const o=document.createElement("option"); o.value=v; o.textContent=v; selI.appendChild(o);
  });
}

function applyFilters(list){
  let items = list.slice();

  // Quick domain
  if(currentQuick !== "all"){
    items = items.filter(t=>t.domain === currentQuick);
  }

  // Advanced
  if(adv.domain)   items = items.filter(t=>t.domain===adv.domain);
  if(adv.severity) items = items.filter(t=>(t.severity||"").toLowerCase()===adv.severity);
  if(adv.attack)   items = items.filter(t=>t.technique===adv.attack);
  if(adv.iec)      items = items.filter(t=>(t.iec||[]).includes(adv.iec));

  // Sort
  const sort = el("#sort-select").value;
  if(sort==="title") items.sort((a,b)=>a.title.localeCompare(b.title));
  if(sort==="title-desc") items.sort((a,b)=>b.title.localeCompare(a.title));
  if(sort==="category") items.sort((a,b)=>a.domain.localeCompare(b.domain));
  if(sort==="criticality"){
    const rank = {critical:0,high:1,medium:2,low:3};
    items.sort((a,b)=> (rank[(a.severity||"").toLowerCase()] ?? 9) - (rank[(b.severity||"").toLowerCase()] ?? 9));
  }

  return items;
}

function searchFilter(q){
  if(!q) return TESTS;
  return TESTS.filter(t=>{
    const blob = [
      t.id,t.title,t.description,t.domain,t.technique,(t.iec||[]).join(" "), (t.tags||[]).join(" ")
    ].join(" ").toLowerCase();
    return blob.includes(q);
  });
}

function renderGrid(baseList){
  const list = applyFilters(baseList || TESTS);
  const grid = el("#registry-grid");
  grid.innerHTML = "";
  if(!list.length){
    grid.innerHTML = `<div class="empty-state"><h3>No tests match your filters.</h3><p>Try clearing filters or changing the search query.</p></div>`;
  }else{
    list.forEach(t=> grid.appendChild(card(t)) );
  }
  el("#visible-artifacts").textContent = list.length;
}

function card(t){
  const wrap = document.createElement("div");
  wrap.className = "registry-item";
  wrap.innerHTML = `
    <div class="item-header">
      <div class="item-badges">
        <span class="item-category">${t.domain||"—"}</span>
        <span class="item-criticality ${(t.severity||'').toLowerCase()}">${(t.severity||'').toUpperCase()}</span>
        ${t.technique?`<span class="item-category">${t.technique}</span>`:""}
      </div>
      <h3 class="item-title">${t.id} — ${t.title}</h3>
    </div>
    <p class="item-description">${t.description||""}</p>
    <div class="item-tags">${(t.tags||[]).map(s=>`<span class="item-tag">${s}</span>`).join("")}</div>
    <div class="item-footer">
      <div class="item-meta">${(t.iec||[]).join(", ")||"&nbsp;"}</div>
      <div class="item-arrow">→</div>
    </div>
  `;
  wrap.onclick = ()=> openModal(t);
  return wrap;
}

/* ===== Modal (simple) ===== */
function openModal(t){
  const m = el("#modal");
  m.innerHTML = `
    <div class="enhanced-modal">
      <div class="close-modal" onclick="document.getElementById('modal').style.display='none'">✕</div>
      <div class="modal-main">
        <div class="modal-header-enhanced">
          <div class="artifact-title">${t.id} — ${t.title}</div>
          <div class="artifact-badges">
            <span class="badge badge-category">${t.domain}</span>
            <span class="badge badge-criticality">${(t.severity||'').toUpperCase()}</span>
            ${t.technique?`<span class="badge badge-category">${t.technique}</span>`:""}
          </div>
          <div class="artifact-paths">${(t.iec||[]).join(", ")||"—"}</div>
          <p>${t.description||""}</p>
        </div>
        <div class="modal-content-area">
          <div class="info-card">
            <h3>Quick query (KQL)</h3>
            <pre class="example-item" style="white-space:pre-wrap">${escapeHtml(t.kql||"")}</pre>
            <div style="margin-top:8px;display:flex;gap:8px">
              <button class="btn-primary" onclick="copyText(\`${escapeBackticks(t.kql||'')}\`)">Copy KQL</button>
              ${t.video ? `<a class="btn-secondary" target="_blank" href="${t.video}">Watch demo</a>` : ""}
            </div>
          </div>

          <div class="info-card">
            <h3>Sigma (pseudo)</h3>
            <pre class="example-item" style="white-space:pre-wrap">${escapeHtml(t.sigma||"")}</pre>
          </div>

          <div class="info-card">
            <h3>Playbook overview</h3>
            <ul class="correlation-list">
              ${(t.playbook||[]).map(x=>`<li>${escapeHtml(x)}</li>`).join("")}
            </ul>
          </div>

          <div class="info-card">
            <h3>Assets required</h3>
            <div class="tag-grid">
              ${(t.assets||[]).map(x=>`<span class="tag">${escapeHtml(x)}</span>`).join("")}
            </div>
          </div>

          ${t.notes ? `
          <div class="limitations-section">
            <div class="limitations-header">
              <div class="limitations-title">Notes</div>
            </div>
            <ul class="limitations-list"><li>${escapeHtml(t.notes)}</li></ul>
          </div>` : ""}

        </div>
      </div>
    </div>`;
  m.style.display = "block";
}

function copyText(txt){ navigator.clipboard.writeText(txt); }
function escapeHtml(s){ return (s||"").replace(/[&<>]/g,m=>({ "&":"&amp;","<":"&lt;",">":"&gt;" }[m])); }
function escapeBackticks(s){ return (s||"").replace(/`/g,"\\`"); }
