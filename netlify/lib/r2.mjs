// Cloudflare R2: almacén de los vídeos privados pesados.
// Variables de entorno (Netlify): R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET
// Los archivos nunca son públicos: se suben y se ven con enlaces firmados que caducan.
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const r2Configurado = () => !!(process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY && process.env.R2_BUCKET);

let cliente = null;
function s3(){
  return cliente ??= new S3Client({
    region: "auto",
    forcePathStyle: true,
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY }
  });
}
const BUCKET = () => process.env.R2_BUCKET;

// Enlace para que el panel suba el archivo directamente a R2 (válido 2 horas; hasta 5 GB por archivo)
export function urlSubida(clave, tipo){
  return getSignedUrl(s3(), new PutObjectCommand({ Bucket: BUCKET(), Key: clave, ContentType: tipo }), { expiresIn: 7200 });
}

// Dirección temporal del archivo (6 horas). El cliente no lo nota: cada vez que entra en la sala,
// o si caduca con la página abierta, la web pide otra. Solo sirve para que copiar la dirección no valga.
export function urlVer(clave){
  return getSignedUrl(s3(), new GetObjectCommand({ Bucket: BUCKET(), Key: clave }), { expiresIn: 6 * 3600 });
}

export function borrar(clave){
  return s3().send(new DeleteObjectCommand({ Bucket: BUCKET(), Key: clave }));
}
