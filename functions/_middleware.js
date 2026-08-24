// functions/_middleware.js — Cloudflare Pages Middleware
export async function onRequest(context) {
  const { request, next } = context;
  const url = new URL(request.url);

  // Redirección canónica de www.lacomadrelola.cl a lacomadrelola.cl
  if (url.hostname === 'www.lacomadrelola.cl') {
    url.hostname = 'lacomadrelola.cl';
    return Response.redirect(url.toString(), 301);
  }

  // Continuar normalmente
  const response = await next();
  return response;
}
