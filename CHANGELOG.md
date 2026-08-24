# Changelog — La Comadre Lola

Todas las modificaciones notables de este proyecto están documentadas en este archivo.
El formato se basa en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/) y este proyecto se adhiere a [Semantic Versioning](https://semver.org/lang/es/).

---

## [2.0.0] - 2026-08-24 · Lanzamiento Oficial Producción (GA)

### 🌟 Agregado (Added)
- **Panel de Control & CMS Unificado (`/admin`):**
  - Consolidación en una sola pantalla de 6 módulos operativos: Métricas, Reservas, Comandas, Newsletter, Editor CMS y Manual.
  - Sub-secciones CMS en vivo: Hero de Portada, Carta & Precios, Carrusel full-screen, Galería de momentos, Cartelera de Eventos con links a ticketeras (FilaCero), Paleta de Colores y Footer sincronizado.
- **Compresión de Imágenes en Canvas en Tiempo Real:**
  - Reducción instantánea de fotos pesadas a JPEG livianos (~35 KB) antes de enviarlas al servidor.
  - Permite subir fotos directas desde celulares o computadores sin desbordar el almacenamiento de SQLite/D1.
- **Despacho Automático de Correos en Edge (`functions/api/reservations.js`):**
  - Envío automático de notificaciones de reservas a `artemisa.photo@gmail.com` y acuse de recibo a los clientes.
  - Endpoint de diagnóstico de correo en 1 clic (`functions/api/admin/test-email.js`).
- **Enrutamiento Dual y Redirección Canónica (`www` y Apex):**
  - Implementación de `functions/_middleware.js` y `_redirects` para resolución fluida de `www.lacomadrelola.cl` y `lacomadrelola.cl`.
- **Manual de Administración Oficial:**
  - Redacción en lenguaje 100% de negocio orientado al administrador del local.
  - Generación automatizada del archivo [Manual_Administracion_La_Comadre_Lola.pdf](./Manual_Administracion_La_Comadre_Lola.pdf) en formato A4 de alta fidelidad.
  - Guía paso a paso para la configuración de Contraseñas de Aplicación en Google Gmail.
- **Suite QA Automatizada (`tests/qa-suite.test.js`):**
  - 146 pruebas automatizadas que cubren tipografías, assets, modo accesible de carta, app de garzones, formularios de reserva, backend, enlaces e hipervínculos sin rutas rotas y Edge middleware.

### 🎨 Cambiado (Changed)
- **Fondo Floral Oscuro y Accesibilidad (WCAG AAA):**
  - Refactorización de la capa de fondo en todas las vistas (`index.html`, `carta.html`, `admin.html`, `garzon.html`, `login.html`, `guia.html`) con un gradiente oscuro profundo (`#08080c`) que garantiza máximo contraste y legibilidad para textos blancos, descripciones y botones neón.
- **Limpieza de Barra de Navegación Pública:**
  - Remoción de accesos administrativos y de guía en las cabeceras públicas de `index.html` y `carta.html`.
- **Carta Digital 100% Pura:**
  - Optimización de la experiencia de lectura en móvil y desktop con selectores de 2 columnas / 1 columna y aumento de tamaño de tipografía para mayores de 50 años.

### 🐛 Corregido (Fixed)
- **Error D1 SQLite `no column named key`:** Recreación y migración de la tabla `cms_content` con el esquema relacional correcto en Cloudflare D1 remoto.
- **Error D1 SQLite `SQLITE_TOOBIG`:** Solucionado mediante el compresor HTML5 Canvas en el cliente antes de la llamada API.
- **Redirección de `/editor`:** Rutas `/editor` y `editor_cms.html` ahora redirigen de inmediato al tab CMS dentro del panel unificado `/admin?tab=cms`.

### 🔒 Seguridad (Security)
- Autenticación administrativa mediante tokens JWT criptográficos.
- Rate limiting en endpoints sensibles para mitigar ataques de denegación de servicio y fuerza bruta.
- Sanitización de inputs y prevención de inyecciones SQL con consultas preparadas (`.bind()`).
