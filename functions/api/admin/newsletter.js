// functions/api/admin/newsletter.js
export async function onRequestGet(context) {
  const { env } = context;
  try {
    if (!env.DB) {
      return new Response(JSON.stringify({ ok: true, data: [] }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const result = await env.DB.prepare('SELECT * FROM newsletter ORDER BY created_at DESC LIMIT 200').all();
    const data = (result.results || []).map(row => ({
      _id: row.id,
      email: row.email,
      createdAt: row.created_at,
    }));

    return new Response(JSON.stringify({ ok: true, data }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: err.message, data: [] }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
