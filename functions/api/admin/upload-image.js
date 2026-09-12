// functions/api/admin/upload-image.js — Proxy al backend del VPS (imgproxy)
import { proxyFetch } from '../_proxy.js';

export async function onRequestPost(context) {
  const { request } = context;
  const body = await request.json().catch(() => ({}));
  return proxyFetch('/api/admin/upload-image', { method: 'POST', body }, context);
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}