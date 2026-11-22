// Utilidades compartidas por las funciones de Netlify.
// Variables de entorno necesarias (se ponen en Netlify → Configuración del sitio → Variables de entorno):
//   FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
//   CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { v2 as cloudinary } from "cloudinary";
import { leerVideo } from "../../js/video.js";
import { urlVer } from "./r2.mjs";

if(!getApps().length){
  initializeApp({ credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n")
  }) });
}
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

export const db = getFirestore();
export const auth = getAuth();
export { cloudinary };

export const CARPETA_PUBLICA = "daniel/publico";
export const CARPETA_PRIVADA = "daniel/privado";

export function json(data, status = 200){
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
}
export class ErrorHttp extends Error { constructor(status, msg){ super(msg); this.status = status; } }

export async function usuarioDeToken(req){
  const h = req.headers.get("authorization") || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : "";
  if(!token) return null;
  try { return await auth.verifyIdToken(token); } catch { return null; }
}

export async function exigirAdmin(req){
  const u = await usuarioDeToken(req);
  if(!u) throw new ErrorHttp(401, "Inicia sesión de nuevo.");
  const a = await db.collection("admins").doc(u.uid).get();
  if(!a.exists) throw new ErrorHttp(403, "Esta cuenta no tiene permiso de administración.");
  return u;
}

export function manejar(fn){
  return async req => {
    if(req.method !== "POST") return json({ error: "Método no permitido" }, 405);
    try {
      const body = await req.json().catch(() => ({}));
      return json(await fn(req, body));
    } catch (e) {
      if(e instanceof ErrorHttp) return json({ error: e.message }, e.status);
      console.error(e);
      return json({ error: "Error del servidor. Revisa las variables de entorno en Netlify." }, 500);
    }
  };
}

// Enlaces firmados de un vídeo protegido. Sin la clave secreta nadie puede generarlos.
export async function enlacesPrivados(v){
  // vídeo privado guardado en Cloudflare R2
  if(v.r2Key) return { url: await urlVer(v.r2Key), poster: "" };
  // vídeo privado guardado como enlace de YouTube o Vimeo
  if(v.enlace){
    const inc = leerVideo(v.enlace);
    return inc ? { embed: inc.embed, poster: inc.poster } : { embed: "", poster: "" };
  }
  const base = { resource_type: "video", type: "authenticated", sign_url: true, secure: true };
  return {
    url: cloudinary.url(v.publicId, { ...base, format: v.formato || "mp4" }),
    poster: cloudinary.url(v.publicId, { ...base, format: "jpg", transformation: [{ start_offset: "auto", width: 1280, crop: "limit" }] })
  };
}

export function codigoAleatorio(n = 12){
  const abc = "abcdefghjkmnpqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(n));
  return Array.from(bytes, b => abc[b % abc.length]).join("");
}
