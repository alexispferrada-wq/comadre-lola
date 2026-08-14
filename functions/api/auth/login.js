// functions/api/auth/login.js — Cloudflare Pages Function
export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const body = await request.json();
    const { usuario, password } = body || {};

    const expectedUser = env.ADMIN_USER || 'admin';
    const expectedPass = env.ADMIN_PASS || 'Lola2026!';

    if (usuario === expectedUser && password === expectedPass) {
      // Token simple firmado o representativo para la sesión
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
