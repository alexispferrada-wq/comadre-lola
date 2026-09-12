// functions/api/reservations.js — Proxy al backend del VPS (BD unificada)
import { proxyFetch } from './_proxy.js';

export async function onRequestPost(context) {
  const { request } = context;
  const body = await request.json().catch(() => ({}));
  return proxyFetch('/api/reservations', { method: 'POST', body }, context);
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
    },
  });
}