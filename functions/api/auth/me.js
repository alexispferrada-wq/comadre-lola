// functions/api/auth/me.js — Cloudflare Pages Function
export async function onRequestGet(context) {
  try {
    const { request } = context;
    const authHeader = request.headers.get('Authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '');

    if (!token) {
      return new Response(JSON.stringify({ ok: false, error: 'No autorizado' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    try {
      const decoded = JSON.parse(atob(token));
      if (decoded.exp && decoded.exp > Date.now()) {
        return new Response(JSON.stringify({
          ok: true,
          user: { usuario: decoded.usuario, role: decoded.role || 'admin' },
        }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }
    } catch {}

    return new Response(JSON.stringify({ ok: false, error: 'Token inválido o expirado' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
