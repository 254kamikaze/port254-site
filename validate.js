// Lightweight schema validator (warns in console + shows a toast if broken)
(function(){
  const required = ["id","title","domain","severity","description"];
  function toast(msg){
    const t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = "position:fixed;right:14px;bottom:14px;background:#112a3a;border:1px solid #1f4257;color:#cfe8f8;padding:10px 12px;border-radius:10px;z-index:9999";
    document.body.appendChild(t);
    setTimeout(()=>t.remove(), 4200);
  }
  window.validateTests = function(data){
    let bad = 0;
    data.forEach((t,i)=>{
      required.forEach(k=>{
        if(!(k in t)){ console.warn(`[tests.json] item ${i} missing '${k}'`, t); bad++; }
      });
      if(!Array.isArray(t.iec)) t.iec = [];
      if(!Array.isArray(t.tags)) t.tags = [];
      if(!Array.isArray(t.playbook)) t.playbook = [];
    });
    if(bad>0) toast(`tests.json: ${bad} problems found (see console)`);
  };
})();
