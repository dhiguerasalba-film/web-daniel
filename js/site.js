// Web pública: lee el contenido de Firestore y lo pinta. Si Firebase no está
// configurado todavía o no responde, se queda con el contenido de partida.
import { db, configurado, mezclar, cld } from "./firebase.js";
import { CONFIG_INICIAL, TRABAJOS_INICIALES } from "./contenido-inicial.js";

const $ = s => document.querySelector(s);
const el = (tag, attrs = {}, ...kids) => {
  const n = document.createElement(tag);
  for(const [k, v] of Object.entries(attrs)){
    if(k === "class") n.className = v; else if(k === "text") n.textContent = v; else if(v !== undefined && v !== null && v !== false) n.setAttribute(k, v === true ? "" : v);
  }
  for(const k of kids) if(k) n.append(k);
  return n;
};
const get = (o, path) => path.split(".").reduce((a, k) => (a == null ? a : a[k]), o);

let cfg = CONFIG_INICIAL, trabajos = TRABAJOS_INICIALES;

async function cargar(){
  if(!configurado) return;
  const { doc, getDoc, collection, getDocs, query, where } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
  const [c, t] = await Promise.all([
    getDoc(doc(db, "site", "config")),
    getDocs(query(collection(db, "works"), where("visible", "==", true)))
  ]);
  if(c.exists()) cfg = mezclar(CONFIG_INICIAL, c.data());
  if(!t.empty) trabajos = t.docs.map(d => ({ id: d.id, ...d.data() }));
  else if(c.exists()) trabajos = [];
}

function pintar(){
  document.querySelectorAll("[data-t]").forEach(n => { const v = get(cfg, n.dataset.t); if(typeof v === "string") n.textContent = v; });
  n_hidden("[data-t='portfolio.pie']", !cfg.portfolio.pie);
  document.title = `${cfg.nombre} · ${cfg.inicio.kicker.split("·")[0].trim()}`;

  // fondos sustituidos desde el panel
  for(const [vista, url] of Object.entries(cfg.fondos || {})){
    const f = document.querySelector(`.bg figure[data-for="${vista}"]`);
    if(f && url) f.style.backgroundImage = `url("${cld(url, 1800)}")`;
  }

  // trabajos
  trabajos.sort((a, b) => (a.orden ?? 999) - (b.orden ?? 999));
  const lista = $("#trabajos"); lista.replaceChildren();
  if(!trabajos.length) lista.append(el("li", { class: "empty", text: "Pronto, trabajos nuevos." }));
  trabajos.forEach(w => {
    const meta = [w.categoria, w.rol, w.cliente, w.anio].filter(Boolean).join(" · ");
    const b = el("button", { class: "w", type: "button" },
      el("span", { class: "t", text: w.titulo }),
      el("span", { class: "d", text: w.duracion || "" }),
      el("span", { class: "m" }, meta, (!w.videoUrl && w.enlace) ? el("span", { class: "ext", text: "↗" }) : null));
    b.addEventListener("click", () => abrir(w));
    lista.append(el("li", { "data-k": (w.categoria || "").toLowerCase() }, b));
  });

  const cats = [...new Set(trabajos.map(w => w.categoria).filter(Boolean))];
  const fl = $("#filtros"); fl.replaceChildren();
  if(cats.length > 1){
    ["Todo", ...cats].forEach((c, i) => {
      const b = el("button", { type: "button", "aria-pressed": i === 0 ? "true" : "false", text: c });
      b.addEventListener("click", () => {
        fl.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", x === b));
        lista.querySelectorAll("li[data-k]").forEach(li => li.hidden = !(i === 0 || li.dataset.k === c.toLowerCase()));
      });
      fl.append(b);
    });
  }

  const dest = trabajos.filter(w => w.destacado).slice(0, 3);
  const d = $("#destacados"); d.replaceChildren();
  if(dest.length){
    const s = el("span", {}, "Últimos trabajos ");
    dest.forEach((w, i) => { if(i) s.append(" · "); s.append(el("b", { text: w.titulo })); });
    d.append(s); d.hidden = false;
  }

  // bio
  $("#bio-texto").replaceChildren(...(cfg.bio.parrafos || []).filter(Boolean).map(p => el("p", { text: p })));
  $("#bio-datos").replaceChildren(...(cfg.bio.datos || []).filter(x => x.etiqueta || x.valor).map(x => el("div", {}, el("dt", { text: x.etiqueta }), el("dd", { text: x.valor }))));

  // contacto
  $("#c-tipo").replaceChildren(...cfg.contacto.tipos.map(t => el("option", { text: t })));
  $("#c-presu").replaceChildren(...cfg.contacto.presupuestos.map(t => el("option", { text: t })));
  for(const [id, val] of [["#d-email", cfg.contacto.email], ["#d-tel", cfg.contacto.telefono]]){
    const box = $(id); box.hidden = !val;
    const b = box.querySelector(".copy"); b.textContent = val || ""; b.dataset.copy = val || "";
  }

  // redes
  $("#redes-lista").replaceChildren(...(cfg.redes.lista || []).filter(r => r.nombre && r.url).map(r =>
    el("li", {}, el("a", { href: r.url, target: "_blank", rel: "noopener" }, el("span", { class: "n", text: r.nombre }), el("span", { class: "h", text: r.usuario || "" })))));
}
function n_hidden(sel, h){ const n = $(sel); if(n) n.hidden = h; }

// reproductor
const pl = $("#player"), pv = $("#player-v");
function abrir(w){
  if(!w.videoUrl){ if(w.enlace) window.open(w.enlace, "_blank", "noopener"); else location.hash = "contacto"; return; }
  pv.src = w.videoUrl; pv.poster = cld(w.posterUrl, 1600);
  $("#player-t").textContent = w.titulo;
  $("#player-m").textContent = [w.categoria, w.rol, w.anio, w.duracion].filter(Boolean).join(" · ");
  $("#player-d").textContent = w.descripcion || "";
  pl.hidden = false; $("#player-x").focus(); pv.play().catch(() => {});
}
function cerrar(){ pv.pause(); pv.removeAttribute("src"); pv.load(); pl.hidden = true; }
$("#player-x").addEventListener("click", cerrar);
document.addEventListener("keydown", e => { if(e.key === "Escape" && !pl.hidden) cerrar(); });

// formulario de contacto: se guarda en Firestore y Dani lo ve en el panel
$("#f").addEventListener("submit", async e => {
  e.preventDefault();
  const f = e.target, msg = $("#sent"), btn = $("#c-enviar");
  const avisar = (t, err) => { msg.textContent = t; msg.classList.toggle("err", !!err); msg.hidden = false; };
  if(f.web.value) return avisar(cfg.contacto.gracias);              // bot: fingimos que ha ido bien
  if(!f.nombre.value.trim() || !f.email.validity.valid || !f.email.value || !f.mensaje.value.trim())
    return avisar("Falta tu nombre, un email válido o el mensaje.", true);
  if(!configurado) return avisar("El formulario aún no está conectado. Escribe directamente al email de abajo.", true);
  btn.disabled = true;
  try{
    const { collection, addDoc, serverTimestamp } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
    await addDoc(collection(db, "messages"), {
      nombre: f.nombre.value.trim(), email: f.email.value.trim(), tipo: f.tipo.value, fecha: f.fecha.value || "",
      presupuesto: f.presupuesto.value, mensaje: f.mensaje.value.trim(), leido: false, createdAt: serverTimestamp()
    });
    f.reset(); avisar(cfg.contacto.gracias);
  }catch(err){
    console.error(err);
    avisar("No se ha podido enviar. Prueba otra vez o escribe al email de abajo.", true);
  }finally{ btn.disabled = false; }
});

const listo = () => document.documentElement.removeAttribute("data-cms-wait");
setTimeout(listo, 2500);   // si la red va lenta, enseñamos lo que haya
cargar().catch(err => console.warn("Contenido de partida:", err)).finally(() => { pintar(); listo(); });
