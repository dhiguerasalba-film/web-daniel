// Arranque compartido de Firebase para la web, el panel y la zona privada.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { firebaseConfig } from "./firebase-config.js";

export const configurado = !String(firebaseConfig.projectId).includes("PEGAR_AQUI");
export const app = configurado ? initializeApp(firebaseConfig) : null;
export const db = app ? getFirestore(app) : null;
export const auth = app ? getAuth(app) : null;

// Une la configuración guardada con la inicial, para que un campo vacío nunca rompa la página.
export function mezclar(base, extra){
  if(Array.isArray(base)) return Array.isArray(extra) ? extra : base;
  if(base && typeof base === "object"){
    const out = { ...base };
    for(const k of Object.keys(extra || {})) out[k] = mezclar(base[k], extra[k]);
    return out;
  }
  return extra === undefined || extra === null ? base : extra;
}

// Imagen de Cloudinary optimizada al ancho que se pide.
export function cld(url, ancho){
  if(!url || !url.includes("/res.cloudinary.com/") || !url.includes("/upload/")) return url || "";
  return url.replace("/upload/", `/upload/f_auto,q_auto,w_${ancho}/`);
}
