// Devuelve los vídeos privados a los que tiene acceso quien llama:
//  - con un código ({ codigo }) generado en el panel, o
//  - con sesión iniciada por enlace al email, si Dani ha invitado ese email.
//
// Códigos de un solo uso: la primera vez se pide el email y se entrega una «llave»
// que se guarda en ese navegador. Con la llave se puede volver cuantas veces se quiera;
// sin ella (otro dispositivo, enlace reenviado) el código ya no sirve.
// Cada entrada queda apuntada en el código (email, fecha y si fue la primera vez).
import { manejar, usuarioDeToken, db, enlacesPrivados, ErrorHttp, codigoAleatorio } from "../lib/comun.mjs";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { createHash } from "node:crypto";

const NO = "Este acceso no existe, ha caducado o se ha retirado.";
const USADO = "Este enlace ya se ha abierto en otro dispositivo. Si eres tú, pide a Daniel que te lo vuelva a activar.";
const resumen = t => createHash("sha256").update(String(t)).digest("hex");
const emailValido = e => typeof e === "string" && e.length <= 190 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);

function apunte(email, nuevo, req){
  return { email, nuevo, at: Timestamp.now(), disp: (req.headers.get("user-agent") || "").slice(0, 120) };
}

export default manejar(async (req, body) => {
  let ids = [], titular = "", ref = null, llave = null;

  if(body.codigo){
    const codigo = String(body.codigo).trim().toLowerCase();
    if(!/^[a-z0-9]{6,32}$/.test(codigo)) throw new ErrorHttp(404, NO);
    ref = db.collection("accessCodes").doc(codigo);
    const s = await ref.get();
    if(!s.exists) throw new ErrorHttp(404, NO);
    const c = s.data();
    if(c.activo === false) throw new ErrorHttp(403, NO);
    if(c.caduca && c.caduca.toDate() < new Date()) throw new ErrorHttp(403, NO);
    const unUso = c.unUso !== false;               // por defecto, de un solo dispositivo

    const llaves = c.llaves || {};
    const conLlave = body.llave && llaves[resumen(body.llave)];
    if(conLlave){
      // vuelve el mismo dispositivo
      await ref.update({ usos: FieldValue.increment(1), ultimoAcceso: new Date(),
        accesos: FieldValue.arrayUnion(apunte(conLlave.email, false, req)) }).catch(() => {});
    } else {
      // primera vez en este dispositivo: hace falta el email
      const email = String(body.email || "").trim().toLowerCase();
      if(!emailValido(email)) throw new ErrorHttp(428, "Escribe tu email para abrir el visionado.");
      llave = codigoAleatorio(32);
      // transacción: si dos dispositivos abren el enlace a la vez, solo entra el primero
      await db.runTransaction(async tx => {
        const actual = (await tx.get(ref)).data() || {};
        if(unUso && Object.keys(actual.llaves || {}).length) throw new ErrorHttp(403, USADO);
        tx.update(ref, {
          [`llaves.${resumen(llave)}`]: { email, at: Timestamp.now() },
          usadoPor: actual.usadoPor || email, primerAcceso: actual.primerAcceso || Timestamp.now(),
          usos: FieldValue.increment(1), ultimoAcceso: new Date(),
          accesos: FieldValue.arrayUnion(apunte(email, true, req))
        });
      });
    }
    ids = c.videoIds || []; titular = c.nombre || "";
  } else {
    const u = await usuarioDeToken(req);
    if(!u || !u.email) throw new ErrorHttp(401, "Entra con el enlace que te ha llegado por email.");
    ref = db.collection("invites").doc(u.email.toLowerCase());
    const s = await ref.get();
    if(!s.exists || s.data().activo === false) throw new ErrorHttp(403, "Este email no tiene vídeos asignados. Si crees que es un error, escribe a Daniel.");
    ids = s.data().videoIds || []; titular = s.data().nombre || u.email;
    await ref.update({ usos: FieldValue.increment(1), ultimoAcceso: new Date(),
      accesos: FieldValue.arrayUnion(apunte(u.email.toLowerCase(), false, req)) }).catch(() => {});
  }

  // ids normales = colección privateVideos; "w:<id>" = trabajo del portfolio marcado como privado
  const refs = ids.map(id => id.startsWith("w:") ? db.collection("works").doc(id.slice(2)) : db.collection("privateVideos").doc(id));
  const snaps = refs.length ? await db.getAll(...refs) : [];
  const videos = snaps.filter(s => s.exists).map(s => {
    const v = s.data(), esTrabajo = s.ref.parent.id === "works";
    if(esTrabajo && !v.privado) return null;               // si vuelve a ser público, se ve en la web normal
    const medio = esTrabajo
      ? (v.enlace ? enlacesPrivados({ enlace: v.enlace }) : { url: v.videoUrl || "", poster: v.posterUrl || "" })
      : enlacesPrivados(v);
    if(!medio.embed && !medio.url) return null;
    const meta = esTrabajo ? [v.categoria, v.rol, v.anio].filter(Boolean).join(" · ") : "";
    return { id: s.id, titulo: v.titulo || "", descripcion: v.descripcion || "", duracion: [v.duracion, meta].filter(Boolean).join(" · "), ...medio };
  }).filter(Boolean);

  return { titular, videos, ...(llave ? { llave } : {}) };
});

export const config = { path: "/api/acceso-privado" };
