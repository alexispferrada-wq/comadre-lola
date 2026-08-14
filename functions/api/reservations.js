// functions/api/reservations.js — Cloudflare Pages Function
export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const body = await request.json();
    const { nombre, email, telefono, fecha, hora, personas, mensaje } = body || {};

    if (!nombre || !email || !telefono || !fecha || !hora || !personas) {
      return new Response(JSON.stringify({ ok: false, error: 'Faltan campos obligatorios' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (env.DB) {
      const res = await env.DB.prepare(
        `INSERT INTO reservations (nombre, email, telefono, fecha, hora, personas, mensaje, estado)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'pendiente')`
      )
      .bind(nombre, email, telefono, fecha, hora, personas, mensaje || '')
      .run();

      return new Response(JSON.stringify({
        ok: true,
        id: res.meta?.last_row_id || Date.now(),
        message: 'Reserva creada con éxito',
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ ok: true, message: 'Reserva procesada' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
