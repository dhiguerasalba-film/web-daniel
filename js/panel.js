// Panel de Daniel: edita la web, sube medios a Cloudinary y gestiona la zona privada.
import { db, auth, configurado, mezclar, cld } from "./firebase.js";
import { CONFIG_INICIAL, TRABAJOS_INICIALES } from "./contenido-inicial.js";
import {
  signInWithEmailAndPassword, onAuthStateChanged, signOut, sendPasswordResetEmail, sendSignInLinkToEmail
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  doc, getDoc, setDoc, addDoc, updateDoc, deleteDoc, collection, getDocs, query, orderBy,
  serverTimestamp, Timestamp, writeBatch
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const $ = s => document.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const el = (tag, attrs = {}, ...kids) => {
  const n = document.createElement(tag);
  for(const [k, v] of Object.entries(attrs)){
    if(k === "class") n.className = v; else if(k === "text") n.textContent = v;
    else if(k.startsWith("on")) n.addEventListener(k.slice(2), v);
    else if(v !== undefined && v !== null && v !== false) n.setAttribute(k, v === true ? "" : v);
  }
  for(const c of kids) if(c !== null && c !== undefined && c !== false) n.append(c);
  return n;
};
const getP = (o, p) => p.split(".").reduce((a, k) => (a == null ? a : a[k]), o);
const setP = (o, p, v) => { const ks = p.split("."); let t = o; ks.slice(0, -1).forEach(k => t = t[k] ??= {}); t[ks.at(-1)] = v; };
const fecha = ts => { const d = ts?.toDate ? ts.toDate() : ts ? new Date(ts) : null; return d ? d.toLocaleString("es-ES", { dateStyle: "medium", timeStyle: "short" }) : "—"; };

let toastT;
function toast(t, err){ const n = $("#toast"); n.textContent = t; n.classList.toggle("err", !!err); n.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => n.hidden = true, err ? 6000 : 2600); }
async function ocupado(btn, fn){ btn.disabled = true; try { return await fn(); } catch(e){ console.error(e); toast(e.message || "Algo ha fallado.", true); } finally { btn.disabled = false; } }

async function api(ruta, body){
  const r = await fetch(`/api/${ruta}`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${await auth.currentUser.getIdToken()}` }, body: JSON.stringify(body) });
  const d = await r.json().catch(() => ({}));
  if(!r.ok) throw new Error(d.error || `Error ${r.status}`);
  return d;
}

// ---------- subida a Cloudinary con barra de progreso ----------
async function subir(file, { privado = false, prog } = {}){
  const firma = await api("firmar-subida", { privado });
  const tipo = privado ? "video" : "auto";
  const fd = new FormData();
  fd.append("file", file); fd.append("api_key", firma.apiKey); fd.append("timestamp", firma.timestamp);
  fd.append("signature", firma.signature); fd.append("folder", firma.folder);
  if(firma.type) fd.append("type", firma.type);
  const barra = prog && $(prog);
  if(barra){ barra.hidden = false; barra.querySelector("i").style.width = "0"; barra.querySelector("span").textContent = "0 %"; }
  return new Promise((ok, ko) => {
    const x = new XMLHttpRequest();
    x.open("POST", `https://api.cloudinary.com/v1_1/${firma.cloudName}/${tipo}/upload`);
    x.upload.onprogress = e => { if(barra && e.lengthComputable){ const p = Math.round(e.loaded / e.total * 100); barra.querySelector("i").style.width = p + "%"; barra.querySelector("span").textContent = p < 100 ? `${p} %` : "Procesando…"; } };
    x.onload = () => {
      if(barra) barra.hidden = true;
      let d = {}; try { d = JSON.parse(x.responseText); } catch {}
      if(x.status >= 200 && x.status < 300) ok(d);
      else ko(new Error(d.error?.message?.includes("too large") ? "El archivo pesa demasiado para tu plan de Cloudinary (máx. 100 MB en el gratuito)." : (d.error?.message || "No se ha podido subir.")));
    };
    x.onerror = () => { if(barra) barra.hidden = true; ko(new Error("Se ha cortado la conexión durante la subida.")); };
    x.send(fd);
  });
}
const posterDeVideo = url => url ? url.replace("/upload/", "/upload/so_auto,w_1600/").replace(/\.[a-z0-9]+$/i, ".jpg") : "";

// ---------- sesión ----------
const msgLogin = (t, ok) => { const n = $("#l-msg"); n.textContent = t; n.classList.toggle("ok", !!ok); n.hidden = !t; };

if(!configurado){
  $("#login").hidden = false;
  msgLogin("Falta configurar Firebase: rellena js/firebase-config.js (paso 3 de la guía).");
  $("#f-login button[type=submit]").disabled = true;
} else {
  onAuthStateChanged(auth, async u => {
    if(!u){ $("#app").hidden = true; $("#login").hidden = false; return; }
    const a = await getDoc(doc(db, "admins", u.uid)).catch(() => null);
    if(!a?.exists()){
      $("#login").hidden = false; $("#app").hidden = true;
      msgLogin(`Esta cuenta no es de administrador. Para activarla, crea en Firestore la colección «admins» con un documento cuyo ID sea: ${u.uid}`);
      return;
    }
    $("#login").hidden = true; $("#app").hidden = false;
    arrancar();
  });
}

$("#f-login").addEventListener("submit", async e => {
  e.preventDefault(); msgLogin("");
  const btn = e.submitter;
  await ocupado(btn, async () => {
    try { await signInWithEmailAndPassword(auth, $("#l-email").value.trim(), $("#l-pass").value); }
    catch { msgLogin("Email o contraseña incorrectos."); }
  });
});
$("#l-olvido").addEventListener("click", async () => {
  const email = $("#l-email").value.trim();
  if(!email) return msgLogin("Escribe tu email arriba y vuelve a pulsar.");
  try { await sendPasswordResetEmail(auth, email); msgLogin("Te hemos mandado un email para cambiar la contraseña.", true); }
  catch { msgLogin("No se ha podido mandar el email. Revisa la dirección."); }
});
$("#salir").addEventListener("click", () => signOut(auth));

// ---------- navegación ----------
const SECS = $$("[data-sec]").map(s => s.dataset.sec);
function ruta(){
  const v = SECS.includes(location.hash.slice(1)) ? location.hash.slice(1) : "portada";
  $$("[data-sec]").forEach(s => s.hidden = s.dataset.sec !== v);
  $$("#menu a").forEach(a => a.toggleAttribute("aria-current", a.getAttribute("href") === "#" + v));
  window.scrollTo(0, 0);
}
window.addEventListener("hashchange", ruta);

// ---------- configuración de la web ----------
let cfg = CONFIG_INICIAL, existe = false;
const refCfg = () => doc(db, "site", "config");

function pintarCfg(){
  $$("[data-path]:not(.rep)").forEach(i => { i.value = getP(cfg, i.dataset.path) ?? ""; });
  $$(".rep").forEach(r => pintarRep(r, getP(cfg, r.dataset.path) || []));
  $("#vacio").hidden = existe;
  pintarFondos();
}

function campos(rep){ return rep.dataset.kind.includes(":") ? rep.dataset.kind.split("|").map(x => { const [k, l] = x.split(":"); return { k, l }; }) : null; }
function pintarRep(rep, valores){
  const cs = campos(rep);
  rep.replaceChildren();
  const fila = v => {
    const cells = el("div", { class: "cells" });
    if(cs) cs.forEach(c => cells.append(el("input", { "data-k": c.k, placeholder: c.l, "aria-label": c.l, value: v?.[c.k] ?? "" })));
    else if(rep.dataset.kind === "textarea"){ const t = el("textarea", { rows: 3, "aria-label": "Texto" }); t.value = v ?? ""; cells.append(t); }
    else cells.append(el("input", { "aria-label": "Texto", value: v ?? "" }));
    const row = el("div", { class: "row" }, cells, el("div", { class: "tools" },
      el("button", { type: "button", title: "Subir", "aria-label": "Subir", text: "↑", onclick: () => row.previousElementSibling?.classList.contains("row") && row.previousElementSibling.before(row) }),
      el("button", { type: "button", title: "Bajar", "aria-label": "Bajar", text: "↓", onclick: () => row.nextElementSibling?.classList.contains("row") && row.nextElementSibling.after(row) }),
      el("button", { type: "button", title: "Quitar", "aria-label": "Quitar", text: "✕", onclick: () => row.remove() })));
    return row;
  };
  valores.forEach(v => rep.append(fila(v)));
  const add = el("button", { class: "btn small add", type: "button", text: "+ " + (rep.dataset.add || "Añadir"), onclick: () => { const r = fila(cs ? {} : ""); add.before(r); r.querySelector("input,textarea").focus(); } });
  rep.append(add);
}
function leerRep(rep){
  const cs = campos(rep);
  return $$(".row", rep).map(row => {
    if(cs){ const o = {}; $$("input", row).forEach(i => o[i.dataset.k] = i.value.trim()); return o; }
    return row.querySelector("input,textarea").value.trim();
  }).filter(v => cs ? Object.values(v).some(Boolean) : v);
}

$$("[data-save]").forEach(btn => btn.addEventListener("click", () => ocupado(btn, async () => {
  const sec = btn.closest("section"), parcial = {};
  $$("[data-path]:not(.rep)", sec).forEach(i => setP(parcial, i.dataset.path, i.value.trim()));
  $$(".rep", sec).forEach(r => setP(parcial, r.dataset.path, leerRep(r)));
  await setDoc(refCfg(), parcial, { merge: true });
  cfg = mezclar(cfg, parcial); existe = true; $("#vacio").hidden = true;
  toast("Guardado. Ya se ve en la web.");
})));

$("#sembrar").addEventListener("click", e => ocupado(e.target, async () => {
  await setDoc(refCfg(), CONFIG_INICIAL);
  const b = writeBatch(db);
  TRABAJOS_INICIALES.forEach(w => b.set(doc(collection(db, "works")), w));
  await b.commit();
  cfg = CONFIG_INICIAL; existe = true; pintarCfg(); await cargarTrabajos();
  toast("Contenido de ejemplo cargado. Cámbialo a tu gusto.");
}));

// ---------- fondos ----------
const FONDOS = [["inicio", "grito"], ["portfolio", "perfil-der"], ["bio", "perfil-izq"], ["contacto", "frontal"], ["redes", "perfil-der"]];
function pintarFondos(){
  $("#fondos").replaceChildren(...FONDOS.map(([vista, def]) => {
    const url = cfg.fondos?.[vista];
    const inp = el("input", { type: "file", accept: "image/*", class: "file", id: `fo-${vista}` });
    const prog = el("div", { class: "prog", id: `fo-p-${vista}`, hidden: true }, el("i"), el("span"));
    inp.addEventListener("change", async () => {
      const f = inp.files[0]; if(!f) return;
      try {
        const r = await subir(f, { prog: `#fo-p-${vista}` });
        await setDoc(refCfg(), { fondos: { [vista]: r.secure_url } }, { merge: true });
        cfg = mezclar(cfg, { fondos: { [vista]: r.secure_url } }); pintarFondos(); toast("Foto cambiada.");
      } catch(e){ toast(e.message, true); }
    });
    return el("div", { class: "fondo" },
      el("img", { src: url ? cld(url, 400) : `/img/${def}.jpg`, alt: `Fondo de ${vista}` }),
      el("div", {}, el("b", { text: vista }), inp, el("label", { for: `fo-${vista}`, class: "btn small", text: "Cambiar foto" }), prog,
        url ? el("button", { class: "link", type: "button", text: "Volver a la original", onclick: async () => {
          await setDoc(refCfg(), { fondos: { [vista]: "" } }, { merge: true }); cfg.fondos[vista] = ""; pintarFondos(); toast("Recuperada la foto original."); } }) : null));
  }));
}

// ---------- portfolio ----------
let trabajos = [], editando = null, borrador = {};
async function cargarTrabajos(){
  const s = await getDocs(collection(db, "works"));
  trabajos = s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (a.orden ?? 999) - (b.orden ?? 999));
  const l = $("#w-lista"); l.replaceChildren();
  if(!trabajos.length) l.append(el("li", {}, el("span", { class: "empty", text: "Aún no hay trabajos. Crea el primero con «+ Nuevo trabajo»." })));
  trabajos.forEach((w, i) => l.append(el("li", {},
    el("div", {}, el("div", { class: "t" }, w.titulo || "Sin título",
        w.visible ? null : el("span", { class: "pill off", text: "oculto" }), w.destacado ? el("span", { class: "pill on", text: "destacado" }) : null),
      el("div", { class: "s", text: [w.categoria, w.anio, w.duracion, w.videoUrl ? "vídeo subido" : w.enlace ? "enlace externo" : "sin vídeo"].filter(Boolean).join(" · ") })),
    el("div", { class: "acts" },
      el("button", { class: "btn small", type: "button", text: "↑", "aria-label": "Subir", disabled: i === 0, onclick: () => mover(i, -1) }),
      el("button", { class: "btn small", type: "button", text: "↓", "aria-label": "Bajar", disabled: i === trabajos.length - 1, onclick: () => mover(i, 1) }),
      el("button", { class: "btn small", type: "button", text: "Editar", onclick: () => editar(w) })))));
  $("#w-cats").replaceChildren(...[...new Set(trabajos.map(w => w.categoria).filter(Boolean))].map(c => el("option", { value: c })));
}
async function mover(i, d){
  const lista = [...trabajos]; [lista[i], lista[i + d]] = [lista[i + d], lista[i]];
  const b = writeBatch(db); lista.forEach((w, n) => b.update(doc(db, "works", w.id), { orden: n + 1 }));
  await b.commit(); await cargarTrabajos();
}
const W = ["titulo", "categoria", "duracion", "rol", "cliente", "anio", "enlace", "descripcion"];
function editar(w){
  editando = w?.id || null;
  borrador = { videoUrl: w?.videoUrl || "", videoPublicId: w?.videoPublicId || "", posterUrl: w?.posterUrl || "" };
  W.forEach(k => $(`#w-${k}`).value = w?.[k] ?? "");
  $("#w-visible").checked = w ? w.visible !== false : true;
  $("#w-destacado").checked = !!w?.destacado;
  $("#w-ed-t").textContent = w ? "Editar trabajo" : "Nuevo trabajo";
  $("#w-borrar").hidden = !w;
  pintarMedios();
  $("#w-editor").hidden = false; $("#w-editor").scrollIntoView({ behavior: "smooth", block: "start" }); $("#w-titulo").focus({ preventScroll: true });
}
function pintarMedios(){
  const v = $("#w-video-prev"), p = $("#w-poster-prev");
  v.hidden = !borrador.videoUrl; if(borrador.videoUrl) v.src = borrador.videoUrl; else v.removeAttribute("src");
  $("#w-video-quitar").hidden = !borrador.videoUrl;
  const poster = borrador.posterUrl || posterDeVideo(borrador.videoUrl);
  p.hidden = !poster; if(poster) p.src = cld(poster, 500);
}
$("#w-nuevo").addEventListener("click", () => editar(null));
$("#w-cancelar").addEventListener("click", () => { $("#w-editor").hidden = true; });
$("#w-video-file").addEventListener("change", async e => {
  const f = e.target.files[0]; e.target.value = ""; if(!f) return;
  try { const r = await subir(f, { prog: "#w-video-prog" }); borrador.videoUrl = r.secure_url; borrador.videoPublicId = r.public_id; pintarMedios(); toast("Vídeo subido. Guarda el trabajo para publicarlo."); }
  catch(err){ toast(err.message, true); }
});
$("#w-poster-file").addEventListener("change", async e => {
  const f = e.target.files[0]; e.target.value = ""; if(!f) return;
  try { const r = await subir(f, { prog: "#w-poster-prog" }); borrador.posterUrl = r.secure_url; pintarMedios(); }
  catch(err){ toast(err.message, true); }
});
$("#w-video-quitar").addEventListener("click", () => { borrador.videoUrl = ""; borrador.videoPublicId = ""; pintarMedios(); });
$("#w-guardar").addEventListener("click", e => ocupado(e.target, async () => {
  const datos = { visible: $("#w-visible").checked, destacado: $("#w-destacado").checked,
    videoUrl: borrador.videoUrl, videoPublicId: borrador.videoPublicId, posterUrl: borrador.posterUrl || posterDeVideo(borrador.videoUrl) };
  W.forEach(k => datos[k] = $(`#w-${k}`).value.trim());
  if(!datos.titulo) throw new Error("Ponle un título al trabajo.");
  if(editando) await updateDoc(doc(db, "works", editando), datos);
  else await addDoc(collection(db, "works"), { ...datos, orden: trabajos.length + 1, createdAt: serverTimestamp() });
  $("#w-editor").hidden = true; await cargarTrabajos(); toast("Trabajo guardado.");
}));
$("#w-borrar").addEventListener("click", e => ocupado(e.target, async () => {
  const w = trabajos.find(x => x.id === editando); if(!w) return;
  if(!confirm(`¿Borrar «${w.titulo}» del portfolio?`)) return;
  if(w.videoPublicId && confirm("¿Borrar también el vídeo de Cloudinary? Si dices que no, se queda en tu biblioteca.")){
    await api("admin-medios", { accion: "borrar-publico", publicId: w.videoPublicId, tipo: "video" }).catch(err => toast(err.message, true));
  }
  await deleteDoc(doc(db, "works", w.id)); $("#w-editor").hidden = true; await cargarTrabajos(); toast("Trabajo borrado.");
}));

// ---------- vídeos privados ----------
let privados = [];
async function cargarPrivados(){
  const s = await getDocs(query(collection(db, "privateVideos"), orderBy("createdAt", "desc")));
  privados = s.docs.map(d => ({ id: d.id, ...d.data() }));
  const l = $("#v-lista"); l.replaceChildren();
  if(!privados.length) l.append(el("li", {}, el("span", { class: "empty", text: "No hay vídeos privados todavía." })));
  privados.forEach(v => l.append(el("li", {},
    el("div", {}, el("div", { class: "t", text: v.titulo || "Sin título" }),
      el("div", { class: "s", text: [v.duracion, v.bytes ? `${(v.bytes / 1048576).toFixed(0)} MB` : "", `subido ${fecha(v.createdAt)}`].filter(Boolean).join(" · ") })),
    el("div", { class: "acts" },
      el("button", { class: "btn small", type: "button", text: "Ver", onclick: e => ocupado(e.target, async () => { const r = await api("admin-medios", { accion: "ver", videoId: v.id }); $("#dlg-v").src = r.url; $("#dlg-v").poster = r.poster; $("#dlg").showModal(); }) }),
      el("button", { class: "btn small", type: "button", text: "Renombrar", onclick: async () => {
        const t = prompt("Título del vídeo", v.titulo || ""); if(t === null) return;
        const d = prompt("Descripción o notas", v.descripcion || ""); if(d === null) return;
        await updateDoc(doc(db, "privateVideos", v.id), { titulo: t.trim(), descripcion: d.trim() }); await cargarPrivados(); } }),
      el("button", { class: "btn small", type: "button", text: "Renovar enlace", title: "Los enlaces que ya se vieron dejan de funcionar", onclick: e => ocupado(e.target, async () => {
        if(!confirm("Se generará un enlace nuevo y el antiguo dejará de funcionar, por si alguien lo ha copiado. Los accesos que tengan el vídeo asignado lo seguirán viendo. ¿Seguir?")) return;
        await api("admin-medios", { accion: "renovar", videoId: v.id }); toast("Enlace renovado."); }) }),
      el("button", { class: "btn small", type: "button", text: "Borrar", onclick: e => ocupado(e.target, async () => {
        if(!confirm(`¿Borrar «${v.titulo}» para siempre? Se elimina también de Cloudinary.`)) return;
        await api("admin-medios", { accion: "borrar-privado", videoId: v.id }); await recargarPrivado(); toast("Vídeo borrado."); }) })))));
  pintarChecks("#k-videos"); pintarChecks("#i-videos");
}
$("#dlg").addEventListener("close", () => { const v = $("#dlg-v"); v.pause(); v.removeAttribute("src"); v.load(); });
$("#v-file").addEventListener("change", async e => {
  const f = e.target.files[0]; e.target.value = ""; if(!f) return;
  const titulo = $("#v-titulo").value.trim() || f.name.replace(/\.[^.]+$/, "");
  try {
    const r = await subir(f, { privado: true, prog: "#v-prog" });
    await addDoc(collection(db, "privateVideos"), { titulo, descripcion: $("#v-desc").value.trim(), duracion: $("#v-duracion").value.trim(),
      publicId: r.public_id, formato: r.format || "mp4", bytes: r.bytes || 0, createdAt: serverTimestamp() });
    ["#v-titulo", "#v-desc", "#v-duracion"].forEach(s => $(s).value = "");
    await cargarPrivados(); toast("Vídeo privado subido. Ahora asígnalo a un código o una invitación.");
  } catch(err){ toast(err.message, true); }
});

function pintarChecks(sel, marcados = []){
  const box = $(sel); box.replaceChildren();
  if(!privados.length){ box.append(el("p", { class: "hint", text: "Primero sube algún vídeo en «Vídeos privados»." })); return; }
  privados.forEach(v => { const id = `${sel.slice(1)}-${v.id}`;
    box.append(el("label", { for: id }, el("input", { type: "checkbox", id, value: v.id, checked: marcados.includes(v.id) }), v.titulo || "Sin título")); });
}
const marcados = sel => $$(`${sel} input:checked`).map(i => i.value);
const titulos = ids => ids.map(id => privados.find(v => v.id === id)?.titulo).filter(Boolean).join(", ") || "ningún vídeo";
function elegirVideos(actuales){
  // ventana sencilla para cambiar los vídeos de un acceso existente
  return new Promise(res => {
    const d = el("dialog", {}, el("h3", { text: "Vídeos de este acceso" }), el("div", { class: "checks", id: "tmp-checks" }),
      el("div", { class: "bar", style: "margin-top:14px" },
        el("button", { class: "btn primary", type: "button", text: "Guardar", onclick: () => { res(marcados("#tmp-checks")); d.close(); } }),
        el("button", { class: "btn", type: "button", text: "Cancelar", onclick: () => { res(null); d.close(); } })));
    document.body.append(d); pintarChecks("#tmp-checks", actuales); d.addEventListener("close", () => d.remove()); d.showModal();
  });
}

// ---------- códigos ----------
const nuevoCodigo = () => { const abc = "abcdefghjkmnpqrstuvwxyz23456789"; return Array.from(crypto.getRandomValues(new Uint8Array(12)), b => abc[b % abc.length]).join(""); };
const enlaceCodigo = c => `${location.origin}/privado/?c=${c}`;
async function cargarCodigos(){
  const s = await getDocs(query(collection(db, "accessCodes"), orderBy("createdAt", "desc")));
  const l = $("#k-lista"); l.replaceChildren();
  if(s.empty) l.append(el("li", {}, el("span", { class: "empty", text: "No hay códigos creados." })));
  s.docs.forEach(d => { const c = d.data(), caducado = c.caduca && c.caduca.toDate() < new Date();
    l.append(el("li", {},
      el("div", {}, el("div", { class: "t" }, c.nombre || "Sin nombre",
          el("span", { class: `pill ${c.activo === false || caducado ? "off" : "on"}`, text: c.activo === false ? "retirado" : caducado ? "caducado" : "activo" })),
        el("div", { class: "s", text: `${d.id} · ${titulos(c.videoIds || [])}` }),
        el("div", { class: "s", text: `Caduca: ${c.caduca ? c.caduca.toDate().toLocaleDateString("es-ES") : "nunca"} · ${c.usos || 0} visitas · último acceso ${fecha(c.ultimoAcceso)}` })),
      el("div", { class: "acts" },
        el("button", { class: "btn small", type: "button", text: "Copiar enlace", onclick: e => copiar(enlaceCodigo(d.id), e.target) }),
        el("button", { class: "btn small", type: "button", text: "Vídeos", onclick: async () => { const ids = await elegirVideos(c.videoIds || []); if(ids){ await updateDoc(d.ref, { videoIds: ids }); cargarCodigos(); } } }),
        el("button", { class: "btn small", type: "button", text: c.activo === false ? "Reactivar" : "Retirar", onclick: async () => { await updateDoc(d.ref, { activo: c.activo === false }); cargarCodigos(); } }),
        el("button", { class: "btn small", type: "button", text: "Borrar", onclick: async () => { if(confirm("¿Borrar este código? Quien lo tenga ya no podrá entrar.")){ await deleteDoc(d.ref); cargarCodigos(); } } }))));
  });
}
$("#k-crear").addEventListener("click", e => ocupado(e.target, async () => {
  const ids = marcados("#k-videos"); if(!ids.length) throw new Error("Marca al menos un vídeo.");
  const f = $("#k-caduca").value, codigo = nuevoCodigo();
  await setDoc(doc(db, "accessCodes", codigo), { nombre: $("#k-nombre").value.trim(), videoIds: ids, activo: true, usos: 0,
    caduca: f ? Timestamp.fromDate(new Date(f + "T23:59:59")) : null, createdAt: serverTimestamp() });
  $("#k-nombre").value = ""; $("#k-caduca").value = ""; pintarChecks("#k-videos");
  await cargarCodigos(); copiar(enlaceCodigo(codigo)); toast("Código creado. Enlace copiado para que lo pegues donde quieras.");
}));
function copiar(t, btn){
  const ok = () => { if(btn){ const o = btn.textContent; btn.textContent = "Copiado"; setTimeout(() => btn.textContent = o, 1400); } };
  navigator.clipboard?.writeText(t).then(ok, () => prompt("Copia este enlace:", t)) ?? prompt("Copia este enlace:", t);
}

// ---------- invitaciones ----------
async function enviarInvitacion(email){
  await sendSignInLinkToEmail(auth, email, { url: `${location.origin}/privado/`, handleCodeInApp: true });
  await updateDoc(doc(db, "invites", email), { enviadoEn: serverTimestamp() });
}
async function cargarInvitaciones(){
  const s = await getDocs(query(collection(db, "invites"), orderBy("createdAt", "desc")));
  const l = $("#i-lista"); l.replaceChildren();
  if(s.empty) l.append(el("li", {}, el("span", { class: "empty", text: "No has invitado a nadie todavía." })));
  s.docs.forEach(d => { const c = d.data();
    l.append(el("li", {},
      el("div", {}, el("div", { class: "t" }, c.nombre || d.id, el("span", { class: `pill ${c.activo === false ? "off" : "on"}`, text: c.activo === false ? "retirada" : "activa" })),
        el("div", { class: "s", text: `${d.id} · ${titulos(c.videoIds || [])}` }),
        el("div", { class: "s", text: `Enviada ${fecha(c.enviadoEn)} · ${c.usos || 0} visitas · último acceso ${fecha(c.ultimoAcceso)}` })),
      el("div", { class: "acts" },
        el("button", { class: "btn small", type: "button", text: "Reenviar", onclick: e => ocupado(e.target, async () => { await enviarInvitacion(d.id); toast(`Invitación reenviada a ${d.id}.`); cargarInvitaciones(); }) }),
        el("button", { class: "btn small", type: "button", text: "Vídeos", onclick: async () => { const ids = await elegirVideos(c.videoIds || []); if(ids){ await updateDoc(d.ref, { videoIds: ids }); cargarInvitaciones(); } } }),
        el("button", { class: "btn small", type: "button", text: c.activo === false ? "Reactivar" : "Retirar", onclick: async () => { await updateDoc(d.ref, { activo: c.activo === false }); cargarInvitaciones(); } }),
        el("button", { class: "btn small", type: "button", text: "Borrar", onclick: async () => { if(confirm(`¿Borrar la invitación de ${d.id}?`)){ await deleteDoc(d.ref); cargarInvitaciones(); } } }))));
  });
}
$("#i-crear").addEventListener("click", e => ocupado(e.target, async () => {
  const email = $("#i-email").value.trim().toLowerCase();
  if(!$("#i-email").validity.valid || !email) throw new Error("Escribe un email válido.");
  const ids = marcados("#i-videos"); if(!ids.length) throw new Error("Marca al menos un vídeo.");
  await setDoc(doc(db, "invites", email), { nombre: $("#i-nombre").value.trim(), videoIds: ids, activo: true, usos: 0, createdAt: serverTimestamp() }, { merge: true });
  await enviarInvitacion(email);
  $("#i-email").value = ""; $("#i-nombre").value = ""; pintarChecks("#i-videos");
  await cargarInvitaciones(); toast(`Invitación enviada a ${email}.`);
}));

async function recargarPrivado(){ await cargarPrivados(); await Promise.all([cargarCodigos(), cargarInvitaciones()]); }

// ---------- mensajes ----------
async function cargarMensajes(){
  const s = await getDocs(query(collection(db, "messages"), orderBy("createdAt", "desc")));
  const nuevos = s.docs.filter(d => !d.data().leido).length;
  $("#badge").hidden = !nuevos; $("#badge").textContent = nuevos;
  const l = $("#m-lista"); l.replaceChildren();
  if(s.empty) l.append(el("li", {}, el("span", { class: "empty", text: "Aún no ha llegado ningún mensaje." })));
  s.docs.forEach(d => { const m = d.data();
    const body = el("div", { class: "body", hidden: true },
      el("dl", {}, el("dt", { text: "Email" }), el("dd", { text: m.email }), el("dt", { text: "Proyecto" }), el("dd", { text: m.tipo || "—" }),
        el("dt", { text: "Rodaje" }), el("dd", { text: m.fecha || "—" }), el("dt", { text: "Presupuesto" }), el("dd", { text: m.presupuesto || "—" })),
      m.mensaje);
    const li = el("li", { class: m.leido ? "" : "nuevo" },
      el("div", {}, el("div", { class: "t", text: `${m.nombre} · ${m.tipo || "Sin tipo"}` }), el("div", { class: "s", text: fecha(m.createdAt) })),
      el("div", { class: "acts" },
        el("button", { class: "btn small", type: "button", text: "Abrir", onclick: async () => { body.hidden = !body.hidden; if(!m.leido){ m.leido = true; li.classList.remove("nuevo"); await updateDoc(d.ref, { leido: true }); cargarBadge(); } } }),
        el("a", { class: "btn small", href: `mailto:${m.email}?subject=${encodeURIComponent("Re: tu proyecto")}`, text: "Responder" }),
        el("button", { class: "btn small", type: "button", text: "Borrar", onclick: async () => { if(confirm("¿Borrar este mensaje?")){ await deleteDoc(d.ref); cargarMensajes(); } } })),
      body);
    l.append(li);
  });
}
async function cargarBadge(){ const n = $$("#m-lista li.nuevo").length; $("#badge").hidden = !n; $("#badge").textContent = n; }

// ---------- arranque ----------
let arrancado = false;
async function arrancar(){
  if(arrancado) return; arrancado = true;
  ruta();
  try {
    const c = await getDoc(refCfg());
    existe = c.exists(); if(existe) cfg = mezclar(CONFIG_INICIAL, c.data());
    pintarCfg();
    await Promise.all([cargarTrabajos(), recargarPrivado(), cargarMensajes()]);
  } catch(e){ console.error(e); toast("No se ha podido leer la base de datos. Revisa las reglas de Firestore (paso 5 de la guía).", true); }
}
