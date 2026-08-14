require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express    = require('express');
const cors       = require('cors');
const { Pool }   = require('pg');
const nodemailer = require('nodemailer');
const path       = require('path');
const jwt        = require('jsonwebtoken');
const helmet     = require('helmet');
const rateLimit  = require('express-rate-limit');
const { v2: cloudinary } = require('cloudinary');

const app  = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_cambiar';
if (JWT_SECRET === 'dev_secret_cambiar' && process.env.NODE_ENV === 'production') {
  console.error('⛔ JWT_SECRET no configurado para producción. Deteniéndose.');
  process.exit(1);
}

/* ── CORS (debe ir PRIMERO para que OPTIONS preflight funcione) ── */
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'https://lacomadrelola.cl',
  'https://www.lacomadrelola.cl',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3001',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'null',
];
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('CORS no permitido: ' + origin));
  },
  credentials: true,
}));
app.use(express.json({ limit: '20mb' }));

/* ── SECURITY HEADERS ── */
app.use(helmet({ contentSecurityPolicy: false }));

/* ── RATE LIMITING ── */
const generalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200, standardHeaders: true, legacyHeaders: false });
const authLimiter    = rateLimit({ windowMs: 15 * 60 * 1000, max: 20,  standardHeaders: true, legacyHeaders: false, message: { error: 'Demasiados intentos. Intenta en 15 minutos.' } });
const uploadLimiter  = rateLimit({ windowMs: 60 * 1000,      max: 30,  standardHeaders: true, legacyHeaders: false });

// Solo aplicar límite general en producción para evitar bloqueos durante el desarrollo local
if (process.env.NODE_ENV === 'production') {
  app.use(generalLimiter);
}

/* ── STATIC FILES ── */
const staticDir = process.env.STATIC_DIR || path.join(__dirname, '..');
console.log('📁 Estaticos desde:', staticDir);
app.use(express.static(staticDir));

/* ── CLOUDINARY ── */
const CLOUDINARY_FOLDER = process.env.CLOUDINARY_FOLDER || 'lacomadrelola.cl';
const CLOUDINARY_CONFIGURED =
  Boolean(process.env.CLOUDINARY_CLOUD_NAME) &&
  Boolean(process.env.CLOUDINARY_API_KEY) &&
  Boolean(process.env.CLOUDINARY_API_SECRET);

if (CLOUDINARY_CONFIGURED) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
  console.log('🖼 Cloudinary configurado');
} else {
  console.log('⚠️  Cloudinary no configurado');
}

function sanitizeFolderPart(value, fallback) {
  return String(value || fallback)
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '') || fallback;
}

/* ── POSTGRESQL (Neon) ── */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function initDB() {
  try {
    const client = await pool.connect();
    console.log('✅ PostgreSQL (Neon) conectado');

    await client.query(`
      CREATE TABLE IF NOT EXISTS reservations (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        telefono VARCHAR(50),
        fecha VARCHAR(50) NOT NULL,
        hora VARCHAR(20) NOT NULL,
        personas INTEGER NOT NULL,
        mensaje TEXT,
        estado VARCHAR(20) DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'confirmada', 'cancelada')),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS newsletter (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS site_content (
        id SERIAL PRIMARY KEY,
        key VARCHAR(100) NOT NULL UNIQUE,
        data JSONB NOT NULL DEFAULT '{}',
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        mesa VARCHAR(50) NOT NULL,
        cliente VARCHAR(255),
        items JSONB NOT NULL DEFAULT '[]',
        total INTEGER NOT NULL DEFAULT 0,
        nota TEXT,
        estado VARCHAR(30) DEFAULT 'recibido',
        garzon VARCHAR(100),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✅ Tablas verificadas e inicializadas en PostgreSQL');
    client.release();
  } catch (err) {
    console.error('❌ PostgreSQL init error:', err.message);
  }
}
initDB();

/* ── MAILER (Soporte Gmail para 3+ correos receptores) ── */
let transporter = null;
if (process.env.EMAIL_USER && !process.env.EMAIL_USER.startsWith('PENDIENTE')) {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });
  console.log('📧 Mailer Gmail activo:', process.env.EMAIL_USER);
} else {
  console.log('⚠️  Email no configurado (falta EMAIL_USER / EMAIL_PASS)');
}

function getAdminEmails() {
  const raw = process.env.ADMIN_EMAIL || process.env.EMAIL_USER || '';
  const emails = raw.split(',').map(e => e.trim()).filter(Boolean);
  return emails.length ? emails : (process.env.EMAIL_USER ? [process.env.EMAIL_USER] : []);
}

async function sendMail(opts) {
  if (!transporter) return false;
  try {
    const info = await transporter.sendMail(opts);
    console.log('📧 Correo enviado con éxito:', opts.subject, '->', opts.to);
    return { ok: true, messageId: info.messageId };
  } catch (err) {
    console.error('❌ Email error:', err.message);
    return { ok: false, error: err.message };
  }
}

/* ── AUTH MIDDLEWARE ── */
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ ok: false, error: 'No autenticado' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ ok: false, error: 'Token invalido o expirado' });
  }
}

/* ══════════════════════════════════════════
   RUTAS PAGINAS LIMPIAS
══════════════════════════════════════════ */
app.get('/login',  (_req, res) => res.sendFile('login.html',      { root: staticDir }));
app.get('/admin',  (_req, res) => res.sendFile('admin.html',      { root: staticDir }));
app.get('/editor', (_req, res) => res.sendFile('editor_cms.html', { root: staticDir }));
app.get('/garzon', (_req, res) => res.sendFile('garzon.html',     { root: staticDir }));
app.get('/carta',  (_req, res) => res.sendFile('carta.html',      { root: staticDir }));
app.get('/guia',   (_req, res) => res.sendFile('guia.html',       { root: staticDir }));
app.get('/manual', (_req, res) => res.sendFile('guia.html',       { root: staticDir }));

/* ══════════════════════════════════════════
   API AUTH
══════════════════════════════════════════ */

/* POST /api/auth/login */
app.post('/api/auth/login', authLimiter, (req, res) => {
  const { usuario, password } = req.body;
  if (
    usuario  === (process.env.ADMIN_USER || 'admin') &&
    process.env.ADMIN_PASS && password === process.env.ADMIN_PASS
  ) {
    const token = jwt.sign({ usuario, role: 'admin' }, JWT_SECRET, { expiresIn: '8h' });
    return res.json({ ok: true, token, usuario });
  }
  res.status(401).json({ ok: false, error: 'Usuario o contrasena incorrectos' });
});

/* GET /api/auth/me */
app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({ ok: true, user: req.user });
});

/* ══════════════════════════════════════════
   API ADMIN (protegidas)
══════════════════════════════════════════ */

/* GET /api/admin/stats */
app.get('/api/admin/stats', requireAuth, async (_req, res) => {
  try {
    const [totalRes, pendRes, nlRes, totalOrd, pendOrd] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM reservations'),
      pool.query("SELECT COUNT(*) FROM reservations WHERE estado = 'pendiente'"),
      pool.query('SELECT COUNT(*) FROM newsletter'),
      pool.query('SELECT COUNT(*) FROM orders'),
      pool.query("SELECT COUNT(*) FROM orders WHERE estado = 'recibido' OR estado = 'en_cocina'"),
    ]);
    res.json({
      ok: true,
      totalReservas: parseInt(totalRes.rows[0].count),
      pendientes: parseInt(pendRes.rows[0].count),
      newsletter: parseInt(nlRes.rows[0].count),
      totalOrders: parseInt(totalOrd.rows[0].count),
      ordersPendientes: parseInt(pendOrd.rows[0].count),
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/* GET /api/admin/reservations */
app.get('/api/admin/reservations', requireAuth, async (req, res) => {
  try {
    const page  = parseInt(req.query.page  || '1');
    const limit = parseInt(req.query.limit || '20');
    const offset = (page - 1) * limit;

    const [docsRes, countRes] = await Promise.all([
      pool.query(
        'SELECT * FROM reservations ORDER BY created_at DESC LIMIT $1 OFFSET $2',
        [limit, offset]
      ),
      pool.query('SELECT COUNT(*) FROM reservations'),
    ]);

    const total = parseInt(countRes.rows[0].count);

    const data = docsRes.rows.map(row => ({
      _id: row.id,
      nombre: row.nombre,
      email: row.email,
      telefono: row.telefono,
      fecha: row.fecha,
      hora: row.hora,
      personas: row.personas,
      mensaje: row.mensaje,
      estado: row.estado,
      createdAt: row.created_at,
    }));

    res.json({ ok: true, data, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/* PATCH /api/admin/reservations/:id */
app.patch('/api/admin/reservations/:id', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'UPDATE reservations SET estado = $1 WHERE id = $2 RETURNING *',
      [req.body.estado, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ ok: false, error: 'Reserva no encontrada' });
    }
    const row = result.rows[0];
    res.json({
      ok: true,
      data: {
        _id: row.id,
        nombre: row.nombre,
        email: row.email,
        telefono: row.telefono,
        fecha: row.fecha,
        hora: row.hora,
        personas: row.personas,
        mensaje: row.mensaje,
        estado: row.estado,
        createdAt: row.created_at,
      },
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/* DELETE /api/admin/reservations/:id */
app.delete('/api/admin/reservations/:id', requireAuth, async (req, res) => {
  try {
    await pool.query('DELETE FROM reservations WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/* ══════════════════════════════════════════
   API PEDIDOS / COMANDAS ADMIN
══════════════════════════════════════════ */

/* GET /api/admin/orders */
app.get('/api/admin/orders', requireAuth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit || '50');
    const estado = req.query.estado;
    let query = 'SELECT * FROM orders';
    const params = [];
    if (estado && estado !== 'todos') {
      query += ' WHERE estado = $1';
      params.push(estado);
      query += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1);
      params.push(limit);
    } else {
      query += ' ORDER BY created_at DESC LIMIT $1';
      params.push(limit);
    }

    const result = await pool.query(query, params);
    const data = result.rows.map(row => ({
      _id: row.id,
      mesa: row.mesa,
      cliente: row.cliente,
      items: typeof row.items === 'string' ? JSON.parse(row.items) : row.items,
      total: row.total,
      nota: row.nota,
      estado: row.estado,
      garzon: row.garzon,
      createdAt: row.created_at,
    }));
    res.json({ ok: true, data });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/* PATCH /api/admin/orders/:id */
app.patch('/api/admin/orders/:id', requireAuth, async (req, res) => {
  try {
    const { estado } = req.body;
    const result = await pool.query(
      'UPDATE orders SET estado = $1 WHERE id = $2 RETURNING *',
      [estado, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ ok: false, error: 'Pedido no encontrado' });
    }
    const row = result.rows[0];
    res.json({
      ok: true,
      data: {
        _id: row.id,
        mesa: row.mesa,
        cliente: row.cliente,
        items: typeof row.items === 'string' ? JSON.parse(row.items) : row.items,
        total: row.total,
        nota: row.nota,
        estado: row.estado,
        garzon: row.garzon,
        createdAt: row.created_at,
      },
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/* DELETE /api/admin/orders/:id */
app.delete('/api/admin/orders/:id', requireAuth, async (req, res) => {
  try {
    await pool.query('DELETE FROM orders WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/* POST /api/admin/test-email */
app.post('/api/admin/test-email', requireAuth, async (_req, res) => {
  try {
    const adminEmails = getAdminEmails();
    if (!adminEmails.length) {
      return res.status(400).json({ ok: false, error: 'No hay correos administradores configurados (ADMIN_EMAIL o EMAIL_USER vacío).' });
    }
    if (!transporter) {
      return res.status(400).json({ ok: false, error: 'Servicio de email no configurado. Verifica EMAIL_USER y EMAIL_PASS.' });
    }

    const testDestinations = adminEmails.join(', ');
    const result = await sendMail({
      from: `"La Comadre Lola" <${process.env.EMAIL_USER}>`,
      to: testDestinations,
      subject: '🌹 Prueba de Correo Exitosa — La Comadre Lola',
      html: `
        <div style="font-family: Arial, sans-serif; background:#0d0d12; color:#f0f0f0; padding:24px; border-radius:12px; border:1px solid #E8913A;">
          <h2 style="color:#E8913A; margin-top:0;">🌹 ¡Prueba de Configuración Gmail Exitosa!</h2>
          <p>Este es un correo de prueba enviado desde el servidor de <b>La Comadre Lola</b>.</p>
          <hr style="border-color:#333; margin:16px 0;">
          <p><b>Remitente (EMAIL_USER):</b> ${process.env.EMAIL_USER}</p>
          <p><b>Destinatarios Administradores:</b> ${testDestinations}</p>
          <p><b>Fecha y hora:</b> ${new Date().toLocaleString('es-CL')}</p>
          <p style="color:#4ECDC4;">✅ Tu servidor está listo para recibir reservas y avisos en todos tus correos Gmail configurados.</p>
        </div>
      `,
    });

    if (result && result.ok) {
      res.json({ ok: true, message: `Correo de prueba enviado correctamente a: ${testDestinations}` });
    } else {
      res.status(500).json({ ok: false, error: result ? result.error : 'Error al enviar correo' });
    }
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/* GET /api/admin/newsletter */
app.get('/api/admin/newsletter', requireAuth, async (_req, res) => {
  try {
    const result = await pool.query('SELECT * FROM newsletter ORDER BY created_at DESC');
    const data = result.rows.map(row => ({
      _id: row.id,
      email: row.email,
      createdAt: row.created_at,
    }));
    res.json({ ok: true, data });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/* POST /api/admin/upload-image */
app.post('/api/admin/upload-image', requireAuth, uploadLimiter, async (req, res) => {
  if (!CLOUDINARY_CONFIGURED) {
    try {
      const { dataUrl, target } = req.body || {};
      if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) {
        return res.status(400).json({ ok: false, error: 'Imagen en formato base64 requerida (desarrollo local)' });
      }

      const matches = dataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) {
        return res.status(400).json({ ok: false, error: 'Formato de base64 inválido' });
      }

      const ext = matches[1].split('/')[1] || 'png';
      const buffer = Buffer.from(matches[2], 'base64');

      const uploadsDir = path.join(staticDir, 'assets', 'uploads');
      const fs = require('fs');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const fileName = `upload_${Date.now()}_${Math.floor(Math.random() * 1000)}.${ext}`;
      const filePath = path.join(uploadsDir, fileName);
      fs.writeFileSync(filePath, buffer);

      console.log(`💾 Imagen guardada localmente en desarrollo: assets/uploads/${fileName}`);
      return res.json({
        ok: true,
        url: `/assets/uploads/${fileName}`,
      });
    } catch (err) {
      console.error('Local upload error:', err.message);
      return res.status(500).json({ ok: false, error: 'Error al guardar la imagen localmente', detail: err.message });
    }
  }

  try {
    const { dataUrl, imageUrl, target } = req.body || {};
    const source = dataUrl || imageUrl;

    if (!source || typeof source !== 'string') {
      return res.status(400).json({ ok: false, error: 'Imagen requerida' });
    }

    if (dataUrl && !dataUrl.startsWith('data:image/')) {
      return res.status(400).json({ ok: false, error: 'Formato de imagen inválido' });
    }

    const subFolder = sanitizeFolderPart(target, 'general');
    const folder = `${CLOUDINARY_FOLDER}/${subFolder}`;

    const uploaded = await cloudinary.uploader.upload(source, {
      resource_type: 'image',
      folder,
      overwrite: false,
      unique_filename: true,
      transformation: [{ quality: 'auto', fetch_format: 'auto' }],
      tags: ['lacomadrelola', subFolder],
    });

    return res.json({
      ok: true,
      url: uploaded.secure_url,
      publicId: uploaded.public_id,
      width: uploaded.width,
      height: uploaded.height,
      bytes: uploaded.bytes,
      format: uploaded.format,
    });
  } catch (err) {
    console.error('Cloudinary upload error:', err.message);
    return res.status(500).json({
      ok: false,
      error: 'No se pudo subir la imagen a Cloudinary',
      detail: err.message,
    });
  }
});

/* DELETE /api/admin/newsletter/:id */
app.delete('/api/admin/newsletter/:id', requireAuth, async (req, res) => {
  try {
    await pool.query('DELETE FROM newsletter WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/* ══════════════════════════════════════════
   API CONTENIDO CMS
══════════════════════════════════════════ */

/* PUT /api/admin/content — Publicar contenido en vivo */
app.put('/api/admin/content', requireAuth, async (req, res) => {
  try {
    const { data } = req.body;
    if (!data || typeof data !== 'object') {
      return res.status(400).json({ ok: false, error: 'Datos inválidos' });
    }
    await pool.query(
      `INSERT INTO site_content (key, data, updated_at)
       VALUES ('live', $1, NOW())
       ON CONFLICT (key) DO UPDATE SET data = $1, updated_at = NOW()`,
      [JSON.stringify(data)]
    );
    res.json({ ok: true, message: 'Contenido publicado en vivo' });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/* GET /api/content — Contenido público (lo consume el index.html) */
app.get('/api/content', async (_req, res) => {
  try {
    const result = await pool.query("SELECT data, updated_at FROM site_content WHERE key = 'live'");
    if (result.rows.length === 0) {
      return res.json({ ok: true, data: null });
    }
    res.json({ ok: true, data: result.rows[0].data, updatedAt: result.rows[0].updated_at });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/* ══════════════════════════════════════════
   API PUBLICA
══════════════════════════════════════════ */

app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date() }));

/* POST /api/reservations */
app.post('/api/reservations', async (req, res) => {
  try {
    const { nombre, email, telefono, fecha, hora, personas, mensaje } = req.body;
    if (!nombre || !email || !fecha || !hora || !personas)
      return res.status(400).json({ ok: false, error: 'Faltan campos obligatorios' });

    const result = await pool.query(
      `INSERT INTO reservations (nombre, email, telefono, fecha, hora, personas, mensaje)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [nombre, email, telefono, fecha, hora, personas, mensaje]
    );

    const adminRecipients = getAdminEmails();
    if (adminRecipients.length > 0) {
      await sendMail({
        from: `"La Comadre Lola Reservas" <${process.env.EMAIL_USER}>`,
        to: adminRecipients.join(', '),
        subject: `🌹 Nueva reserva de ${nombre} (${personas} pers) — La Comadre Lola`,
        html: `
          <div style="font-family: Arial, sans-serif; background:#0d0d12; color:#f0f0f0; padding:24px; border-radius:12px; border:1px solid #E8913A;">
            <h2 style="color:#E8913A; margin-top:0;">🌹 Nueva Reserva Recibida</h2>
            <p><b>Nombre:</b> ${nombre}</p>
            <p><b>Email:</b> <a href="mailto:${email}" style="color:#4ECDC4;">${email}</a></p>
            <p><b>Teléfono:</b> ${telefono || 'No indicado'}</p>
            <p><b>Fecha y Hora:</b> ${fecha} a las ${hora} hrs</p>
            <p><b>Personas:</b> ${personas} comensales</p>
            <p><b>Mensaje / Solicitud:</b> ${mensaje || 'Sin mensaje'}</p>
            <hr style="border-color:#333; margin:16px 0;">
            <p style="font-size:12px; color:#8a8aa0;">Gestiona esta reserva desde el <a href="${process.env.FRONTEND_URL || ''}/admin" style="color:#E8913A;">Panel Admin</a>.</p>
          </div>
        `,
      });
    }

    // Confirmación al cliente
    await sendMail({
      from: `"La Comadre Lola" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: '🌹 Reserva Recibida — La Comadre Lola (Quilicura)',
      html: `
        <div style="font-family: Arial, sans-serif; background:#0d0d12; color:#f0f0f0; padding:24px; border-radius:12px; border:1px solid #E8913A;">
          <h2 style="color:#E8913A; margin-top:0;">¡Tu reserva está registrada, ${nombre}! 🌹</h2>
          <p>Hemos recibido tu solicitud para el <b>${fecha} a las ${hora} hrs</b> para <b>${personas} persona(s)</b>.</p>
          <p>Te esperamos para disfrutar la mejor gastronomía, coctelería y el mejor carrete de Quilicura.</p>
          <div style="background:rgba(255,255,255,0.05); padding:14px; border-radius:8px; margin:16px 0;">
            <p style="margin:0 0 6px 0;">📍 <b>Dirección:</b> Manuel Antonio Matta 1269, Quilicura</p>
            <p style="margin:0 0 6px 0;">Ⓜ️ A pasos del Metro Lo Cruzat (Línea 3)</p>
            <p style="margin:0;">🚗 Estacionamiento externo (#1351)</p>
          </div>
          <p style="font-size:12px; color:#8a8aa0;">Si necesitas modificar o cancelar tu reserva, escríbenos a nuestro Instagram <a href="https://instagram.com/lacomadrelola__" style="color:#D4547B;">@lacomadrelola__</a>.</p>
        </div>
      `,
    });

    res.json({ ok: true, id: result.rows[0].id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'Error interno' });
  }
});

/* POST /api/orders — Registrar pedido de comanda (desde garzón o cliente) */
app.post('/api/orders', async (req, res) => {
  try {
    const { mesa, cliente, items, total, nota, garzon } = req.body;
    if (!mesa || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ ok: false, error: 'Faltan datos de la mesa o items del pedido' });
    }

    const totalCalculado = parseInt(total) || items.reduce((acc, it) => acc + ((it.precio || 0) * (it.cant || 1)), 0);

    const result = await pool.query(
      `INSERT INTO orders (mesa, cliente, items, total, nota, estado, garzon)
       VALUES ($1, $2, $3, $4, $5, 'recibido', $6)
       RETURNING id, created_at`,
      [mesa, cliente || 'Cliente', JSON.stringify(items), totalCalculado, nota || '', garzon || 'Garzón Express']
    );

    const orderId = result.rows[0].id;
    console.log(`🛎️ Nueva comanda recibida — ID #${orderId}, Mesa ${mesa}, Total: $${totalCalculado}`);

    res.json({
      ok: true,
      id: orderId,
      mesa,
      total: totalCalculado,
      createdAt: result.rows[0].created_at,
      message: 'Comanda registrada con éxito',
    });
  } catch (err) {
    console.error('Error al registrar pedido:', err);
    res.status(500).json({ ok: false, error: 'Error interno al guardar pedido' });
  }
});

/* POST /api/newsletter */
app.post('/api/newsletter', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ ok: false, error: 'Email requerido' });
    await pool.query(
      'INSERT INTO newsletter (email) VALUES ($1) ON CONFLICT (email) DO NOTHING',
      [email]
    );
    res.json({ ok: true, msg: '¡Te has suscrito con éxito!' });
  } catch (err) {
    res.status(500).json({ ok: false, error: 'Error interno' });
  }
});

/* ── START ── */
app.listen(PORT, () => {
  console.log(`🚀 Servidor La Comadre Lola en http://localhost:${PORT}`);
  console.log(`   / (Sitio)  /login  /admin  /editor  /garzon`);
});