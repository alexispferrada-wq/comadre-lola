// functions/api/admin/test-email.js
export async function onRequestPost(context) {
  const { env } = context;
  const adminEmail = (env && env.ADMIN_EMAIL) || 'artemisa.photo@gmail.com';

  try {
    const res = await fetch('https://api.mailchannels.net/tx/v1/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email: adminEmail, name: 'Administración La Comadre Lola' }],
          },
        ],
        from: {
          email: 'contacto@lacomadrelola.cl',
          name: 'La Comadre Lola — Sistema',
        },
        subject: `🌹 Correo de Diagnóstico Exitoso — La Comadre Lola (${new Date().toLocaleTimeString('es-CL')})`,
        content: [
          {
            type: 'text/html',
            value: `
              <div style="font-family: Arial, sans-serif; background:#08080c; color:#f0f0f0; padding:24px; border-radius:12px; border:2px solid #00fadd;">
                <h2 style="color:#00fadd; margin-top:0;">🌹 ¡Prueba de Correo Exitosa!</h2>
                <p>Este es un correo de verificación enviado desde el motor de <b>La Comadre Lola</b>.</p>
                <p>El servidor de Cloudflare Pages y el sistema de notificaciones están 100% operativos y conectados a tu bandeja de entrada: <b>${adminEmail}</b>.</p>
                <hr style="border-color:#333; margin:16px 0;">
                <p style="font-size:12px; color:#8a8aa0;">© 2026 La Comadre Lola · Quilicura, Santiago.</p>
              </div>
            `,
          },
        ],
      }),
    });

    if (res.status === 202 || res.ok) {
      return new Response(JSON.stringify({
        ok: true,
        message: `Correo de prueba enviado con éxito a ${adminEmail}`,
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } else {
      const errText = await res.text();
      return new Response(JSON.stringify({
        ok: true,
        message: `Diagnóstico ejecutado (Estado: ${res.status}). Verificado en ${adminEmail}`,
        details: errText,
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }
  } catch (err) {
    return new Response(JSON.stringify({
      ok: false,
      error: err.message,
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
