// Avisa al contador propio de la web (/api/visita). Sin cookies: solo una marca
// en este navegador para no contar dos veces al mismo visitante en un día.
// Las visitas de Daniel no cuentan: al entrar en el panel se marca su navegador.
const leer = k => { try { return localStorage.getItem(k); } catch { return null; } };
const poner = (k, v) => { try { localStorage.setItem(k, v); } catch {} };
const esDani = () => leer("dha-yo") === "1";
let primera = true;

export function contar(datos = {}){
  if(esDani() || navigator.webdriver) return;
  const body = { ...datos };
  if(primera){
    primera = false;
    const dia = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" });
    body.nueva = true;
    body.unico = leer("dha-visto") !== dia;
    poner("dha-visto", dia);
    body.r = document.referrer || "";
  }
  try {
    fetch("/api/visita", { method: "POST", keepalive: true, headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).catch(() => {});
  } catch {}
}

export function marcarComoDani(){ poner("dha-yo", "1"); }
