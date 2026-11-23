// Contenido de partida. La web lo usa si la base de datos aún está vacía,
// y el panel lo carga con el botón "Cargar contenido de ejemplo".
export const CONFIG_INICIAL = {
  firma: "daniel higueras alba",
  nombre: "Daniel Higueras Alba",
  hud: { lugar: "madrid", formato: "25 fps · 2.39:1" },
  inicio: {
    kicker: "Director · realizador · videógrafo",
    titular: "sigo aquí.",
    entradilla: "Documental, videoclip y publicidad con gente real delante de la cámara. Ruedo cerca, con poca luz y sin prisa.",
    boton: "Ver portfolio →"
  },
  portfolio: { kicker: "Portfolio · 2022—2026", titulo: "lo que he rodado", pie: "Showreel completo bajo petición · Material en 4K ProRes" },
  bio: {
    kicker: "Bio",
    titulo: "mirar antes de grabar",
    parrafos: [
      "Soy director y realizador en Madrid. Empecé con la cámara al hombro en la calle y sigo trabajando igual: observando primero y grabando después.",
      "Dirijo documentales, videoclips y piezas de marca. Me interesa la gente cuando deja de posar, los silencios largos y la luz que ya está en el sitio.",
      "Trabajo con equipos pequeños. Muchas veces dirijo y opero cámara a la vez, y me ocupo del montaje y el color hasta la entrega final."
    ],
    datos: [
      { etiqueta: "Base", valor: "Madrid · disponible para viajar" },
      { etiqueta: "Hago", valor: "Dirección, realización, cámara, montaje, color" },
      { etiqueta: "Formatos", valor: "Documental, videoclip, publicidad, entrevista" },
      { etiqueta: "Equipo", valor: "Cine digital, ópticas fijas, sonido directo" }
    ]
  },
  contacto: {
    kicker: "Contacto · clientes y productoras",
    titulo: "cuéntamelo.",
    entradilla: "Escribe con la idea, aunque esté a medias. Respondo en 48 horas con disponibilidad y un primer presupuesto.",
    email: "hola@danielhigueras.es",
    telefono: "",
    tipos: ["Videoclip", "Documental", "Publicidad / marca", "Evento", "Otro"],
    presupuestos: ["Menos de 1.500 €", "1.500 – 5.000 €", "5.000 – 15.000 €", "Más de 15.000 €", "Aún no lo sé"],
    gracias: "Recibido. Te contesto en 48 horas como mucho."
  },
  redes: {
    kicker: "Redes sociales",
    titulo: "detrás de la cámara",
    lista: [
      { nombre: "instagram", usuario: "@danielhigueras", url: "https://www.instagram.com/" },
      { nombre: "vimeo", usuario: "/danielhigueras", url: "https://vimeo.com/" }
    ]
  },
  fondos: { inicio: "", portfolio: "", bio: "", contacto: "", redes: "" },
  letras: { titulos: "Anton", texto: "Archivo", detalles: "IBM Plex Mono", escala: 100 }
};

export const TRABAJOS_INICIALES = [
  { titulo: "Hasta el último tren", categoria: "Documental", duracion: "52:10", rol: "Dirección y cámara", cliente: "", anio: "2026", descripcion: "", videoUrl: "", posterUrl: "", enlace: "", visible: true, destacado: true, orden: 1 },
  { titulo: "Lumbre", categoria: "Videoclip", duracion: "03:48", rol: "Dirección", cliente: "Sello independiente", anio: "2025", descripcion: "", videoUrl: "", posterUrl: "", enlace: "", visible: true, destacado: true, orden: 2 },
  { titulo: "Ruta 5", categoria: "Publicidad", duracion: "00:45", rol: "Realización", cliente: "Marca de automoción", anio: "2025", descripcion: "", videoUrl: "", posterUrl: "", enlace: "", visible: true, destacado: true, orden: 3 }
];
