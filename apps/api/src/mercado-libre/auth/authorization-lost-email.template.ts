import { APP_NAME } from '../../mail/mail.constants.js';
import { MailMessage } from '../../mail/mail.service.js';

type AuthorizationLostEmail = Omit<MailMessage, 'to'>;

export function buildAuthorizationLostEmail(): AuthorizationLostEmail {
  const subject = `${APP_NAME}: se perdió la autorización de Mercado Libre`;
  const intro =
    `Mercado Libre rechazó el refresh_token guardado, así que ${APP_NAME} no puede consultar productos ` +
    `ni actualizar precios hasta que se vuelva a autorizar.`;
  const steps =
    'Inicia sesión con una cuenta administradora, abre la URL de GET /mercado-libre/auth/url, autoriza ' +
    'y envía el code del callback a POST /mercado-libre/auth/exchange.';
  const footer = 'Recibes este aviso porque tu correo está en ADMIN_EMAILS. Se envía como máximo una vez al día.';

  const text = [intro, '', steps, '', footer].join('\n');

  const html = `<!doctype html>
<html lang="es">
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#18181b;">
  <div style="max-width:560px;margin:0 auto;padding:24px 16px;">
    <div style="background:#ffffff;border-radius:8px;padding:24px;">
      <p style="margin:0 0 16px;font-size:14px;color:#71717a;">${APP_NAME} · Aviso para administradores</p>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.5;">${intro}</p>
      <p style="margin:0;font-size:15px;line-height:1.5;">${steps}</p>
    </div>
    <p style="margin:16px 0 0;font-size:12px;line-height:1.5;color:#71717a;">${footer}</p>
  </div>
</body>
</html>`;

  return { subject, html, text };
}
