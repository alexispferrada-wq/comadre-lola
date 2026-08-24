// functions/api/reservations.js — Cloudflare Pages Function
async function sendNotificationEmail(reservation, env) {
  const adminEmail = (env && env.ADMIN_EMAIL) || 'artemisa.photo@gmail.com';
  const { nombre, email, telefono, fecha, hora, personas, mensaje } = reservation;

  try {
    // 1. Correo de Alerta al Administrador
    await fetch('https://api.mailchannels.net/tx/v1/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email: adminEmail, name: 'Administración La Comadre Lola' }],
          },
        ],
        from: {
          email: 'reservas@lacomadrelola.cl',
          name: 'La Comadre Lola Reservas',
        },
        subject: `🌹 Nueva reserva de ${nombre} (${personas} pers) — La Comadre Lola`,
        content: [
          {
            type: 'text/html',
            value: `
              <div style="font-family: Arial, sans-serif; background:#08080c; color:#f0f0f0; padding:24px; border-radius:12px; border:2px solid #00fadd;">
                <h2 style="color:#00fadd; margin-top:0;">🌹 Nueva Reserva Recibida</h2>
                <p><b>Nombre:</b> ${nombre}</p>
                <p><b>Email:</b> <a href="mailto:${email}" style="color:#00fadd;">${email}</a></p>
                <p><b>Teléfono:</b> <a href="https://wa.me/${(telefono || '').replace(/[^0-9]/g, '')}" style="color:#e10e89;">${telefono || 'No indicado'}</a></p>
                <p><b>Fecha y Hora:</b> ${fecha} a las ${hora} hrs</p>
                <p><b>Personas:</b> ${personas} comensales</p>
                <p><b>Mensaje / Solicitud:</b> ${mensaje || 'Sin mensaje'}</p>
                <hr style="border-color:#333; margin:16px 0;">
                <p style="font-size:12px; color:#8a8aa0;">Gestiona esta reserva desde el <a href="https://lacomadrelola.cl/admin" style="color:#00fadd;">Panel de Control</a>.</p>
              </div>
            `,
          },
        ],
      }),
    });

    // 2. Correo de Acuse de Recibo al Cliente
    if (email && email.includes('@')) {
      await fetch('https://api.mailchannels.net/tx/v1/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personalizations: [
            {
              to: [{ email: email, name: nombre }],
            },
          ],
          from: {
            email: 'reservas@lacomadrelola.cl',
            name: 'La Comadre Lola',
          },
          subject: `🌹 Recibimos tu solicitud de reserva — La Comadre Lola`,
          content: [
            {
              type: 'text/html',
              value: `
                <div style="font-family: Arial, sans-serif; background:#08080c; color:#f0f0f0; padding:24px; border-radius:12px; border:2px solid #e10e89;">
                  <h2 style="color:#e10e89; margin-top:0;">🌹 ¡Hola, ${nombre}!</h2>
                  <p>Hemos recibido tu solicitud de reserva para el <b>${fecha} a las ${hora} hrs</b> (${personas} personas).</p>
                  <p>Nuestro equipo de anfitriones revisará la disponibilidad y te confirmará a la brevedad.</p>
                  <hr style="border-color:#333; margin:16px 0;">
                  <p style="font-size:12px; color:#8a8aa0;">📍 Av. Manuel Antonio Matta 1269, Quilicura · La Comadre Lola</p>
                </div>
              `,
            },
          ],
        }),
      });
    }
  } catch (e) {
    console.warn('Mail dispatch warning:', e);
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const body = await request.json();
    const { nombre, email, telefono, fecha, hora, personas, mensaje } = body || {};

    if (!nombre || !email || !telefono || !fecha || !hora || !personas) {
      return new Response(JSON.stringify({ ok: false, error: 'Faltan campos obligatorios' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (env.DB) {
      const res = await env.DB.prepare(
        `INSERT INTO reservations (nombre, email, telefono, fecha, hora, personas, mensaje, estado)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'pendiente')`
      )
      .bind(nombre, email, telefono, fecha, hora, personas, mensaje || '')
      .run();

      // Despacho de correos en segundo plano
      context.waitUntil(sendNotificationEmail({ nombre, email, telefono, fecha, hora, personas, mensaje }, env));

      return new Response(JSON.stringify({
        ok: true,
        id: res.meta?.last_row_id || Date.now(),
        message: 'Reserva creada con éxito',
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Si no hay BD activa, enviar email de todos modos
    context.waitUntil(sendNotificationEmail({ nombre, email, telefono, fecha, hora, personas, mensaje }, env));

    return new Response(JSON.stringify({ ok: true, message: 'Reserva procesada' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
