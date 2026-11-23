// Letras y estilo del texto de la web: Dani lo elige en el panel (Letras) y se guarda en site/config → letras.
// Las letras salen de Google Fonts. Cada papel se carga con su propio enlace, así una letra
// mal escrita no estropea las otras.

// [nombre, pesos/cursiva que se piden a Google, tipo de letra de respaldo]
// "Didot" es especial: en Mac, iPhone e iPad se usa la Didot del sistema (la de verdad);
// en Windows y Android, Bodoni Moda, que es la gratuita más parecida.
const BODONI = "ital,opsz,wght@0,6..96,400;1,6..96,400";
export const CATALOGO = {
  titulos: {
    "Didonas (estilo Didot, alto contraste)": [
      ["Didot", BODONI, "serif"], ["Bodoni Moda", BODONI, "serif"], ["Libre Bodoni", "ital,wght@0,400;1,400", "serif"],
      ["Playfair Display", "ital,wght@0,400;1,400", "serif"], ["GFS Didot", "", "serif"]
    ],
    "Con remate (más clásicas)": [
      ["Instrument Serif", "ital@0;1", "serif"], ["DM Serif Display", "ital@0;1", "serif"], ["Fraunces", "ital,wght@0,400;1,400", "serif"],
      ["Cormorant Garamond", "ital,wght@0,400;1,400", "serif"], ["Abril Fatface", "", "serif"]
    ],
    "Estrechas, tipo cartel": [
      ["Anton", "", "sans"], ["Bebas Neue", "", "sans"], ["Oswald", "wght@400;500", "sans"], ["League Gothic", "", "sans"],
      ["Big Shoulders Display", "wght@400;700", "sans"], ["Six Caps", "", "sans"], ["Antonio", "wght@400;700", "sans"], ["Fjalla One", "", "sans"]
    ],
    "Anchas y con fuerza": [
      ["Archivo Black", "", "sans"], ["Unbounded", "wght@400;600", "sans"], ["Syne", "wght@400;700", "sans"], ["Space Grotesk", "wght@400;700", "sans"]
    ]
  },
  texto: {
    "De máquina de escribir": [
      ["Courier Prime", "ital,wght@0,400;0,700;1,400", "mono"], ["IBM Plex Mono", "wght@300;400;500", "mono"], ["JetBrains Mono", "wght@300;400;600", "mono"],
      ["DM Mono", "wght@300;400;500", "mono"], ["Space Mono", "wght@400;700", "mono"]
    ],
    "Sin remate": [
      ["Archivo", "wght@300;400;600", "sans"], ["Inter", "wght@300;400;600", "sans"], ["DM Sans", "wght@300;400;600", "sans"], ["Work Sans", "wght@300;400;600", "sans"],
      ["Manrope", "wght@300;400;600", "sans"], ["IBM Plex Sans", "wght@300;400;600", "sans"], ["Libre Franklin", "wght@300;400;600", "sans"]
    ],
    "Con remate": [
      ["Source Serif 4", "wght@300;400;600", "serif"], ["Newsreader", "wght@300;400;600", "serif"], ["Lora", "wght@400;600", "serif"], ["EB Garamond", "wght@400;600", "serif"]
    ]
  },
  detalles: {
    "De máquina de escribir": [
      ["Courier Prime", "wght@400;700", "mono"], ["IBM Plex Mono", "wght@400;500", "mono"], ["JetBrains Mono", "wght@400;500", "mono"], ["DM Mono", "wght@400;500", "mono"],
      ["Space Mono", "wght@400;700", "mono"], ["Roboto Mono", "wght@400;500", "mono"]
    ],
    "Normales": [
      ["Archivo", "wght@400;500", "sans"], ["Inter", "wght@400;500", "sans"], ["Oswald", "wght@400;500", "sans"]
    ]
  }
};

// Lo que se ve si Dani no ha guardado nada: Didot en cursiva para títulos y Courier para todo lo demás.
export const DEFECTO = {
  titulos: "Didot", texto: "Courier Prime", detalles: "Courier Prime",
  cursiva: true,       // títulos en cursiva
  recorte: 12,         // % de la última línea de los títulos grandes que se corta por abajo (0 = sin recorte)
  escala: 100,         // tamaño de los títulos, en %
  escalaTexto: 100,    // tamaño del texto, en %
  colorSobre: ""       // color del texto pequeño encima de los títulos ("" = gris de siempre)
};

const RESPALDO = {
  serif: `"Bodoni 72","Bodoni MT",Didot,Georgia,serif`,
  sans: `"Impact","Arial Narrow",sans-serif`,
  mono: `"Courier New",Courier,ui-monospace,monospace`
};
const RESPALDO_PAPEL = { titulos: "serif", texto: "mono", detalles: "mono" };
const VAR = { titulos: "--display", texto: "--body", detalles: "--mono" };

// Nombre que se puede pedir a Google Fonts: letras, números y espacios.
export const nombreValido = n => typeof n === "string" && /^[A-Za-z0-9][A-Za-z0-9 ]{1,48}$/.test(n.trim());
export const colorValido = c => typeof c === "string" && /^#[0-9a-fA-F]{6}$/.test(c);

function ficha(papel, nombre){
  for(const grupo of Object.values(CATALOGO[papel])) for(const f of grupo) if(f[0] === nombre) return f;
  return null;   // letra escrita a mano: pedimos la normal; la cursiva y la negrita las simula el navegador
}

export function enlace(papel, nombre){
  const f = ficha(papel, nombre);
  const fam = nombre === "Didot" ? "Bodoni Moda" : nombre;
  const p = f ? f[1] : "";
  return `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fam).replace(/%20/g, "+")}${p ? ":" + p : ""}&display=swap`;
}

const entre = (v, min, max, def) => { const n = Number(v); return Number.isFinite(n) && n >= min && n <= max ? n : def; };

// Lo que hay que aplicar a la página: enlaces y variables CSS.
export function receta(l = {}){
  const r = { enlaces: {}, vars: {} };
  for(const papel of ["titulos", "texto", "detalles"]){
    const n = nombreValido(l[papel]) ? l[papel].trim() : DEFECTO[papel];
    const f = ficha(papel, n);
    const resp = RESPALDO[f ? f[2] : RESPALDO_PAPEL[papel]];
    r.enlaces[papel] = enlace(papel, n);
    r.vars[VAR[papel]] = n === "Didot" ? `"Didot","Bodoni Moda",${resp}` : `"${n}",${resp}`;
  }
  const cursiva = l.cursiva === undefined ? DEFECTO.cursiva : !!l.cursiva;
  const recorte = entre(l.recorte, 0, 40, DEFECTO.recorte);
  r.vars["--tit"] = String(entre(l.escala, 60, 130, 100) / 100);
  r.vars["--txt"] = String(entre(l.escalaTexto, 80, 130, 100) / 100);
  r.vars["--tit-estilo"] = cursiva ? "italic" : "normal";
  // recorte: lo que se corta por abajo, en "em" del propio título. Sin recorte dejamos margen
  // para que no se corten las letras que bajan (g, p, y).
  r.vars["--corte"] = recorte > 0 ? `${(recorte / 100 * 0.86).toFixed(3)}em` : "-0.4em";
  r.vars["--sobre"] = colorValido(l.colorSobre) ? l.colorSobre : "var(--ash)";
  return r;
}

export function aplicar(l, raiz = document, destino = raiz.documentElement){
  const r = receta(l);
  for(const [papel, href] of Object.entries(r.enlaces)){
    const id = "letra-" + papel;
    let link = raiz.getElementById(id);
    if(!link){ link = raiz.createElement("link"); link.rel = "stylesheet"; link.id = id; raiz.head.append(link); }
    if(link.href !== href) link.href = href;
  }
  for(const [k, v] of Object.entries(r.vars)) destino.style.setProperty(k, v);
  return r;
}

// En la web pública: aplica y guarda una copia para que la próxima visita salga ya con su letra.
export function aplicarYRecordar(l){
  const r = aplicar(l);
  try { localStorage.setItem("dha-letras", JSON.stringify(r)); } catch {}
}
