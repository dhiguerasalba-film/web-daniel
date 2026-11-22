// Da al panel un enlace firmado para subir un vídeo privado directamente a Cloudflare R2.
// Solo para el administrador. Si R2 no está configurado, el panel usa Cloudinary.
import { manejar, exigirAdmin, codigoAleatorio, ErrorHttp } from "../lib/comun.mjs";
import { r2Configurado, urlSubida } from "../lib/r2.mjs";

const MAX = 5 * 1024 ** 3;   // 5 GB por archivo (límite de una subida directa)

export default manejar(async (req, body) => {
  await exigirAdmin(req);
  if(!r2Configurado()) return { configurado: false };
  const tipo = String(body.tipo || "video/mp4");
  if(!tipo.startsWith("video/")) throw new ErrorHttp(400, "Solo se pueden subir vídeos.");
  if(Number(body.bytes) > MAX) throw new ErrorHttp(400, "El vídeo pesa más de 5 GB. Expórtalo más ligero (H.264, 1080p).");
  const ext = (String(body.nombre || "").match(/\.([a-z0-9]{2,5})$/i)?.[1] || "mp4").toLowerCase();
  const clave = `privado/${new Date().toISOString().slice(0, 10)}-${codigoAleatorio(16)}.${ext}`;
  return { configurado: true, clave, url: await urlSubida(clave, tipo), tipo };
});

export const config = { path: "/api/r2-subida" };
