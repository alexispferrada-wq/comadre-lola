# 🌹 La Comadre Lola — Instrucciones de Deploy

## ⚡ Archivos NUEVOS en esta versión
- `editor_cms.html` — Editor live con login (login con credenciales del .env)
- `render.yaml` — Configuración automática de Render
- `js/api.js` — Actualizado con URL de Render
- `backend/.env.example` — Con datos de MongoDB ya cargados

## 📋 Pasos para subir a GitHub

### 1. Subir todo el contenido de esta carpeta a tu repo
Si usas GitHub en el browser:
- Entra a github.com/alexispferrada-wq/lacomadrelolaCL
- Arrastra los archivos o usa "Add file → Upload files"

### 2. Render — Completar antes de hacer deploy
Abre `render.yaml` y reemplaza las 4 líneas PENDIENTE_:
```
EMAIL_USER:   tu correo Gmail
EMAIL_PASS:   App Password de 16 chars
ADMIN_EMAIL:  correo donde recibes reservas
ADMIN_PASS:   contraseña del panel admin
```

### 3. Render — Conectar repo
- render.com → New + → Blueprint
- Selecciona el repo lacomadrelolaCL
- Render lee el render.yaml automáticamente ✅

## ✅ Checklist de variables
| Variable       | Estado         |
|----------------|----------------|
| MONGODB_URI    | ✅ Lista        |
| NODE_ENV       | ✅ production   |
| PORT           | ✅ 3001         |
| FRONTEND_URL   | ✅ Lista        |
| ADMIN_USER     | ✅ admin        |
| EMAIL_USER     | ⚠️ Pendiente   |
| EMAIL_PASS     | ⚠️ Pendiente   |
| ADMIN_EMAIL    | ⚠️ Pendiente   |
| ADMIN_PASS     | ⚠️ Pendiente   |

## 🔐 Editor CMS
Abrir `editor_cms.html` en el browser:
- Usuario: `admin`
- Contraseña: la definida en `ADMIN_PASS` del `.env`
