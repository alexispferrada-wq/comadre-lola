// functions/api/orders.js — Cloudflare Pages Function
export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const body = await request.json();
    const { mesa, cliente, items, total, nota, garzon } = body || {};

    if (!mesa || !items || !Array.isArray(items) || items.length === 0) {
      return new Response(JSON.stringify({ ok: false, error: 'Faltan datos de la comanda' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const totalCalculado = parseInt(total) || items.reduce((acc, it) => acc + ((it.precio || 0) * (it.cant || 1)), 0);

    if (env.DB) {
      const res = await env.DB.prepare(
        `INSERT INTO orders (mesa, cliente, items, total, nota, estado, garzon)
         VALUES (?, ?, ?, ?, ?, 'recibido', ?)`
      )
      .bind(mesa, cliente || 'Cliente', JSON.stringify(items), totalCalculado, nota || '', garzon || 'Garzón Express')
      .run();

      return new Response(JSON.stringify({
        ok: true,
        id: res.meta?.last_row_id || Date.now(),
        mesa,
        total: totalCalculado,
        message: 'Comanda registrada con éxito',
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ ok: true, total: totalCalculado }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
