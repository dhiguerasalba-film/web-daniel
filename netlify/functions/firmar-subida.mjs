// Firma una subida directa a Cloudinary desde el panel. Solo para el administrador.
import { manejar, exigirAdmin, cloudinary, CARPETA_PUBLICA, CARPETA_PRIVADA } from "../lib/comun.mjs";

export default manejar(async (req, body) => {
  await exigirAdmin(req);
  const privado = body.privado === true;
  const params = { timestamp: Math.round(Date.now() / 1000), folder: privado ? CARPETA_PRIVADA : CARPETA_PUBLICA };
  if(privado) params.type = "authenticated";
  const signature = cloudinary.utils.api_sign_request(params, process.env.CLOUDINARY_API_SECRET);
  return { ...params, signature, apiKey: process.env.CLOUDINARY_API_KEY, cloudName: process.env.CLOUDINARY_CLOUD_NAME };
});

export const config = { path: "/api/firmar-subida" };
