// functions/api/admin/content.js — Proxy al backend del VPS (BD unificada)
import { proxyFetch } from '../_proxy.js';

export async function onRequestPut(context) {
  const { request } = context;
  const body = await request.json().catch(() => ({}));
  return proxyFetch('/api/admin/content', { method: 'PUT', body }, context);
}

export async function onRequestPost(context) {
  const { request } = context;
  const body = await request.json().catch(() => ({}));
  return proxyFetch('/api/admin/content', { method: 'PUT', body }, context);
}

export async function onRequestGet(context) {
  return proxyFetch('/api/content', { method: 'GET' }, context);
}