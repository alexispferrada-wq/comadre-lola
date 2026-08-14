// functions/api/admin/reservations.js
export async function onRequestGet(context) {
  const { request, env } = context;
  try {
    if (!env.DB) {
      return new Response(JSON.stringify({ ok: true, data: [], total: 0 }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '200');

    const result = await env.DB.prepare('SELECT * FROM reservations ORDER BY created_at DESC LIMIT ?')
      .bind(limit)
      .all();

    const data = (result.results || []).map(row => ({
      _id: row.id,
      nombre: row.nombre,
      email: row.email,
      telefono: row.telefono,
      fecha: row.fecha,
      hora: row.hora,
      personas: row.personas,
      mensaje: row.mensaje,
      estado: row.estado || 'pendiente',
      createdAt: row.created_at,
    }));

    return new Response(JSON.stringify({
      ok: true,
      data,
      total: data.length,
    }), { headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: err.message, data: [] }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
