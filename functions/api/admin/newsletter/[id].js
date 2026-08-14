// functions/api/admin/newsletter/[id].js
export async function onRequestDelete(context) {
  const { params, env } = context;
  try {
    const id = params.id;
    if (env.DB) {
      await env.DB.prepare('DELETE FROM newsletter WHERE id = ?').bind(id).run();
    }
    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
