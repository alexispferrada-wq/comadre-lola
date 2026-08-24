// functions/api/admin/send-delivery-email.js — Cloudflare Pages Function
export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    let body = {};
    try { body = await request.json(); } catch(e) {}
    const toEmail = body.to || (env && env.ADMIN_EMAIL) || 'artemisa.photo@gmail.com';
    const toName = body.name || 'Maite';

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #08080c; color: #f0f0f0; margin: 0; padding: 20px; }
          .container { max-width: 620px; margin: 0 auto; background: #12121c; border-radius: 16px; border: 1px solid rgba(0, 250, 221, 0.3); overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.6); }
          .header { background: linear-gradient(135deg, #0f0f18, #181828); padding: 32px 24px; text-align: center; border-bottom: 2px solid #00fadd; }
          .header h1 { margin: 0; color: #00fadd; font-size: 26px; font-weight: 800; letter-spacing: 0.5px; }
          .header p { margin: 6px 0 0 0; color: #8a8aa0; font-size: 13px; text-transform: uppercase; letter-spacing: 1.5px; }
          .content { padding: 30px 24px; line-height: 1.6; font-size: 15px; }
          .greeting { font-size: 17px; font-weight: 700; color: #ffffff; margin-bottom: 16px; }
          .card-box { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 20px; margin: 20px 0; }
          .card-box h3 { margin: 0 0 12px 0; color: #00fadd; font-size: 16px; display: flex; align-items: center; gap: 8px; }
          .btn-cta { display: inline-block; background: linear-gradient(135deg, #00fadd, #00c8b0); color: #000000 !important; font-weight: 800; font-size: 14px; text-decoration: none; padding: 14px 28px; border-radius: 10px; margin: 12px 0; text-align: center; }
          .links-list { list-style: none; padding: 0; margin: 10px 0; }
          .links-list li { margin-bottom: 10px; }
          .links-list a { color: #00fadd; font-weight: 600; text-decoration: none; }
          .qr-section { text-align: center; background: #0c0c14; border: 1px dashed rgba(0, 250, 221, 0.4); border-radius: 12px; padding: 20px; margin: 20px 0; }
          .qr-img { width: 180px; height: 180px; border-radius: 8px; border: 4px solid #ffffff; margin: 12px auto; display: block; }
          .footer { background: #0b0b12; padding: 24px; text-align: center; font-size: 13px; color: #8a8aa0; border-top: 1px solid rgba(255,255,255,0.06); }
          .footer a { color: #00fadd; text-decoration: none; font-weight: 600; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🌹 La Comadre Lola</h1>
            <p>Entrega Oficial de Plataforma Web & Sistema</p>
          </div>
          <div class="content">
            <div class="greeting">Hola ${toName}, un gusto saludarte.</div>
            <p>Te escribimos para contarte que hemos finalizado con éxito la puesta en marcha de la nueva plataforma web y sistema digital para <b>La Comadre Lola</b>. El sitio ya se encuentra 100% activo, optimizado para celulares y computadores, y listo para recibir a tus clientes.</p>
            
            <div class="card-box">
              <h3>🌐 1. Enlaces Principales</h3>
              <ul class="links-list">
                <li>• <b>Sitio Web Oficial:</b> <a href="https://lacomadrelola.cl" target="_blank">https://lacomadrelola.cl</a></li>
                <li>• <b>Carta Digital Interactiva:</b> <a href="https://lacomadrelola.cl/carta" target="_blank">https://lacomadrelola.cl/carta</a></li>
                <li>• <b>Panel de Administración y Reservas:</b> <a href="https://lacomadrelola.cl/admin" target="_blank">https://lacomadrelola.cl/admin</a></li>
              </ul>
            </div>

            <div class="card-box" style="border-color: rgba(225, 14, 137, 0.4);">
              <h3 style="color:#ff2d92;">🔑 2. Acceso y Definición de tu Contraseña Personal</h3>
              <p>Para que tengas el control total y exclusivo de tu panel de administración, puedes definir tu propia contraseña directamente desde este enlace:</p>
              <div style="text-align:center;">
                <a href="https://lacomadrelola.cl/login.html?action=reset" class="btn-cta" target="_blank">
                  🔑 Crear / Guardar mi Contraseña
                </a>
              </div>
              <p style="font-size:13px; color:#8a8aa0; margin-top:8px;">
                <b>Usuario:</b> <code>admin</code><br>
                <i>(Nota: Si en algún momento olvidas tu clave, en la misma pantalla de ingreso encontrarás la opción "¿Olvidaste tu contraseña?" para restaurarla en segundos).</i>
              </p>
            </div>

            <div class="qr-section">
              <h3 style="color:#00fadd; margin-top:0;">📱 3. Código QR para las Mesas</h3>
              <p style="font-size:13px; color:#a0a0b8; margin-bottom:8px;">Puedes descargar e imprimir este código QR para colocarlo en las mesas o barra. Los clientes abrirán la carta digital al instante.</p>
              <img src="https://lacomadrelola.cl/assets/qr_carta_oficial.png" alt="Código QR Carta" class="qr-img">
              <div>
                <a href="https://lacomadrelola.cl/assets/qr_carta_oficial.png" download="QR_Carta_La_Comadre_Lola.png" style="color:#00fadd; font-weight:700; font-size:13px; text-decoration:none;">
                  ⬇️ Descargar Imagen QR en Alta Resolución
                </a>
              </div>
            </div>

            <div class="card-box">
              <h3>📖 4. Manual Oficial de Operaciones</h3>
              <p>Hemos preparado un manual redactado en lenguaje sencillo y práctico para la administración:</p>
              <div style="margin-top:10px;">
                <a href="https://lacomadrelola.cl/Manual_Administracion_La_Comadre_Lola.pdf" target="_blank" style="color:#00fadd; font-weight:700; font-size:14px; text-decoration:none; display:inline-flex; align-items:center; gap:6px;">
                  📄 Descargar Manual de Administración en PDF (814 KB)
                </a>
              </div>
            </div>

            <p style="margin-top:24px;">Cualquier duda que tengas estamos totalmente a tu disposición para apoyarte en el despegue de la plataforma.</p>
            <p>¡Mucho éxito con la nueva web de <b>La Comadre Lola</b>! 🥂✨</p>
          </div>

          <div class="footer">
            <p style="margin:0 0 6px 0; font-weight:700; color:#ffffff;">Equipo TuSitioYa</p>
            <p style="margin:0;"><a href="mailto:contacto@tusitioya.cl">contacto@tusitioya.cl</a> | <a href="https://tusitioya.cl" target="_blank">tusitioya.cl</a></p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Enviar vía MailChannels
    const res = await fetch('https://api.mailchannels.net/tx/v1/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email: toEmail, name: `${toName} — Administración La Comadre Lola` }],
          },
        ],
        from: {
          email: 'contacto@tusitioya.cl',
          name: 'TuSitioYa — Entrega Web',
        },
        subject: `🌹 ¡Tu nuevo sitio web y sistema digital están listos! — La Comadre Lola`,
        content: [
          {
            type: 'text/html',
            value: htmlContent,
          },
        ],
      }),
    });

    return new Response(JSON.stringify({
      ok: true,
      message: `Correo formal de entrega despachado exitosamente a ${toEmail}`,
      status: res.status,
      recipient: toEmail
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
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
