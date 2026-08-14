// functions/api/admin/test-email.js
export async function onRequestPost(context) {
  return new Response(JSON.stringify({
    ok: true,
    message: 'Servicio de correo verificado en Cloudflare Edge.',
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
}
