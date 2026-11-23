// Modo día / noche del panel. Se carga en el <head> para que no parpadee al entrar.
// Si nunca se ha elegido, sigue lo que tenga puesto el ordenador o el móvil.
(function(){
  var guardado = null;
  try { guardado = localStorage.getItem("dha-tema-panel"); } catch(e){}
  var tema = guardado || (window.matchMedia && matchMedia("(prefers-color-scheme: light)").matches ? "dia" : "noche");
  document.documentElement.setAttribute("data-tema", tema);

  function rotulo(b){
    var dia = document.documentElement.getAttribute("data-tema") === "dia";
    b.textContent = dia ? "☾ Modo noche" : "☀ Modo día";
    b.setAttribute("aria-label", dia ? "Cambiar a modo noche" : "Cambiar a modo día");
  }
  document.addEventListener("DOMContentLoaded", function(){
    var botones = document.querySelectorAll("[data-tema-btn]");
    botones.forEach(function(b){
      rotulo(b);
      b.addEventListener("click", function(){
        var nuevo = document.documentElement.getAttribute("data-tema") === "dia" ? "noche" : "dia";
        document.documentElement.setAttribute("data-tema", nuevo);
        try { localStorage.setItem("dha-tema-panel", nuevo); } catch(e){}
        botones.forEach(rotulo);
      });
    });
  });
})();
