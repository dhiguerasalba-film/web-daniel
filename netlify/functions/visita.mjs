// Contador de visitas propio (sin cookies ni datos personales).
// La web llama aquí al cargar, al cambiar de sección y al reproducir un trabajo.
// Se guarda un documento por día en «stats»: stats/2026-11-23 → contadores.
import { db } from "../lib/comun.mjs";
import { FieldValue } from "firebase-admin/firestore";

const SECCIONES = ["inicio", "portfolio", "bio", "contacto", "redes", "privado"];
const BOTS = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram|curl|wget|python|headless|lighthouse/i;
const hoy = () => new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Madrid" }).format(new Date()); // AAAA-MM-DD
const limpio = t => String(t || "").toLowerCase().replace(/[^a-z0-9._-]/g, "").slice(0, 60);

function procedencia(ref, propio){
  if(!ref) return "directo";
  let h; try { h = new URL(ref).hostname.replace(/^www\.|^m\.|^l\.|^lm\./, ""); } catch { return "directo"; }
  if(!h || h === propio || h.endsWith(".netlify.app")) return null;      // navegación interna
  if(/instagram/.test(h)) return "instagram";
  if(/facebook|fb\.com/.test(h)) return "facebook";
  if(/google\./.test(h)) return "google";
  if(/bing|duckduckgo|ecosia|yahoo/.test(h)) return "otros buscadores";
  if(/linkedin|lnkd/.test(h)) return "linkedin";
  if(/t\.co$|twitter|x\.com/.test(h)) return "x";
  if(/vimeo/.test(h)) return "vimeo";
  if(/youtube|youtu\.be/.test(h)) return "youtube";
  if(/tiktok/.test(h)) return "tiktok";
  if(/whatsapp|wa\.me/.test(h)) return "whatsapp";
  if(/telegram|^t\.me$/.test(h)) return "telegram";
  return limpio(h);
}

export default async (req, context) => {
  if(req.method !== "POST") return new Response(null, { status: 405 });
  try {
    const ua = req.headers.get("user-agent") || "";
    if(BOTS.test(ua)) return new Response(null, { status: 204 });
    const b = await req.json().catch(() => ({}));
    const seccion = SECCIONES.includes(b.s) ? b.s : null;
    const upd = { vistas: FieldValue.increment(1), actualizado: new Date() };
    const sumar = (grupo, clave) => { (upd[grupo] ??= {})[clave] = FieldValue.increment(1); };
    if(seccion) sumar("secciones", seccion);

    if(b.nueva === true){                                   // primera página de la visita
      upd.visitas = FieldValue.increment(1);
      if(b.unico === true) upd.visitantes = FieldValue.increment(1);   // primera visita del día de ese navegador
      const p = procedencia(b.r, new URL(req.url).hostname.replace(/^www\./, ""));
      if(p) sumar("procedencias", p);
      sumar("dispositivos", /Mobi|Android|iPhone|iPad/i.test(ua) ? "movil" : "ordenador");
      const pais = limpio(context?.geo?.country?.code);
      if(pais) sumar("paises", pais.toUpperCase());
    }
    if(b.t && /^[A-Za-z0-9]{4,40}$/.test(b.t)) sumar("reproducciones", b.t);

    await db.collection("stats").doc(hoy()).set(upd, { merge: true });
  } catch (e) { console.error(e); }
  return new Response(null, { status: 204 });
};

export const config = { path: "/api/visita" };
