// Acciones del panel sobre archivos de Cloudinary: ver un vídeo privado,
// renovar su enlace (los enlaces antiguos dejan de funcionar) y borrar archivos.
import { manejar, exigirAdmin, db, cloudinary, enlacesPrivados, codigoAleatorio, ErrorHttp, CARPETA_PRIVADA } from "../lib/comun.mjs";

export default manejar(async (req, body) => {
  await exigirAdmin(req);
  const { accion } = body;

  if(accion === "ver" || accion === "renovar" || accion === "borrar-privado"){
    const ref = db.collection("privateVideos").doc(String(body.videoId || "_"));
    const snap = await ref.get();
    if(!snap.exists) throw new ErrorHttp(404, "Ese vídeo ya no existe.");
    const v = snap.data();

    if(accion === "ver") return enlacesPrivados(v);

    if(accion === "renovar"){
      if(!v.publicId) throw new ErrorHttp(400, "Los vídeos de YouTube o Vimeo no se renuevan desde aquí: cambia su privacidad en esa plataforma.");
      const nuevo = `${CARPETA_PRIVADA}/${codigoAleatorio(16)}`;
      await cloudinary.uploader.rename(v.publicId, nuevo, { resource_type: "video", type: "authenticated", to_type: "authenticated", invalidate: true });
      await ref.update({ publicId: nuevo, renovadoEn: new Date() });
      return { ok: true };
    }

    if(v.publicId) await cloudinary.uploader.destroy(v.publicId, { resource_type: "video", type: "authenticated", invalidate: true });
    await ref.delete();
    // quitarlo de códigos e invitaciones
    for(const col of ["accessCodes", "invites"]){
      const q = await db.collection(col).where("videoIds", "array-contains", snap.id).get();
      await Promise.all(q.docs.map(d => d.ref.update({ videoIds: d.data().videoIds.filter(x => x !== snap.id) })));
    }
    return { ok: true };
  }

  if(accion === "borrar-publico"){
    const id = String(body.publicId || "");
    if(!id.startsWith("daniel/publico/")) throw new ErrorHttp(400, "Archivo no válido.");
    await cloudinary.uploader.destroy(id, { resource_type: body.tipo === "video" ? "video" : "image", invalidate: true });
    return { ok: true };
  }

  throw new ErrorHttp(400, "Acción desconocida.");
});

export const config = { path: "/api/admin-medios" };
