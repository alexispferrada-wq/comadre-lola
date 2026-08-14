// functions/api/newsletter.js — Cloudflare Pages Function
export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const body = await request.json();
    const { email } = body || {};

    if (!email) {
      return new Response(JSON.stringify({ ok: false, error: 'Email requerido' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (env.DB) {
      await env.DB.prepare('INSERT OR IGNORE INTO newsletter (email) VALUES (?)').bind(email).run();
    }

    return new Response(JSON.stringify({ ok: true, msg: '¡Te has suscrito con éxito!' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
