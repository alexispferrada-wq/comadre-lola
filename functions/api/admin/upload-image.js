// functions/api/admin/upload-image.js — Cloudflare Pages Function
export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const body = await request.json();
    const { dataUrl, imageUrl } = body || {};

    if (imageUrl) {
      return new Response(JSON.stringify({ ok: true, url: imageUrl }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!dataUrl) {
      return new Response(JSON.stringify({ ok: false, error: 'Imagen requerida' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Si Cloudinary está configurado en las variables de Cloudflare Pages
    if (env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET) {
      const timestamp = Math.floor(Date.now() / 1000);
      const folder = env.CLOUDINARY_FOLDER || 'lacomadrelola';
      const strToSign = `folder=${folder}&timestamp=${timestamp}${env.CLOUDINARY_API_SECRET}`;

      // SHA-1 signature
      const encoder = new TextEncoder();
      const data = encoder.encode(strToSign);
      const hashBuffer = await crypto.subtle.digest('SHA-1', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const signature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      const formData = new FormData();
      formData.append('file', dataUrl);
      formData.append('api_key', env.CLOUDINARY_API_KEY);
      formData.append('timestamp', timestamp.toString());
      formData.append('signature', signature);
      formData.append('folder', folder);

      const cloudRes = await fetch(
        `https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/image/upload`,
        { method: 'POST', body: formData }
      );
      const cloudData = await cloudRes.json();

      if (cloudData.secure_url) {
        return new Response(JSON.stringify({ ok: true, url: cloudData.secure_url }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    // Fallback: Si no hay Cloudinary configurado, retorna la imagen en dataUrl
    return new Response(JSON.stringify({ ok: true, url: dataUrl }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
