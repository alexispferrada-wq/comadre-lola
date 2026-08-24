// functions/api/content.js — Cloudflare Pages Function
async function createTableClean(db) {
  try {
    await db.prepare("DROP TABLE IF EXISTS cms_content").run();
  } catch (e) {}
  await db.prepare(`
    CREATE TABLE cms_content (
      "key" TEXT PRIMARY KEY,
      "data" TEXT NOT NULL,
      "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
}

export async function onRequestGet(context) {
  const { env } = context;
  try {
    if (env.DB) {
      try {
        const row = await env.DB.prepare('SELECT "data" FROM cms_content WHERE "key" = ?').bind('site_content').first();
        if (row && row.data) {
          const parsed = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
          return new Response(JSON.stringify({ ok: true, data: parsed }), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          });
        }
      } catch (err) {
        await createTableClean(env.DB);
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

export async function onRequestPost(context) {
  return handleSaveContent(context);
}

export async function onRequestPut(context) {
  return handleSaveContent(context);
}

async function handleSaveContent(context) {
  const { request, env } = context;
  try {
    const body = await request.json();
    const dataToSave = body.data || body;

    if (env.DB) {
      try {
        await env.DB.prepare(`
          CREATE TABLE IF NOT EXISTS cms_content (
            "key" TEXT PRIMARY KEY,
            "data" TEXT NOT NULL,
            "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `).run();
      } catch (e) {}

      try {
        await env.DB.prepare(
          `INSERT INTO cms_content ("key", "data", "updated_at")
           VALUES ('site_content', ?, CURRENT_TIMESTAMP)
           ON CONFLICT("key") DO UPDATE SET "data" = excluded."data", "updated_at" = CURRENT_TIMESTAMP`
        )
        .bind(JSON.stringify(dataToSave))
        .run();
      } catch (err) {
        console.warn('Recreando tabla cms_content por incompatibilidad de esquema:', err.message);
        await createTableClean(env.DB);
        await env.DB.prepare(
          `INSERT INTO cms_content ("key", "data", "updated_at")
           VALUES ('site_content', ?, CURRENT_TIMESTAMP)
           ON CONFLICT("key") DO UPDATE SET "data" = excluded."data", "updated_at" = CURRENT_TIMESTAMP`
        )
        .bind(JSON.stringify(dataToSave))
        .run();
      }
    }

    return new Response(JSON.stringify({ ok: true, message: 'Contenido guardado y publicado con éxito' }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
}
