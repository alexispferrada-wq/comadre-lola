// functions/api/auth/me.js — Proxy al backend del VPS (JWT unificado)
import { proxyFetch } from '../_proxy.js';

export async function onRequestGet(context) {
  return proxyFetch('/api/auth/me', { method: 'GET' }, context);
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}