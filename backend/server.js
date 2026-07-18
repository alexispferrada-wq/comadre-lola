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

/* ── CORS ── */
const allowedOrigins = [
  process.env.FRONTEND_URL,
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

pool.connect()
  .then(client => {
    console.log('✅ PostgreSQL (Neon) conectado');
    client.release();
  })
  .catch(err => console.error('❌ PostgreSQL error:', err.message));

/* ── MAILER ── */
let transporter = null;
if (process.env.EMAIL_USER && !process.env.EMAIL_USER.startsWith('PENDIENTE')) {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });
  console.log('📧 Mailer:', process.env.EMAIL_USER);
} else {
  console.log('⚠️  Email no configurado');
}

async function sendMail(opts) {
  if (!transporter) return;
  try { await transporter.sendMail(opts); }
  catch (err) { console.error('Email error:', err.message); }
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
    const [totalRes, pendRes, nlRes] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM reservations'),
      pool.query("SELECT COUNT(*) FROM reservations WHERE estado = 'pendiente'"),
      pool.query('SELECT COUNT(*) FROM newsletter'),
    ]);
    res.json({
      ok: true,
      totalReservas: parseInt(totalRes.rows[0].count),
      pendientes: parseInt(pendRes.rows[0].count),
      newsletter: parseInt(nlRes.rows[0].count),
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

    // Mapear campos para compatibilidad con frontend (id → _id, created_at → createdAt)
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

      // Convertir base64 a archivo local
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

    await sendMail({
      from: process.env.EMAIL_USER,
      to:   process.env.ADMIN_EMAIL || process.env.EMAIL_USER,
      subject: `🌹 Nueva reserva — ${nombre}`,
      html: `<h2>Nueva reserva</h2>
        <p><b>Nombre:</b> ${nombre}<br><b>Email:</b> ${email}<br>
        <b>Telefono:</b> ${telefono || '-'}<br><b>Fecha:</b> ${fecha} ${hora}<br>
        <b>Personas:</b> ${personas}<br><b>Mensaje:</b> ${mensaje || '-'}</p>`,
    });

    await sendMail({
      from:    process.env.EMAIL_USER,
      to:      email,
      subject: '🌹 Reserva confirmada — La Comadre Lola',
      html: `<h2>Tu reserva esta lista, ${nombre}!</h2>
        <p>Nos vemos el <b>${fecha} a las ${hora}</b> con <b>${personas} persona(s)</b>.</p>
        <p>📍 Manuel Antonio Matta 1269, Quilicura</p>`,
    });

    res.json({ ok: true, id: result.rows[0].id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'Error interno' });
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
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: 'Error interno' });
  }
});

/* ── START ── */
app.listen(PORT, () => {
  console.log(`🚀 http://localhost:${PORT}`);
  console.log(`   /login  /admin  /editor`);
});