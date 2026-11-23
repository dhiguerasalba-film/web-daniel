// Zona privada: acceso por código o por enlace al email.
import { auth, configurado } from "./firebase.js";
import { contar } from "./visitas.js";
contar({ s: "privado" });
import { sendSignInLinkToEmail, isSignInWithEmailLink, signInWithEmailLink, onAuthStateChanged, signOut }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const $ = s => document.querySelector(s);
let enlacePendiente = false;   // se abrió el enlace del email en otro dispositivo
const msg = (t) => { $("#msg").textContent = t; $("#msg").hidden = !t; };
const guardar = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch {} };
const leer = k => { try { return localStorage.getItem(k); } catch { return null; } };

async function pedir(body, token){
  const r = await fetch("/api/acceso-privado", {
    method: "POST",
    headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body)
  });
  const data = await r.json().catch(() => ({}));
  if(!r.ok) throw new Error(data.error || "No se ha podido abrir el visionado.");
  return data;
}

// si la dirección temporal de un vídeo caduca con la página abierta, se pide otra sin que el cliente haga nada
let renovar = null;
function sala({ titular, videos }){
  $("#gate").hidden = true; $("#sala").hidden = false;
  $("#hola").textContent = titular ? `Visionado privado · ${titular}` : "Visionado privado";
  const g = $("#grid"); g.replaceChildren();
  if(!videos.length){ g.innerHTML = '<p class="msg">Todavía no hay vídeos asignados a este acceso.</p>'; return; }
  for(const v of videos){
    const card = document.createElement("article"); card.className = "card";
    let vid;
    if(v.embed){
      // YouTube o Vimeo incrustado
      vid = document.createElement("div"); vid.className = "frame";
      const f = document.createElement("iframe");
      f.src = v.embed; f.title = v.titulo || "Vídeo"; f.loading = "lazy";
      f.allow = "fullscreen; picture-in-picture; encrypted-media"; f.allowFullscreen = true;
      f.referrerPolicy = "strict-origin-when-cross-origin";
      vid.append(f);
    } else {
      vid = document.createElement("video");
      Object.assign(vid, { controls: true, playsInline: true, preload: "metadata", poster: v.poster, src: v.url });
      vid.dataset.id = v.id;
      vid.addEventListener("error", async () => {
        if(!renovar || vid.dataset.reintento) return;
        vid.dataset.reintento = "1";
        try {
          const d = await renovar(), nuevo = d.videos.find(x => x.id === v.id);
          if(nuevo && nuevo.url){ const t = vid.currentTime; vid.src = nuevo.url; vid.currentTime = t; vid.play().catch(() => {}); }
        } catch {} finally { setTimeout(() => delete vid.dataset.reintento, 30000); }
      });
      vid.setAttribute("controlslist", "nodownload"); vid.addEventListener("contextmenu", e => e.preventDefault());
    }
    const h = document.createElement("h3"); h.textContent = v.titulo || "Sin título";
    const m = document.createElement("div"); m.className = "m"; m.textContent = v.duracion || "";
    const p = document.createElement("p"); p.textContent = v.descripcion || ""; p.hidden = !v.descripcion;
    card.append(vid, h, m, p); g.append(card);
  }
}

// llaves de acceso por código guardadas en este navegador: { codigo: llave }
function llaves(){ try { return JSON.parse(leer("dha-llaves") || "{}"); } catch { return {}; } }
function guardarLlave(codigo, llave){ const l = llaves(); l[codigo] = llave; guardar("dha-llaves", JSON.stringify(l)); guardar("dha-ultimo", codigo); }

function pedirEmail(codigo, texto){
  $("#gate").hidden = false; $("#sala").hidden = true;
  $("#codigo").value = codigo; $("#c-email").focus();
  // viene con su enlace: no hace falta la opción de invitación por email
  $("#f-email").hidden = true; document.querySelector(".gate .or").hidden = true;
  msg(texto || "Escribe tu email para abrir el visionado.");
}

async function conCodigo(codigo, email){
  codigo = codigo.trim().toLowerCase();
  const llave = llaves()[codigo];
  if(!llave && !email) return pedirEmail(codigo);
  msg("Abriendo…");
  try {
    const d = await pedir(llave ? { codigo, llave } : { codigo, email });
    if(d.llave) guardarLlave(codigo, d.llave); else guardar("dha-ultimo", codigo);
    renovar = () => pedir({ codigo, llave: llaves()[codigo] });
    msg(""); sala(d);
  } catch(e){
    if(llave && /otro dispositivo|no existe|caducado|retirado/.test(e.message)){ const l = llaves(); delete l[codigo]; guardar("dha-llaves", JSON.stringify(l)); }
    if(/email/i.test(e.message) && !email) return pedirEmail(codigo, e.message);
    $("#gate").hidden = false; $("#sala").hidden = true; msg(e.message);
  }
}

async function conSesion(user){
  msg("Abriendo…");
  try { const d = await pedir({}, await user.getIdToken()); renovar = async () => pedir({}, await user.getIdToken(true)); msg(""); sala(d); }
  catch(e){ msg(e.message); }
}

$("#f-codigo").addEventListener("submit", e => {
  e.preventDefault();
  const c = $("#codigo").value.trim(), em = $("#c-email").value.trim();
  if(!c) return msg("Escribe el código que te ha pasado Daniel.");
  if(!llaves()[c.toLowerCase()] && (!em || !$("#c-email").validity.valid)) return msg("Escribe tu email para abrir el visionado.");
  conCodigo(c, em);
});

$("#f-email").addEventListener("submit", async e => {
  e.preventDefault();
  const email = $("#email").value.trim();
  if(!$("#email").validity.valid || !email) return msg("Escribe un email válido.");
  if(!configurado) return msg("La zona privada aún no está configurada.");
  if(enlacePendiente) return completar(email);
  try {
    await sendSignInLinkToEmail(auth, email, { url: location.origin + "/privado/", handleCodeInApp: true });
    guardar("dha-email", email);
    msg(`Te hemos mandado un enlace a ${email}. Ábrelo desde este mismo dispositivo. Si no lo ves, mira en spam.`);
  } catch(err){ console.error(err); msg("No se ha podido mandar el enlace. Prueba otra vez en un rato."); }
});

$("#salir").addEventListener("click", async () => {
  guardar("dha-ultimo", null);   // la llave se queda: con el mismo enlace puede volver a entrar
  if(auth) await signOut(auth).catch(() => {});
  history.replaceState(null, "", "/privado/");
  $("#sala").hidden = true; $("#gate").hidden = false; $("#grid").replaceChildren(); msg("");
});

async function completar(email){
  try {
    const cred = await signInWithEmailLink(auth, email, location.href);
    guardar("dha-email", null); enlacePendiente = false;
    history.replaceState(null, "", "/privado/");
    return conSesion(cred.user);
  } catch(e){ console.error(e); msg("El enlace ha caducado, ya se ha usado o el email no coincide. Pide uno nuevo."); }
}

// arranque
(async () => {
  const q = new URLSearchParams(location.search);
  const codigo = q.get("c");
  if(codigo){ history.replaceState(null, "", "/privado/"); return conCodigo(codigo); }

  if(configurado && isSignInWithEmailLink(auth, location.href)){
    const email = leer("dha-email");
    if(email) return completar(email);
    enlacePendiente = true;
    $("#f-email button").textContent = "Entrar →";
    $("#email").focus();
    return msg("Para terminar de entrar, confirma tu email y pulsa «Entrar».");
  }

  const guardado = leer("dha-ultimo");
  if(guardado && llaves()[guardado]) return conCodigo(guardado);

  if(configurado) onAuthStateChanged(auth, u => { if(u && !u.isAnonymous) conSesion(u); });
})();
