# 🌹 La Comadre Lola — Guía Completa de Configuración y Deploy

---

## 🚀 1. Flujo de Carta Digital & Pedido Express QR

El sistema cuenta con un flujo moderno para el cliente en mesa y el garzón:

### 📱 Flujo del Cliente en la Mesa:
1. **Escaneo de Mesa**: El cliente escanea el código QR físico de su mesa (ej: `https://lacomadrelola.cl/carta?mesa=4` o `https://lacomadrelola.cl/carta`).
2. **Modal de Bienvenida**:
   - 📖 **Explorar la Carta**: Visualiza la carta digital con fotos, categorías, precios e ingredientes.
   - ⚡ **Hacer Pedido de Inmediato**: Abre directo el selector para armar la comanda express.
3. **Persistencia en el Teléfono**: Los platos, tragos, mesa y observaciones se guardan en el `localStorage` del celular (no se pierden al recargar o cerrar el navegador).
4. **Generación de QR de Comanda**: Al dar clic en **"Generar Código QR de Pedido"**, se genera en pantalla un código QR nítido con el pedido completo.

### 🧑‍🍳 Flujo del Garzón (`/garzon`):
1. **Acceso**: El garzón entra a `https://lacomadrelola.cl/garzon` desde su teléfono.
2. **Escaneo QR**: Activa la cámara y escanea el QR que le muestra el cliente en su pantalla.
3. **Lectura Instantánea**: El celular del garzón vibra y muestra en pantalla:
   - **Mesa #**, hora, desglose de platos/tragos, subtotales, total y notas especiales (*"sin hielo"*, *"término medio"*).
4. **Acciones Rápidas**:
   - 🟢 **Confirmar e Ingresar a Cocina/Barra**: Registra la comanda en la base de datos y en el panel Admin.
   - 💬 **Enviar Comanda a WhatsApp de Cocina**: Genera un mensaje de WhatsApp formateado con 1 clic para despachar la orden al grupo de cocina o barra.

---

## 📧 2. Configuración de los 3 Correos Gmail (Paso a Paso)

Para que Gmail permita que el servidor envíe correos automáticamente y los 3 correos de administración reciban las reservas y alertas:

### Paso A: Generar "Contraseña de Aplicación" en Gmail (App Password)
1. Entra a tu cuenta de Google del correo remitente (ej: `contacto.lacomadrelola@gmail.com`).
2. Ve a **Seguridad** → Activa la **Verificación en 2 pasos** (si no la tienes activada).
3. En la barra de búsqueda de tu cuenta de Google escribe: **"Contraseñas de aplicaciones"** (o entra a `https://myaccount.google.com/apppasswords`).
4. En nombre de app escribe: `Comadre Lola Servidor` y dale a **Crear**.
5. Google te entregará una contraseña de **16 letras amarillas** (ejemplo: `abcd efgh ijkl mnop`). **Copia esa clave sin espacios**.

### Paso B: Configurar las 3 direcciones de correo en Render / `.env`
En tus variables de entorno configura:

```env
# Correo remitente autenticado con la App Password
EMAIL_USER=tu_correo_emisor@gmail.com
EMAIL_PASS=abcdefghijklmnop

# Lista con los 3 correos donde deben llegar las reservas y notificaciones (separados por coma)
ADMIN_EMAIL=correo1@gmail.com, correo2@gmail.com, correo3@gmail.com
```

### Paso C: Probar la conexión directamente
1. Entra a tu panel de administración en `/admin`.
2. Haz clic en el botón superior **"✉️ Probar Gmail"**.
3. El sistema enviará un correo de verificación simultáneo a los 3 correos configurados.

---

## 🛠️ 3. Rutas y Paneles Disponibles

| Ruta | Descripción | Acceso |
|------|-------------|--------|
| `/` | Sitio web oficial (Hero, Eventos, Galería, Reservas) | Público |
| `/carta` | Carta Digital completa + Pedido Express QR para mesas | Clientes en mesa / QR |
| `/garzon` | App de escáner QR y recepción de comandas para garzones | Personal del local |
| `/admin` | Panel de control de Reservas, Comandas en vivo y Newsletter | Protegido con login |
| `/editor` | Editor Live CMS (Platos, Tragos, Precios, Eventos, Galería, Colores) | Protegido con login |

---

## 🔐 4. Credenciales de Acceso Admin y CMS
- **Usuario:** `admin` (o el definido en `ADMIN_USER`)
- **Contraseña:** la definida en `ADMIN_PASS` del archivo `.env` o en Render.
