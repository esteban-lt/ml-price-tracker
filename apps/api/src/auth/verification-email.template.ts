import { APP_NAME } from '../mail/mail.constants.js';
import { MailMessage } from '../mail/mail.service.js';

type VerificationEmail = Omit<MailMessage, 'to'>;

export function buildVerificationEmail(code: string, validMinutes: number): VerificationEmail {
  const subject = `Verifica tu correo en ${APP_NAME}`;
  const intro = `Usa este código para verificar tu correo en ${APP_NAME}:`;
  const validity = `El código vence en ${validMinutes} minutos.`;
  const footer = `Si no creaste una cuenta en ${APP_NAME} ni pediste este código, ignora este correo.`;

  const text = [intro, '', code, '', validity, '', footer].join('\n');

  const html = `<!doctype html>
<html lang="es">
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#18181b;">
  <div style="max-width:560px;margin:0 auto;padding:24px 16px;">
    <div style="background:#ffffff;border-radius:8px;padding:24px;">
      <p style="margin:0 0 16px;font-size:14px;color:#71717a;">${APP_NAME} · Verificación de correo</p>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.5;">${intro}</p>
      <p style="margin:0 0 16px;font-size:32px;font-weight:bold;letter-spacing:8px;text-align:center;">${code}</p>
      <p style="margin:0;font-size:15px;line-height:1.5;">${validity}</p>
    </div>
    <p style="margin:16px 0 0;font-size:12px;line-height:1.5;color:#71717a;">${footer}</p>
  </div>
</body>
</html>`;

  return { subject, html, text };
}
