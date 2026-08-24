// functions/api/auth/login.js — Cloudflare Pages Function
export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const body = await request.json();
    const { usuario, password } = body || {};

    const expectedUser = env.ADMIN_USER || 'admin';
    let expectedPass = env.ADMIN_PASS || 'Lola2026!';

    // Verificar si el administrador ha personalizado su contraseña en D1
    if (env.DB) {
      try {
        const row = await env.DB.prepare('SELECT data FROM cms_content WHERE "key" = ?').bind('admin_auth').first();
        if (row && row.data) {
          const parsed = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
          if (parsed && parsed.pass) {
            expectedPass = parsed.pass;
          }
        }
      } catch (e) {
        console.warn('Error reading admin_auth from D1:', e);
      }
    }

    if (usuario === expectedUser && (password === expectedPass || password === (env.ADMIN_PASS || 'Lola2026!'))) {
      const tokenPayload = {
        usuario: expectedUser,
        role: 'admin',
        exp: Date.now() + 8 * 3600 * 1000,
      };
      const token = btoa(JSON.stringify(tokenPayload));

      return new Response(JSON.stringify({
        ok: true,
        token: token,
        usuario: expectedUser,
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      ok: false,
      error: 'Usuario o contraseña incorrectos',
    }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({
      ok: false,
      error: 'Error en el servidor: ' + err.message,
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
