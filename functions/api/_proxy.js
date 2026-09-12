// functions/api/_proxy.js — Cliente HTTP hacia el backend del VPS
// Reemplaza el acceso directo a D1/Neon: TODO el dato vive en la BD del VPS.
// LOLA_API_URL: URL del backend (configurable en Cloudflare Pages).
//   Producción limpia: https://api.lacomadrelola.cl
//   Temporal (sin DNS): http://148.113.179.225:3006
export function backendBase(env) {
  return (env && env.LOLA_API_URL) || 'https://api.lacomadrelola.cl';
}

export async function proxyFetch(path, options = {}, context = {}) {
  const { request, env } = context;
  const method = (options.method || request?.method || 'GET').toUpperCase();
  const headers = { 'Content-Type': 'application/json' };

  // Pasar la auth del admin (JWT) si viene en headers del request original
  const incomingAuth = request?.headers?.get('authorization');
  const incomingCookie = request?.headers?.get('cookie');
  if (incomingAuth) headers['authorization'] = incomingAuth;
  if (incomingCookie && incomingCookie.includes('token')) headers['cookie'] = incomingCookie;

  // Pasar credenciales del backend (protegidas con header secreto)
  const backendKey = env?.LOLA_API_KEY || '';
  if (backendKey) headers['x-lola-key'] = backendKey;

  let body = options.body;
  if (body && typeof body !== 'string') body = JSON.stringify(body);

  const resp = await fetch(`${backendBase(env)}${path}`, { method, headers, body });
  const text = await resp.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch (_) { json = { raw: text }; }

  return new Response(JSON.stringify(json || {}), {
    status: resp.status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-lola-key',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    },
  });
}