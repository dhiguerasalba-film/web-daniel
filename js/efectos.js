// Navegación por secciones, grano de película, código de tiempo y botones de copiar.
(function(){
  const views=["inicio","portfolio","bio","contacto","redes"];
  const figs=document.querySelectorAll(".bg figure");
  const links=document.querySelectorAll("nav a");
  const reduce=matchMedia("(prefers-reduced-motion: reduce)").matches;

  function show(){
    let v=(location.hash||"").slice(1);
    if(!views.includes(v)) v="inicio";
    document.body.dataset.view=v;
    document.querySelectorAll(".view").forEach(s=>{
      const on=s.id===v; s.hidden=!on;
      if(on){s.classList.remove("enter");void s.offsetWidth;s.classList.add("enter");}
    });
    figs.forEach(f=>f.classList.toggle("on",f.dataset.for===v));
    links.forEach(a=>{ if(a.getAttribute("href")==="#"+v) a.setAttribute("aria-current","page"); else a.removeAttribute("aria-current"); });
    window.scrollTo(0,0);
  }
  if(document.querySelector(".view")){ window.addEventListener("hashchange",show); show(); }

  const hd=document.querySelector("header");
  const solid=()=>hd.classList.toggle("solid",window.scrollY>12);
  window.addEventListener("scroll",solid,{passive:true}); solid();

  document.querySelectorAll("[data-scroll]").forEach(a=>a.addEventListener("click",e=>{
    e.preventDefault();document.getElementById("escribe").scrollIntoView({behavior:reduce?"auto":"smooth"});
  }));

  document.addEventListener("click",e=>{
    const b=e.target.closest(".copy"); if(!b) return;
    const t=b.dataset.copy; if(!t) return;
    const done=()=>{b.textContent="Copiado";setTimeout(()=>b.textContent=t,1400);};
    try{navigator.clipboard.writeText(t).then(done,()=>sel(b));}catch(_){sel(b);}
  });
  function sel(el){const r=document.createRange();r.selectNodeContents(el);const s=getSelection();s.removeAllRanges();s.addRange(r);}

  const tc=document.getElementById("tc"),t0=performance.now(),p=n=>String(n).padStart(2,"0");
  if(tc&&!reduce) setInterval(()=>{const s=(performance.now()-t0)/1000;tc.textContent=p(Math.floor(s/3600))+":"+p(Math.floor(s/60)%60)+":"+p(Math.floor(s)%60)+":"+p(Math.floor((s%1)*25));},40);

  const c=document.getElementById("grain");
  if(c){
    const x=c.getContext("2d");c.width=240;c.height=150;
    const img=x.createImageData(c.width,c.height);
    const noise=()=>{const d=img.data;for(let i=0;i<d.length;i+=4){const v=Math.random()*255|0;d[i]=d[i+1]=d[i+2]=v;d[i+3]=255;}x.putImageData(img,0,0);};
    noise(); if(!reduce) setInterval(noise,90);
  }
})();
