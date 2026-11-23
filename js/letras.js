// Letras de la web: Dani las elige en el panel (Letras) y se guardan en site/config → letras.
// Todas salen de Google Fonts. Cada papel se carga con su propio enlace, así una letra
// mal escrita no estropea las otras dos.

// [nombre en Google Fonts, pesos que se piden]. Pesos solo de los que existen en esa letra.
export const CATALOGO = {
  titulos: {
    "Estrechas, tipo cartel": [
      ["Anton", ""], ["Bebas Neue", ""], ["Oswald", "wght@400;500"], ["League Gothic", ""],
      ["Big Shoulders Display", "wght@400;700"], ["Six Caps", ""], ["Antonio", "wght@400;700"], ["Fjalla One", ""]
    ],
    "Anchas y con fuerza": [
      ["Archivo Black", ""], ["Unbounded", "wght@400;600"], ["Syne", "wght@400;700"], ["Space Grotesk", "wght@400;700"], ["Familjen Grotesk", "wght@400;700"]
    ],
    "Con remate (más clásicas)": [
      ["Instrument Serif", ""], ["DM Serif Display", ""], ["Playfair Display", "wght@400;700"], ["Fraunces", "wght@400;700"],
      ["Cormorant Garamond", "wght@400;600"], ["Abril Fatface", ""]
    ]
  },
  texto: {
    "Sin remate": [
      ["Archivo", "wght@300;400;600"], ["Inter", "wght@300;400;600"], ["DM Sans", "wght@300;400;600"], ["Work Sans", "wght@300;400;600"],
      ["Manrope", "wght@300;400;600"], ["IBM Plex Sans", "wght@300;400;600"], ["Libre Franklin", "wght@300;400;600"], ["Space Grotesk", "wght@300;400;600"]
    ],
    "Con remate": [
      ["Source Serif 4", "wght@300;400;600"], ["Newsreader", "wght@300;400;600"], ["Lora", "wght@400;600"], ["EB Garamond", "wght@400;600"]
    ]
  },
  detalles: {
    "De máquina de escribir": [
      ["IBM Plex Mono", "wght@400;500"], ["JetBrains Mono", "wght@400;500"], ["DM Mono", "wght@400;500"], ["Space Mono", "wght@400;700"],
      ["Roboto Mono", "wght@400;500"], ["Courier Prime", "wght@400;700"]
    ],
    "Normales": [
      ["Archivo", "wght@400;500"], ["Inter", "wght@400;500"], ["Oswald", "wght@400;500"]
    ]
  }
};

export const DEFECTO = { titulos: "Anton", texto: "Archivo", detalles: "IBM Plex Mono", escala: 100 };

const RESPALDO = {
  titulos: `"Impact","Arial Narrow",sans-serif`,
  texto: `"Helvetica Neue",Arial,sans-serif`,
  detalles: `ui-monospace,Menlo,monospace`
};
const VAR = { titulos: "--display", texto: "--body", detalles: "--mono" };

// Nombre que se puede pedir a Google Fonts: letras, números y espacios.
export const nombreValido = n => typeof n === "string" && /^[A-Za-z0-9][A-Za-z0-9 ]{1,48}$/.test(n.trim());

function pesos(papel, nombre){
  for(const grupo of Object.values(CATALOGO[papel])) for(const [n, p] of grupo) if(n === nombre) return p;
  return "";   // letra escrita a mano: pedimos la normal, el navegador simula la negrita
}

export function enlace(papel, nombre){
  const p = pesos(papel, nombre);
  return `https://fonts.googleapis.com/css2?family=${encodeURIComponent(nombre).replace(/%20/g, "+")}${p ? ":" + p : ""}&display=swap`;
}

// Lo que hay que aplicar a la página: enlaces y variables CSS.
export function receta(l = {}){
  const r = { enlaces: {}, vars: {} };
  for(const papel of ["titulos", "texto", "detalles"]){
    const n = nombreValido(l[papel]) ? l[papel].trim() : DEFECTO[papel];
    r.enlaces[papel] = enlace(papel, n);
    r.vars[VAR[papel]] = `"${n}",${RESPALDO[papel]}`;
  }
  const e = Number(l.escala);
  r.vars["--tit"] = String((e >= 60 && e <= 130 ? e : 100) / 100);
  return r;
}

export function aplicar(l, raiz = document){
  const r = receta(l);
  for(const [papel, href] of Object.entries(r.enlaces)){
    const id = "letra-" + papel;
    let link = raiz.getElementById(id);
    if(!link){ link = raiz.createElement("link"); link.rel = "stylesheet"; link.id = id; raiz.head.append(link); }
    if(link.href !== href) link.href = href;
  }
  for(const [k, v] of Object.entries(r.vars)) raiz.documentElement.style.setProperty(k, v);
  return r;
}

// En la web pública: aplica y guarda una copia para que la próxima visita salga ya con su letra.
export function aplicarYRecordar(l){
  const r = aplicar(l);
  try { localStorage.setItem("dha-letras", JSON.stringify(r)); } catch {}
}
