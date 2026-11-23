# Web de Daniel Higueras Alba · Guía de puesta en marcha

Esta guía se sigue **una sola vez**. Cuando esté hecha, todo el día a día se hace desde el panel (`tudominio.es/panel`) y no hace falta tocar código ni hacer deploys.

Tiempo aproximado: 45 minutos.

---

## Qué hay en la web

| Dirección | Qué es |
|---|---|
| `/` | La web pública: portada, portfolio, bio, contacto y redes. |
| `/panel` | Tu panel. Solo entras tú, con email y contraseña. |
| `/privado` | La sala de visionado privado para clientes. |

Dónde vive cada cosa:

- **GitHub**: el código. Solo cambia cuando cambia el diseño.
- **Netlify**: aloja la web y las dos funciones que protegen los vídeos privados.
- **Firebase**: los textos, los trabajos, los mensajes del formulario, los accesos y tu login.
- **Cloudinary**: las fotos y los vídeos.
- **Dondominio**: el dominio.

Cambiar un texto o subir un vídeo desde el panel **no hace ningún deploy**, así que no gasta créditos de Netlify.

---

## 1. GitHub

1. Crea un repositorio **privado** vacío, por ejemplo `web-daniel`.
2. Entra en *Settings → Collaborators → Add people* y añade a Otto, que es quien sube el código.

## 2. Firebase

1. Entra en <https://console.firebase.google.com> con tu cuenta de Google y pulsa **Crear un proyecto** (por ejemplo `web-daniel`). Google Analytics no hace falta.
2. **Firestore Database → Crear base de datos**. Ubicación `eur3 (europe-west)`, modo **producción**.
3. **Authentication → Comenzar → Método de acceso**. Activa:
   - **Correo electrónico/contraseña**, y dentro también **Vínculo de correo electrónico (acceso sin contraseña)**.
4. **Authentication → Configuración → Dominios autorizados**. Añade tu dominio (`tudominio.es`) y el de Netlify (`algo.netlify.app`).
5. **Authentication → Plantillas**: cambia el idioma de las plantillas a **español**.
6. **Authentication → Usuarios → Agregar usuario**: tu email y una contraseña. Esta es tu cuenta del panel.

## 3. Conectar la web con Firebase

1. Firebase → ⚙️ **Configuración del proyecto → Tus apps → icono `</>`** (app web). Ponle un nombre y regístrala. No hace falta Hosting.
2. Copia el bloque `firebaseConfig` que aparece y pásaselo a Otto. Va en `js/firebase-config.js`. Estos datos no son secretos.

## 4. Darte permiso de administrador

1. Firebase → **Authentication → Usuarios**. Copia el **UID** de tu usuario.
2. **Firestore → Iniciar colección** con el nombre `admins`. Como **ID del documento** pega tu UID y añade un campo cualquiera, por ejemplo `nombre` = `Daniel`. Guarda.

(Si entras en el panel sin haber hecho esto, el propio panel te enseña el UID que tienes que pegar).

## 5. Reglas de seguridad

Firestore → **Reglas**. Borra lo que haya, pega el contenido del archivo `firestore.rules` y pulsa **Publicar**.

Estas reglas son las que hacen que nadie más pueda cambiar tu web ni ver tus mensajes o accesos.

## 6. Clave para las funciones (cuenta de servicio)

1. Firebase → ⚙️ **Configuración del proyecto → Cuentas de servicio → Generar nueva clave privada**. Se descarga un archivo `.json`.
2. **No lo subas a GitHub ni lo mandes por WhatsApp.** Solo vas a copiar tres valores de él en Netlify (paso 8).

## 7. Cloudinary

1. En <https://console.cloudinary.com>, en **Dashboard / API Keys**, apunta tres datos: **Cloud name**, **API Key** y **API Secret**.
2. Nada más. Las carpetas `daniel/publico` y `daniel/privado` se crean solas con la primera subida.

> Con el plan gratuito de Cloudinary cada vídeo puede pesar **100 MB como máximo**. Para piezas largas del portfolio público usa el campo «Enlace externo» (Vimeo o YouTube). Para vídeos privados grandes, expórtalos en H.264 a una calidad razonable, o mejora el plan.

## 8. Netlify

1. En <https://app.netlify.com> → **Add new site → Import an existing project → GitHub** → elige `web-daniel`.
2. No toques nada de la configuración de compilación (va en `netlify.toml`). Pulsa **Deploy**.
3. **Site configuration → Environment variables → Add a variable**. Crea estas seis:

| Variable | De dónde sale |
|---|---|
| `FIREBASE_PROJECT_ID` | el `project_id` del `.json` |
| `FIREBASE_CLIENT_EMAIL` | el `client_email` del `.json` |
| `FIREBASE_PRIVATE_KEY` | el `private_key` del `.json`, entero, desde `-----BEGIN` hasta `END PRIVATE KEY-----\n` |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary |
| `CLOUDINARY_API_KEY` | Cloudinary |
| `CLOUDINARY_API_SECRET` | Cloudinary (márcala como secreta) |

4. **Deploys → Trigger deploy → Deploy site**, para que las funciones lean las variables.

Cada vez que Otto sube un cambio de diseño a GitHub, Netlify publica la web solo.

## 9. Dominio (Dondominio)

1. Netlify → **Domain management → Add a domain** → escribe tu dominio.
2. En Dondominio → tu dominio → **Zona DNS**:
   - Registro **A** para `@` → `75.2.60.5`
   - Registro **CNAME** para `www` → `tu-sitio.netlify.app`
3. Espera de unos minutos a unas horas. Netlify pone el certificado HTTPS solo.
4. Vuelve al paso 2.4 y comprueba que el dominio está en los dominios autorizados de Firebase.

## 10. Primer arranque

1. Entra en `tudominio.es/panel` con tu email y contraseña.
2. Pulsa **Cargar contenido de ejemplo** y cambia los textos por los tuyos.
3. Haz una prueba: manda un mensaje desde el formulario de contacto y mira que te llega a **Mensajes**.

---

## El día a día desde el panel

- **Portada, Bio, Contacto, Redes**: cambia el texto y pulsa *Guardar*. Se ve en la web al momento.
- **Portfolio**: *+ Nuevo trabajo*, rellena los datos y sube el vídeo o pon un enlace externo. Las flechas cambian el orden. «Visible» lo enseña u oculta. «Destacado» lo pone en la portada.
- **Fotos de fondo**: cambia la foto de cada sección. «Volver a la original» recupera la de siempre.
- **Modo día / noche**: botón abajo en el menú (y en la pantalla de entrada) para ver el panel con fondo claro u oscuro. Se recuerda en cada navegador.
- **Letras**: elige la letra de los títulos, del texto y de los detalles (menú, etiquetas), y el tamaño de los títulos. Se ve una muestra antes de guardar. Vale cualquier letra de Google Fonts escribiendo su nombre.
- **Mensajes**: los nuevos llevan un punto rojo. «Responder» abre tu correo.

### Vídeos privados

1. **Vídeos privados**: súbelo con título y notas. Queda protegido: aunque alguien copie la dirección del archivo, sin permiso no se ve.
2. Dale acceso de una de estas dos formas:
   - **Código de acceso**: para quién es, qué vídeos ve y, si quieres, hasta cuándo. Al crearlo se copia un enlace (`tudominio.es/privado/?c=…`) para pegarlo en WhatsApp o en un email. Quien lo tenga entra sin registrarse.
   - **Invitación por email**: escribe su email y elige los vídeos. Le llega un correo con un enlace para entrar. Sirve para clientes que vuelven: si luego le asignas más vídeos, los ve con el mismo email.
3. Para quitar el acceso, pulsa **Retirar** (se puede reactivar) o **Borrar**.
4. **Renovar enlace**: si sospechas que alguien ha copiado y pasado la dirección del vídeo, esto la cambia y la antigua deja de funcionar. Quien tenga acceso lo sigue viendo sin hacer nada.

Ningún sistema de este tipo puede impedir que alguien grabe la pantalla. Esto controla quién entra, no lo que hace después.

---

## Si algo falla

| Lo que pasa | Qué mirar |
|---|---|
| El panel dice «Falta configurar Firebase» | Paso 3: `js/firebase-config.js` sin rellenar. |
| El panel dice «Esta cuenta no es de administrador» | Paso 4: el UID de `admins` no coincide. |
| «No se ha podido leer la base de datos» | Paso 5: reglas sin publicar. |
| Las subidas o los vídeos privados dan «Error del servidor» | Paso 8: falta alguna variable de entorno, o no se volvió a desplegar después de crearlas. |
| El enlace del email no funciona | Paso 2.4: el dominio no está autorizado en Firebase. |

## Estructura del proyecto

```
index.html              web pública
css/site.css            estilos de la web
js/efectos.js           grano, código de tiempo, navegación
js/site.js              pinta la web con lo guardado en Firebase
js/contenido-inicial.js contenido de partida
js/firebase-config.js   datos del proyecto de Firebase (paso 3)
js/firebase.js          arranque de Firebase
panel/                  panel de administración
js/panel.js
privado/                sala de visionado privado
js/privado.js
netlify/functions/      firmar-subida, admin-medios, acceso-privado
netlify/lib/comun.mjs   código compartido de las funciones
firestore.rules         reglas de seguridad (paso 5)
img/                    fotos de fondo originales
```

## Política de seguridad (netlify.toml)

La web solo puede cargar cosas de los servicios que están en la lista `Content-Security-Policy` de `netlify.toml`
(Firebase, Cloudinary, Cloudflare R2, YouTube, Vimeo, Google Fonts y Formspree). Si se añade un servicio nuevo y
no funciona, lo primero es mirar ahí. Tampoco se puede meter código `<script>` dentro del HTML: va siempre en un
archivo de `js/`.
