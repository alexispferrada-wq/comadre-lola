// functions/api/admin/orders.js
export async function onRequestGet(context) {
  const { request, env } = context;
  try {
    if (!env.DB) {
      return new Response(JSON.stringify({ ok: true, data: [], total: 0 }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(request.url);
    const estado = url.searchParams.get('estado');
    const limit = parseInt(url.searchParams.get('limit') || '100');

    let result;
    if (estado && estado !== 'todos') {
      result = await env.DB.prepare('SELECT * FROM orders WHERE estado = ? ORDER BY created_at DESC LIMIT ?')
        .bind(estado, limit)
        .all();
    } else {
      result = await env.DB.prepare('SELECT * FROM orders ORDER BY created_at DESC LIMIT ?')
        .bind(limit)
        .all();
    }

    const data = (result.results || []).map(row => ({
      _id: row.id,
      mesa: row.mesa,
      cliente: row.cliente,
      items: typeof row.items === 'string' ? JSON.parse(row.items) : (row.items || []),
      total: row.total,
      nota: row.nota,
      estado: row.estado,
      garzon: row.garzon,
      createdAt: row.created_at,
    }));

    return new Response(JSON.stringify({ ok: true, data, total: data.length }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: err.message, data: [] }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
