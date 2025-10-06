:root{
  --bg0:#070c12;
  --bg1:#0a141e;
  --card:#0f1f2d;
  --muted:#a8c2d4;
  --text:#e9f5ff;
  --chip:#173041;
  --chip-b:#22485e;
  --line:#123246;
  --accent:#58d2ff;
  --accent2:#7ef3d2;
  --warn:#ffd166; --bad:#ff6b6b; --ok:#27d07d;
  --glow:0 12px 36px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.03);
}

*{box-sizing:border-box} html,body{height:100%}
body{
  margin:0; color:var(--text);
  font:15.5px/1.55 Inter,ui-sans-serif,system-ui,Segoe UI,Roboto,Arial;
  background:
    radial-gradient(1200px 600px at 15% -10%, rgba(90,210,255,.14), transparent 60%),
    radial-gradient(800px 400px at 90% 0%, rgba(126,243,210,.12), transparent 60%),
    linear-gradient(180deg, var(--bg0), var(--bg1) 65%);
}

/* Header */
.topbar{
  position:sticky; top:0; z-index:50;
  display:flex; align-items:center; justify-content:space-between;
  padding:12px 18px; border-bottom:1px solid var(--line);
  background:rgba(8,16,24,.72); backdrop-filter: blur(8px) saturate(140%);
}
.brand{display:flex; align-items:center; gap:8px; font-weight:800; letter-spacing:.3px}
.logo{filter:drop-shadow(0 2px 6px rgba(88,210,255,.45))}
.nav .navlink{color:var(--muted); margin-right:14px; text-decoration:none}
.nav .navlink:hover{color:#fff}
.btn{border:1px solid var(--chip-b); background:#0e2230; color:#dff3ff; padding:10px 12px; border-radius:12px}
.btn:hover{border-color:#2e6a89}
.btn.ghost{background:transparent}
.btn.pill{border-radius:999px}
.btn.sm{padding:6px 10px; font-size:13px}
.btn.primary{background:#0c3347; border-color:#2b5b74}

.wrap{display:grid; grid-template-columns:280px 1fr; gap:18px; max-width:1280px; margin:22px auto; padding:0 16px}
@media (max-width:960px){ .wrap{grid-template-columns:1fr} .sidebar{position:fixed; inset:0 auto 0 -320px; z-index:60} .sidebar.open{left:0} }

.card{background:var(--card); border:1px solid var(--line); border-radius:16px; box-shadow:var(--glow)}

/* Sidebar */
.sidebar{height:calc(100vh - 70px); border-radius:16px; border:1px solid var(--line); background:linear-gradient(180deg,#0f1f2d,#0b1a25); padding:12px; position:sticky; top:72px}
.side-head{display:flex; align-items:center; justify-content:space-between; padding:6px 4px 10px}
.title{font-weight:700}
.icon-btn{border:1px solid var(--chip-b); background:#0c1e2a; color:#cde7f3; padding:6px 10px; border-radius:10px}
.side-sec{margin:10px 0 16px}
.sec-title{font-size:12px; color:var(--muted); margin-bottom:8px}
.chips{display:flex; flex-wrap:wrap; gap:8px}
.chips.scroll{max-height:150px; overflow:auto; padding-right:4px}
.badge,.chip{font-size:12px; padding:4px 8px; border:1px solid var(--chip-b); background:var(--chip); border-radius:999px; color:#cfe8f8}
.badge.sev-crit{background:#2a0f17; border-color:#6a2332; color:#ffc5ce}
.badge.sev-high{background:#2a1509; border-color:#6a3a20; color:#ffd6b2}
.badge.sev-med{background:#0e2a18; border-color:#2a6a45; color:#c8f3da}
.side-footer{padding-top:4px}
.full{width:100%}

/* Hero */
.hero{display:flex; justify-content:space-between; align-items:flex-end; padding:20px}
.hero-left h1{margin:0 0 10px; font-size:22px}
.row.gap{gap:8px}
.hero-right{display:flex; gap:12px}
.stat{background:#0a1d2a; border:1px solid var(--line); border-radius:12px; padding:10px 14px; text-align:center; min-width:108px}
.stat div{font-size:22px; font-weight:800}

/* Toolbar */
.toolbar{display:flex; align-items:center; justify-content:space-between; margin:16px 0}
.left{display:flex; gap:8px}
.search{min-width:300px; width:36vw; padding:12px 14px; border-radius:12px; border:1px solid var(--chip-b); background:#0c1e2a; color:#e6f5ff}
.select{border-radius:12px; border:1px solid var(--chip-b); background:#0c1e2a; color:#e6f5ff; padding:10px 12px}

/* Grid */
.grid{display:grid; grid-template-columns:repeat(auto-fill,minmax(290px,1fr)); gap:14px}
.card-test{padding:16px; cursor:pointer; transition:transform .12s ease, box-shadow .12s ease}
.card-test h3{margin:6px 0 6px; font-size:16px}
.card-test:hover{transform:translateY(-2px); box-shadow:0 18px 40px rgba(9,24,34,.45)}
.meta-line{display:flex; gap:6px; align-items:center}
.small{font-size:12px}
.muted{color:var(--muted)}
.mt{margin-top:14px}
.code{background:#091822; border:1px solid var(--line); border-radius:12px; padding:12px; overflow:auto}
.bullets{margin:8px 0 0 18px}

.drawer{position:fixed; top:70px; right:-760px; width:760px; max-width:96vw; height:calc(100vh - 80px); background:linear-gradient(180deg,#102334,#0c1c29); border-left:1px solid var(--line); box-shadow:-40px 0 60px rgba(0,0,0,.4); transition:right .22s ease}
.drawer.open{right:10px}
.drawer-head{display:flex; align-items:center; justify-content:space-between; padding:14px 16px; border-bottom:1px solid var(--line)}
.drawer-body{padding:16px; overflow:auto; height:calc(100% - 54px)}
.meta{display:flex; gap:8px; flex-wrap:wrap}
.cols{display:grid; grid-template-columns:1fr 1fr; gap:18px}
@media (max-width:1000px){ .cols{grid-template-columns:1fr} }
.video{position:relative; padding-top:56.25%; background:#08141d; border:1px solid var(--line); border-radius:12px}
.video iframe{position:absolute; inset:0; width:100%; height:100%; border:0}
