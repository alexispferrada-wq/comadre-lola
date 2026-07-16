# 🌹 La Comadre Lola

Sitio web oficial de **La Comadre Lola** — Restaurant · Bar · Eventos · Quilicura, Chile.

Aplicación web completa con sitio público, sistema de reservas online, newsletter, panel de administración y CMS visual con edición en tiempo real.

---

## Funcionalidades

- **Hero con carrusel** — imágenes editables desde el CMS, crossfade automático
- **Galería "Mejores Momentos"** — lightbox con navegación por teclado
- **Eventos** — cards dinámicas con flyer, precio, tag y botón de acción
- **Reservas online** — formulario con validación y notificación por email al administrador
- **Newsletter** — suscripción de correos con gestión desde el panel
- **Editor CMS** (`/editor`) — editor visual con autosave, preview en tiempo real y subida de imágenes a Cloudinary
- **Panel Admin** (`/admin`) — estadísticas, gestión de reservas y suscriptores, protegido con JWT

---

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | HTML5 + CSS3 + JavaScript vanilla (GitHub Pages) |
| Backend | Node.js + Express |
| Base de datos | MongoDB Atlas |
| Imágenes | Cloudinary |
| Autenticación | JWT (expiración 8 h) |
| Email | Nodemailer |
| Deploy backend | Render.com (Infrastructure as Code vía `render.yaml`) |

---

## Estructura del proyecto

```
comadre-lola/
├── index.html          # Página principal (hero, galería, eventos, reservas)
├── admin.html          # Panel de administración (reservas, newsletter, stats)
├── editor_cms.html     # CMS visual con preview en tiempo real
├── login.html          # Login del panel admin
├── assets/             # Fuentes y recursos estáticos
├── js/
│   └── api.js          # Cliente fetch para reservas y newsletter
├── backend/
│   ├── server.js       # API REST (Express)
│   ├── package.json
│   ├── dev.ps1 / start.bat / start-mac.sh   # Scripts de arranque por SO
│   └── .env.example    # Variables de entorno requeridas
├── render.yaml         # Infraestructura como código para Render.com
└── README.md
```

---

## API

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/api/auth/login` | — | Login admin (rate limit: 20/15 min) |
| GET | `/api/auth/me` | JWT | Sesión actual |
| GET | `/api/admin/stats` | JWT | Estadísticas del panel |
| GET | `/api/admin/reservations` | JWT | Listar reservas |
| DELETE | `/api/admin/reservations/:id` | JWT | Eliminar reserva |
| GET | `/api/admin/newsletter` | JWT | Listar suscriptores |
| DELETE | `/api/admin/newsletter/:id` | JWT | Eliminar suscriptor |
| POST | `/api/admin/upload-image` | JWT | Subir imagen a Cloudinary (rate limit: 30/min) |
| POST | `/api/reservations` | — | Crear reserva (público) |
| POST | `/api/newsletter` | — | Suscribirse (público) |
| GET | `/health` | — | Health check |

---

## Variables de entorno

Copia `backend/.env.example` a `backend/.env` y completa los valores. **Nunca subas el `.env` real al repositorio.**

| Variable | Descripción |
|----------|-------------|
| `MONGODB_URI` | Cadena de conexión a MongoDB Atlas |
| `ADMIN_USER` / `ADMIN_PASS` | Credenciales del panel admin |
| `JWT_SECRET` | Secret largo y aleatorio para firmar tokens |
| `CLOUDINARY_*` | Credenciales de Cloudinary para subida de imágenes |
| `EMAIL_USER` / `EMAIL_PASS` | Cuenta Gmail + app password para notificaciones |
| `ADMIN_EMAIL` | Correo que r