// Reconoce enlaces de YouTube y Vimeo y los convierte en reproductores incrustados.
// Se usa en la web, en el panel y en la zona privada. Este archivo también lo
// importan las funciones de Netlify (netlify/lib/comun.mjs), así que no usa nada del navegador.

export function leerVideo(url){
  if(!url) return null;
  let u;
  try { u = new URL(String(url).trim()); } catch { return null; }
  const host = u.hostname.replace(/^www\.|^m\./, "");
  const partes = u.pathname.split("/").filter(Boolean);

  // YouTube: watch?v=ID · youtu.be/ID · /shorts/ID · /embed/ID · /live/ID
  if(host === "youtube.com" || host === "youtube-nocookie.com" || host === "music.youtube.com"){
    let id = u.searchParams.get("v");
    if(!id && ["shorts", "embed", "live", "v"].includes(partes[0])) id = partes[1];
    if(id && /^[\w-]{6,20}$/.test(id)) return youtube(id, u.searchParams.get("t") || u.searchParams.get("start"));
  }
  if(host === "youtu.be" && partes[0] && /^[\w-]{6,20}$/.test(partes[0])){
    return youtube(partes[0], u.searchParams.get("t"));
  }

  // Vimeo: vimeo.com/ID · vimeo.com/ID/HASH (oculto) · player.vimeo.com/video/ID?h=HASH
  if(host === "vimeo.com" || host === "player.vimeo.com"){
    const nums = partes.filter(p => /^\d{5,}$/.test(p));
    const iv = partes.indexOf("video");
    const id = (iv >= 0 && /^\d{5,}$/.test(partes[iv + 1] || "")) ? partes[iv + 1] : nums[nums.length > 1 && /^(showcase|album|channels|groups)$/.test(partes[0]) ? nums.length - 1 : 0];
    if(id){
      let hash = u.searchParams.get("h") || "";
      const despues = partes[partes.indexOf(id) + 1];
      if(!hash && despues && /^[0-9a-f]{6,}$/i.test(despues)) hash = despues;
      return vimeo(id, hash);
    }
  }
  return null;
}

function segundos(t){
  if(!t) return 0;
  if(/^\d+$/.test(t)) return Number(t);
  const m = String(t).match(/(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?/);
  return m ? (Number(m[1] || 0) * 3600 + Number(m[2] || 0) * 60 + Number(m[3] || 0)) : 0;
}

function youtube(id, t){
  const p = new URLSearchParams({ rel: "0", modestbranding: "1", playsinline: "1", iv_load_policy: "3" });
  const s = segundos(t); if(s) p.set("start", String(s));
  return {
    tipo: "youtube", id,
    embed: `https://www.youtube-nocookie.com/embed/${id}?${p}`,
    poster: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    enlace: `https://youtu.be/${id}`
  };
}

function vimeo(id, hash){
  const p = new URLSearchParams({ dnt: "1", title: "0", byline: "0", portrait: "0" });
  if(hash) p.set("h", hash);
  return {
    tipo: "vimeo", id, hash,
    embed: `https://player.vimeo.com/video/${id}?${p}`,
    poster: "",
    enlace: hash ? `https://vimeo.com/${id}/${hash}` : `https://vimeo.com/${id}`
  };
}

// Añade la reproducción automática a un enlace incrustado (al abrirlo desde un clic).
export function conAutoplay(embed){
  return embed + (embed.includes("?") ? "&" : "?") + "autoplay=1";
}
