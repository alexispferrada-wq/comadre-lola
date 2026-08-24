// functions/api/admin/content.js — Cloudflare Pages Function
async function ensureCmsTable(db) {
  if (!db) return;
  try {
    const info = await db.prepare("PRAGMA table_info(cms_content)").all();
    const cols = (info && info.results ? info.results : []).map(c => c.name);

    if (!cols || cols.length === 0) {
      await db.prepare(`
        CREATE TABLE IF NOT EXISTS cms_content (
          "key" TEXT PRIMARY KEY,
          "data" TEXT NOT NULL,
          "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `).run();
    } else if (!cols.includes('key')) {
      // Recrear si la tabla previa fue creada con esquema incompatible
      await db.prepare("DROP TABLE IF EXISTS cms_content").run();
      await db.prepare(`
        CREATE TABLE cms_content (
          "key" TEXT PRIMARY KEY,
          "data" TEXT NOT NULL,
          "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `).run();
    }
  } catch (e) {
    console.error('ensureCmsTable error:', e);
    try {
      await db.prepare("DROP TABLE IF EXISTS cms_content").run();
      await db.prepare(`
        CREATE TABLE cms_content (
          "key" TEXT PRIMARY KEY,
          "data" TEXT NOT NULL,
          "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `).run();
    } catch (e2) {
      console.error('Forced table creation error:', e2);
    }
  }
}

export async function onRequestPut(context) {
  return handleSaveAdminContent(context);
}

export async function onRequestPost(context) {
  return handleSaveAdminContent(context);
}

async function handleSaveAdminContent(context) {
  const { request, env } = context;
  try {
    const body = await request.json();
    const dataToSave = body.data || body;

    if (env.DB) {
      await ensureCmsTable(env.DB);
      await env.DB.prepare(
        `INSERT INTO cms_content ("key", "data", "updated_at")
         VALUES ('site_content', ?, CURRENT_TIMESTAMP)
         ON CONFLICT("key") DO UPDATE SET "data" = excluded."data", "updated_at" = CURRENT_TIMESTAMP`
      )
      .bind(JSON.stringify(dataToSave))
      .run();
    }

    return new Response(JSON.stringify({ ok: true, message: 'Publicado con éxito' }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
}

export async function onRequestGet(context) {
  const { env } = context;
  try {
    if (env.DB) {
      await ensureCmsTable(env.DB);
      const row = await env.DB.prepare('SELECT "data" FROM cms_content WHERE "key" = ?').bind('site_content').first();
      if (row && row.data) {
        const parsed = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
        return new Response(JSON.stringify({ ok: true, data: parsed }), {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }
    }
    return new Response(JSON.stringify({ ok: true, data: {} }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
}
