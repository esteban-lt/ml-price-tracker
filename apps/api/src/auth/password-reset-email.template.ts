import { APP_NAME } from '../mail/mail.constants.js';
import { MailMessage } from '../mail/mail.service.js';

type PasswordResetEmail = Omit<MailMessage, 'to'>;

export function buildPasswordResetEmail(resetUrl: string, validMinutes: number): PasswordResetEmail {
  const subject = `Restablece tu contraseña de ${APP_NAME}`;
  const intro = `Recibimos una solicitud para restablecer tu contraseña de ${APP_NAME}. Abre este enlace para elegir una nueva:`;
  const validity = `El enlace vence en ${validMinutes} minutos y solo puede usarse una vez. Al cambiarla se cerrarán tus sesiones abiertas.`;
  const footer = `Si no pediste restablecer tu contraseña, ignora este correo; tu contraseña actual sigue funcionando.`;

  const text = [intro, '', resetUrl, '', validity, '', footer].join('\n');

  const html = `<!doctype html>
<html lang="es">
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#18181b;">
  <div style="max-width:560px;margin:0 auto;padding:24px 16px;">
    <div style="background:#ffffff;border-radius:8px;padding:24px;">
      <p style="margin:0 0 16px;font-size:14px;color:#71717a;">${APP_NAME} · Recuperar contraseña</p>
      <p style="margin:0 0 24px;font-size:15px;line-height:1.5;">${intro}</p>
      <a href="${resetUrl}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:6px;font-size:15px;">Restablecer contraseña</a>
      <p style="margin:24px 0 0;font-size:15px;line-height:1.5;">${validity}</p>
    </div>
    <p style="margin:16px 0 0;font-size:12px;line-height:1.5;color:#71717a;">${footer}</p>
  </div>
</body>
</html>`;

  return { subject, html, text };
}
