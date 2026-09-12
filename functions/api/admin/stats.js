// functions/api/admin/stats.js — Proxy al backend del VPS (BD unificada)
import { proxyFetch } from '../_proxy.js';

export async function onRequestGet(context) {
  return proxyFetch('/api/admin/stats', { method: 'GET' }, context);
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS' },
  });
}