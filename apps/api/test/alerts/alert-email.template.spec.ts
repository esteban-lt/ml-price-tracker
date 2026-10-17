import { buildAlertEmail } from '../../src/alerts/alert-email.template.js';
import { Alert } from '../../src/alerts/entities/alert.entity.js';
import { ThresholdTypeEnum } from '../../src/tracked-products/entities/tracked-product.entity.js';

function alert({ name = 'Audífonos', url = 'https://www.mercadolibre.com.mx/p/MLM1', price = 1299.5 } = {}): Alert {
  return {
    priceHistory: { price, currency: 'MXN' },
    trackedProduct: {
      thresholdType: ThresholdTypeEnum.PRICE_BELOW,
      thresholdValue: 1300,
      referencePrice: 1500,
      product: { name, url, imageUrl: 'https://http2.mlstatic.com/a.jpg?x=1&y="2"' },
    },
  } as unknown as Alert;
}

describe('buildAlertEmail', () => {
  it('escapa el HTML del nombre del producto', () => {
    const { html, text } = buildAlertEmail(alert({ name: '<script>alert("x")</script> & Cía' }), 'https://app.test');

    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('&amp; Cía');
    expect(text).toContain('<script>');
  });

  it('escapa las URLs dentro de atributos', () => {
    const { html } = buildAlertEmail(alert({ url: 'https://example.test/p?a=1&b="x"' }), 'https://app.test');

    expect(html).not.toContain('b="x"');
    expect(html).toContain('a=1&amp;b=&quot;x&quot;');
  });

  it('formatea el precio en pesos mexicanos', () => {
    const { html, text } = buildAlertEmail(alert({ price: 1299.5 }), 'https://app.test');

    expect(text).toContain('$1,299.50');
    expect(html).toContain('$1,299.50');
  });
});
