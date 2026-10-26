import { APP_NAME } from '../mail/mail.constants.js';
import { MailMessage } from '../mail/mail.service.js';
import { ThresholdTypeEnum } from '../tracked-products/entities/tracked-product.entity.js';
import { Alert } from './entities/alert.entity.js';

const SUBJECT_NAME_MAX_LENGTH = 60;

type AlertEmail = Omit<MailMessage, 'to'>;

interface AlertEmailLinks {
  frontendUrl: string;
  unsubscribeUrl: string;
}

// Requiere cargadas las relaciones priceHistory y trackedProduct.product.
export function buildAlertEmail(
  { priceHistory, trackedProduct }: Alert,
  { frontendUrl, unsubscribeUrl }: AlertEmailLinks,
): AlertEmail {
  const { product, thresholdType, thresholdValue, referencePrice } = trackedProduct;
  const formatPrice = (value: number) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: priceHistory.currency }).format(value);

  const price = formatPrice(priceHistory.price);
  const condition =
    thresholdType === ThresholdTypeEnum.PRICE_BELOW
      ? `Llegó a tu precio objetivo de ${formatPrice(thresholdValue)}.`
      : referencePrice === null
        ? `Bajó al menos ${thresholdValue}%, como pediste en tu alerta.`
        : `Bajó ${dropPercentage(referencePrice, priceHistory.price)}% desde ${formatPrice(referencePrice)} ` +
          `(tu alerta era por una baja de ${thresholdValue}%).`;
  const footer =
    `Recibes este correo porque sigues este producto en ${APP_NAME} y tienes activadas las alertas por correo. ` +
    `Puedes desactivarlas cuando quieras.`;
  const unsubscribeLabel = 'Dejar de recibir alertas por correo';

  const subject = `Bajó de precio: ${truncate(product.name, SUBJECT_NAME_MAX_LENGTH)}`;

  const text = [
    `${product.name} ahora cuesta ${price}.`,
    condition,
    '',
    `Ver en Mercado Libre: ${product.url}`,
    `Abrir ${APP_NAME}: ${frontendUrl}`,
    '',
    footer,
    `${unsubscribeLabel}: ${unsubscribeUrl}`,
  ].join('\n');

  const image = product.imageUrl
    ? `<img src="${escapeHtml(product.imageUrl)}" alt="" width="160" style="display:block;margin:0 auto 16px;max-width:160px;height:auto;">`
    : '';

  const html = `<!doctype html>
<html lang="es">
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#18181b;">
  <div style="max-width:560px;margin:0 auto;padding:24px 16px;">
    <div style="background:#ffffff;border-radius:8px;padding:24px;">
      <p style="margin:0 0 16px;font-size:14px;color:#71717a;">${APP_NAME} · Alerta de precio</p>
      ${image}
      <h1 style="margin:0 0 8px;font-size:18px;line-height:1.4;">${escapeHtml(product.name)}</h1>
      <p style="margin:0 0 8px;font-size:28px;font-weight:bold;">${price}</p>
      <p style="margin:0 0 24px;font-size:15px;line-height:1.5;">${escapeHtml(condition)}</p>
      <a href="${escapeHtml(product.url)}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:6px;font-size:15px;">Ver en Mercado Libre</a>
      <p style="margin:16px 0 0;font-size:14px;"><a href="${escapeHtml(frontendUrl)}" style="color:#2563eb;">Abrir ${APP_NAME}</a></p>
    </div>
    <p style="margin:16px 0 0;font-size:12px;line-height:1.5;color:#71717a;">${footer} <a href="${escapeHtml(unsubscribeUrl)}" style="color:#71717a;">${unsubscribeLabel}</a></p>
  </div>
</body>
</html>`;

  return { subject, html, text };
}

function dropPercentage(referencePrice: number, price: number): number {
  return Math.round(((referencePrice - price) / referencePrice) * 100);
}

function truncate(value: string, maxLength: number): string {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
