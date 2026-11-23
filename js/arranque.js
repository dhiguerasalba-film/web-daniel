// Se carga en el <head>, antes de pintar nada. Va en archivo aparte (y no dentro del HTML)
// porque la política de seguridad de la web (netlify.toml) no deja ejecutar código suelto en la página.

// 1) Letras elegidas en el panel: las aplica ya, para que no se vea un instante la letra antigua.
try {
  var L = JSON.parse(localStorage.getItem("dha-letras"));
  if(L){
    for(var k in L.enlaces){
      var a = document.createElement("link");
      a.rel = "stylesheet"; a.id = "letra-" + k; a.href = L.enlaces[k];
      document.head.appendChild(a);
    }
    for(var v in L.vars) document.documentElement.style.setProperty(v, L.vars[v]);
  }
} catch(e){}

// 2) Si el contenido tarda (o falla la conexión), enseña la página igualmente a los 3 segundos.
setTimeout(function(){ document.documentElement.removeAttribute("data-cms-wait"); }, 3000);
