// Devuelve los vídeos privados a los que tiene acceso quien llama:
//  - con un código ({ codigo }) generado en el panel, o
//  - con sesión iniciada por enlace al email, si Dani ha invitado ese email.
import { manejar, usuarioDeToken, db, enlacesPrivados, ErrorHttp } from "../lib/comun.mjs";
import { FieldValue } from "firebase-admin/firestore";

const NO = "Este acceso no existe, ha caducado o se ha retirado.";

export default manejar(async (req, body) => {
  let ids = [], titular = "", ref = null;

  if(body.codigo){
    const codigo = String(body.codigo).trim().toLowerCase();
    if(!/^[a-z0-9]{6,32}$/.test(codigo)) throw new ErrorHttp(404, NO);
    ref = db.collection("accessCodes").doc(codigo);
    const s = await ref.get();
    if(!s.exists) throw new ErrorHttp(404, NO);
    const c = s.data();
    if(c.activo === false) throw new ErrorHttp(403, NO);
    if(c.caduca && c.caduca.toDate() < new Date()) throw new ErrorHttp(403, NO);
    ids = c.videoIds || []; titular = c.nombre || "";
  } else {
    const u = await usuarioDeToken(req);
    if(!u || !u.email) throw new ErrorHttp(401, "Entra con el enlace que te ha llegado por email.");
    ref = db.collection("invites").doc(u.email.toLowerCase());
    const s = await ref.get();
    if(!s.exists || s.data().activo === false) throw new ErrorHttp(403, "Este email no tiene vídeos asignados. Si crees que es un error, escribe a Daniel.");
    ids = s.data().videoIds || []; titular = s.data().nombre || u.email;
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
  await ref.update({ usos: FieldValue.increment(1), ultimoAcceso: new Date() }).catch(() => {});
  return { titular, videos };
});

export const config = { path: "/api/acceso-privado" };
