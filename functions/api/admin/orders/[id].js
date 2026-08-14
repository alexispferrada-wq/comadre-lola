// functions/api/admin/orders/[id].js
export async function onRequestPatch(context) {
  const { request, params, env } = context;
  try {
    const id = params.id;
    const body = await request.json();
    const { estado } = body || {};

    if (env.DB) {
      await env.DB.prepare('UPDATE orders SET estado = ? WHERE id = ?')
        .bind(estado, id)
        .run();
    }

    return new Response(JSON.stringify({ ok: true, id, estado }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function onRequestDelete(context) {
  const { params, env } = context;
  try {
    const id = params.id;
    if (env.DB) {
      await env.DB.prepare('DELETE FROM orders WHERE id = ?').bind(id).run();
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
