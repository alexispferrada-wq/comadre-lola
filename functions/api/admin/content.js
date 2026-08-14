// functions/api/admin/content.js — Cloudflare Pages Function
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
      await env.DB.prepare(
        `INSERT INTO cms_content (key, data, updated_at)
         VALUES ('site_content', ?, CURRENT_TIMESTAMP)
         ON CONFLICT(key) DO UPDATE SET data = excluded.data, updated_at = CURRENT_TIMESTAMP`
      )
      .bind(JSON.stringify(dataToSave))
      .run();
    }

    return new Response(JSON.stringify({ ok: true, message: 'Publicado con éxito' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function onRequestGet(context) {
  const { env } = context;
  try {
    if (env.DB) {
      const row = await env.DB.prepare("SELECT data FROM cms_content WHERE key = 'site_content'").first();
      if (row && row.data) {
        const parsed = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
        return new Response(JSON.stringify({ ok: true, data: parsed }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }
    return new Response(JSON.stringify({ ok: true, data: {} }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
