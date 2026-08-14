// functions/api/admin/stats.js
export async function onRequestGet(context) {
  const { env } = context;
  try {
    if (!env.DB) {
      return new Response(JSON.stringify({
        ok: true,
        totalReservas: 0,
        pendientes: 0,
        newsletter: 0,
        totalOrders: 0,
        ordersPendientes: 0,
      }), { headers: { 'Content-Type': 'application/json' } });
    }

    const [totalRes, pendRes, nlRes, totalOrd, pendOrd] = await Promise.all([
      env.DB.prepare('SELECT COUNT(*) as count FROM reservations').first(),
      env.DB.prepare("SELECT COUNT(*) as count FROM reservations WHERE estado = 'pendiente'").first(),
      env.DB.prepare('SELECT COUNT(*) as count FROM newsletter').first(),
      env.DB.prepare('SELECT COUNT(*) as count FROM orders').first(),
      env.DB.prepare("SELECT COUNT(*) as count FROM orders WHERE estado = 'recibido' OR estado = 'en_cocina'").first(),
    ]);

    return new Response(JSON.stringify({
      ok: true,
      totalReservas: totalRes?.count || 0,
      pendientes: pendRes?.count || 0,
      newsletter: nlRes?.count || 0,
      totalOrders: totalOrd?.count || 0,
      ordersPendientes: pendOrd?.count || 0,
    }), { headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({
      ok: true,
      totalReservas: 0,
      pendientes: 0,
      newsletter: 0,
      totalOrders: 0,
      ordersPendientes: 0,
      error: err.message,
    }), { headers: { 'Content-Type': 'application/json' } });
  }
}
