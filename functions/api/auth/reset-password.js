// functions/api/auth/reset-password.js — Cloudflare Pages Function
export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const body = await request.json();
    const { action, newPassword, token } = body || {};

    // Acción 1: Solicitar link de recuperación por correo
    if (action === 'request') {
      const adminEmail = (env && env.ADMIN_EMAIL) || 'artemisa.photo@gmail.com';
      const resetPayload = {
        type: 'password_reset',
        user: 'admin',
        exp: Date.now() + 24 * 3600 * 1000, // 24 horas
      };
      const resetToken = btoa(JSON.stringify(resetPayload));
      const resetLink = `https://lacomadrelola.cl/login.html?token=${resetToken}`;

      try {
        await fetch('https://api.mailchannels.net/tx/v1/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            personalizations: [{ to: [{ email: adminEmail, name: 'Administración La Comadre Lola' }] }],
            from: { email: 'contacto@lacomadrelola.cl', name: 'La Comadre Lola — Seguridad' },
            subject: '🔑 Enlace para Definir o Cambiar tu Contraseña — La Comadre Lola',
            content: [{
              type: 'text/html',
              value: `
                <div style="font-family: Arial, sans-serif; background:#08080c; color:#f0f0f0; padding:24px; border-radius:12px; border:2px solid #00fadd;">
                  <h2 style="color:#00fadd; margin-top:0;">🌹 Recuperación de Acceso al Panel</h2>
                  <p>Hola,</p>
                  <p>Has solicitado crear o actualizar tu contraseña de acceso al Panel de Administración de <b>La Comadre Lola</b>.</p>
                  <p style="margin:24px 0;">
                    <a href="${resetLink}" style="background:#00fadd; color:#000; padding:12px 24px; border-radius:8px; font-weight:bold; text-decoration:none; display:inline-block;">
                      🔑 Crear / Cambiar mi Contraseña
                    </a>
                  </p>
                  <p style="font-size:12px; color:#8a8aa0;">Si no solicitaste este cambio, puedes ignorar este mensaje.</p>
                </div>
              `
            }]
          })
        });
      } catch (e) {
        console.warn('Mail send error:', e);
      }

      return new Response(JSON.stringify({
        ok: true,
        message: 'Se ha enviado un enlace de recuperación a tu correo.',
        resetLink: resetLink
      }), { headers: { 'Content-Type': 'application/json' } });
    }

    // Acción 2: Guardar nueva contraseña
    if (action === 'set' || newPassword) {
      if (!newPassword || newPassword.length < 4) {
        return new Response(JSON.stringify({ ok: false, error: 'La contraseña debe tener al menos 4 caracteres.' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (token) {
        try {
          const decoded = JSON.parse(atob(token));
          if (decoded.exp && decoded.exp < Date.now()) {
            return new Response(JSON.stringify({ ok: false, error: 'El enlace ha expirado. Solicita uno nuevo.' }), {
              status: 400,
              headers: { 'Content-Type': 'application/json' },
            });
          }
        } catch (e) {}
      }

      if (env.DB) {
        try {
          await env.DB.prepare(`
            CREATE TABLE IF NOT EXISTS cms_content (
              "key" TEXT PRIMARY KEY,
              "data" TEXT NOT NULL,
              "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
          `).run();
        } catch(e) {}

        await env.DB.prepare(`
          INSERT INTO cms_content ("key", "data", "updated_at")
          VALUES ('admin_auth', ?, CURRENT_TIMESTAMP)
          ON CONFLICT("key") DO UPDATE SET "data" = excluded."data", "updated_at" = CURRENT_TIMESTAMP
        `)
        .bind(JSON.stringify({ pass: newPassword, updated_at: new Date().toISOString() }))
        .run();
      }

      return new Response(JSON.stringify({
        ok: true,
        message: '¡Contraseña actualizada con éxito! Ya puedes iniciar sesión.'
      }), { headers: { 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ ok: false, error: 'Acción no válida' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
