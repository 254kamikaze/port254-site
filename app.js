/* ======= config ======= */
// If you set API_BASE (e.g. "https://orch.example.com") and API_KEY, the Run button enables.
// Leave API_BASE empty to hide Run.
const CONFIG = {
  API_BASE: "",                  // e.g. "https://orch.yourdomain.com"
  API_KEY:  "",                  // set your x-api-key
  KIBANA_BASE: "",               // e.g. "https://elk.example.com:5601"
  // Build a Kibana Discover URL for a run_id; adjust index pattern if needed
  buildKibanaUrl(runId){
    if (!this.KIBANA_BASE) return "";
    const query = encodeURIComponent(`run_id:"${runId}"`);
    return `${this.KIBANA_BASE}/app/discover#/?_a=(query:(language:kuery,query:'${query}'))`;
  }
};
/* ======================= */

const els = {
  grid: document.getElementById('grid'),
  drawer: document.getElementById('drawer'),
  dTitle: document.getElementById('dTitle'),
  dDomain: document.getElementById('dDomain'),
  dSeverity: document.getElementById('dSeverity'),
  dTechnique: document.getElementById('dTechnique'),
  dIEC: document.getElementById('dIEC'),
  dDesc: document.getElementById('dDesc'),
  dKql: document.getElementById('dKql'),
  dSigma: document.getElementById('dSigma'),
  dPlaybook: document.getElementById('dPlaybook'),
  dAssets: document.getElementById('dAssets'),
  dNotes: document.getElementById('dNotes'),
  dVideo: document.getElementById('dVideo'),
  openKibana: document.getElementById('openKibana'),
  runBtn: document.getElementById('runBtn'),
  runHint: document.getElementById('runHint'),
  copyKql: document.getElementById('copyKql'),
  search: document.getElementById('search'),
  tags: document.getElementById('tags'),
  severityFilter: document.getElementById('severityFilter'),
  statTotal: document.getElementById('statTotal'),
  statOT: document.getElementById('statOT'),
  statFIN: document.getElementById('statFIN')
};

let TESTS = [];
let active = null;
let selectedTags = new Set();

fetch('tests.json').then(r=>r.json()).then(data=>{
  TESTS = data;
  renderStats();
  buildTagCloud();
  renderGrid();
});

function renderStats(){
  els.statTotal.textContent = TESTS.length;
  els.statOT.textContent = TESTS.filter(t=>t.domain==='OT').length;
  els.statFIN.textContent = TESTS.filter(t=>t.domain==='FinTech').length;
}

function buildTagCloud(){
  const all = new Set(TESTS.flatMap(t=>t.tags||[]));
  els.tags.innerHTML = '';
  [...all].sort().forEach(tag=>{
    const b = document.createElement('button');
    b.textContent = tag;
    b.className = 'badge';
    b.onclick = ()=>{
      selectedTags.has(tag) ? selectedTags.delete(tag) : selectedTags.add(tag);
      b.classList.toggle('sev-high');
      renderGrid();
    };
    els.tags.appendChild(b);
  });
}

function matchesFilters(t){
  const q = els.search.value.trim().toLowerCase();
  const sev = els.severityFilter.value;
  const inTxt = (s)=> (s||'').toLowerCase().includes(q);
  const textBlob = [t.id,t.title,t.description,t.technique,(t.iec||[]).join(' '), (t.tags||[]).join(' ')].join(' ');
  const tagOk = selectedTags.size===0 || (t.tags||[]).some(x=>selectedTags.has(x));
  const sevOk = !sev || (t.severity||'').toLowerCase()===sev;
  const qOk = !q || inTxt(textBlob);
  return tagOk && sevOk && qOk;
}

function renderGrid(){
  els.grid.innerHTML = '';
  TESTS.filter(matchesFilters).forEach(t=>{
    const card = document.createElement('article');
    card.className = 'card card-test';
    card.innerHTML = `
      <div class="meta-line small muted">
        <span class="badge">${t.domain||'—'}</span>
        <span class="badge ${sevClass(t.severity)}">${(t.severity||'').toUpperCase()}</span>
        ${t.technique?`<span class="badge">${t.technique}</span>`:''}
      </div>
      <h3>${t.id} — ${t.title}</h3>
      <p class="small muted">${t.description||''}</p>
    `;
    card.onclick = ()=>openDrawer(t);
    els.grid.appendChild(card);
  });
}

function sevClass(s){
  const v=(s||'').toLowerCase();
  if(v==='critical') return 'sev-crit';
  if(v==='high') return 'sev-high';
  if(v==='medium') return 'sev-med';
  return '';
}

function openDrawer(t){
  active = t;
  els.dTitle.textContent = `${t.id} — ${t.title}`;
  els.dDomain.textContent = t.domain||'—';
  els.dSeverity.textContent = (t.severity||'').toUpperCase();
  els.dSeverity.className = `chip sev ${sevClass(t.severity)}`;
  els.dTechnique.textContent = t.technique||'—';
  els.dIEC.textContent = (t.iec||[]).join(', ')||'—';
  els.dDesc.textContent = t.description||'';
  els.dKql.textContent = t.kql||'';
  els.dSigma.textContent = t.sigma||'';
  els.dPlaybook.innerHTML = (t.playbook||[]).map(x=>`<li>${x}</li>`).join('');
  els.dAssets.innerHTML = (t.assets||[]).map(x=>`<li>${x}</li>`).join('');
  els.dNotes.textContent = t.notes||'';
  els.dVideo.src = t.video ? t.video : '';
  // Run button logic
  const apiEnabled = !!CONFIG.API_BASE && !!CONFIG.API_KEY && t.api_route;
  els.runBtn.style.display = apiEnabled ? 'inline-flex':'none';
  els.runHint.style.display = apiEnabled ? 'none':'inline';
  els.openKibana.style.display = 'none';
  showDrawer();
}

function showDrawer(){ document.getElementById('drawer').classList.add('open'); }
document.getElementById('closeDrawer').onclick = ()=>document.getElementById('drawer').classList.remove('open');
document.getElementById('clearBtn').onclick = ()=>{ els.search.value=''; els.severityFilter.value=''; selectedTags.clear(); renderGrid(); };
els.search.oninput = renderGrid;
els.severityFilter.onchange = renderGrid;

els.copyKql.onclick = async ()=>{
  if (!active?.kql) return;
  await navigator.clipboard.writeText(active.kql);
  els.copyKql.textContent = 'Copied!';
  setTimeout(()=>els.copyKql.textContent='Copy KQL', 1200);
};

els.runBtn.onclick = async ()=>{
  if(!active) return;
  try{
    const r = await fetch(CONFIG.API_BASE + active.api_route, {
      method:'POST',
      headers:{ 'x-api-key': CONFIG.API_KEY }
    });
    const resp = await r.json();
    if(resp.run_id){
      const url = CONFIG.buildKibanaUrl(resp.run_id);
      if(url){
        els.openKibana.href = url;
        els.openKibana.style.display = 'inline-flex';
      }
      els.runBtn.textContent = 'Run complete';
      setTimeout(()=>els.runBtn.textContent='Run in lab', 2500);
    }else{
      alert('Run started but no run_id returned.');
    }
  }catch(e){
    alert('Failed to run: ' + e.message);
  }
};
