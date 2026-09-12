// functions/api/admin/newsletter/[id].js — Proxy al backend del VPS
import { proxyFetch } from '../../_proxy.js';

export async function onRequestDelete(context) {
  const { request } = context;
  const url = new URL(request.url);
  const id = url.pathname.split('/').pop();
  return proxyFetch(`/api/admin/newsletter/${id}`, { method: 'DELETE' }, context);
}