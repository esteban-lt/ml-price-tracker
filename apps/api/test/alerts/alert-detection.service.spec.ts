import { AlertDetectionService } from '../../src/alerts/alert-detection.service.js';
import { PriceHistory } from '../../src/price-history/entities/price-history.entity.js';
import {
  ThresholdTypeEnum,
  TrackedProduct,
  TrackingStatusEnum,
} from '../../src/tracked-products/entities/tracked-product.entity.js';

// Repositorios simulados: un seguimiento, el snapshot "anterior" que devuelve la base (o ninguno)
// y un insert que reporta cuántas alertas se crearon.
function setup({ tracking, previousPrice = null }: { tracking: Partial<TrackedProduct>; previousPrice?: number | null }) {
  const inserted: unknown[] = [];
  const insertBuilder = {
    insert: () => insertBuilder,
    values: (values: unknown) => {
      inserted.push(values);
      return insertBuilder;
    },
    orIgnore: () => insertBuilder,
    execute: async () => ({ raw: [{ id: 'alert-id' }] }),
  };
  const priceHistoryRepository = {
    findOne: vi.fn(async () => (previousPrice === null ? null : { price: previousPrice })),
  };

  const service = new AlertDetectionService(
    { createQueryBuilder: () => insertBuilder } as never,
    {
      findBy: async () => [
        {
          id: 'tracking-id',
          status: TrackingStatusEnum.ACTIVE,
          createdAt: new Date('2026-01-01T00:00:00Z'),
          referencePrice: 1000,
          ...tracking,
        },
      ],
    } as never,
    priceHistoryRepository as never,
  );
  return { service, inserted, priceHistoryRepository };
}

const snapshot = (price: number) =>
  ({ id: 'snapshot-id', productId: 'product-id', price, checkedAt: new Date('2026-01-02T00:00:00Z') }) as PriceHistory;

describe('AlertDetectionService (reglas de umbral)', () => {
  describe('price_below', () => {
    const tracking = { thresholdType: ThresholdTypeEnum.PRICE_BELOW, thresholdValue: 900 };

    it('alerta cuando el precio llega exactamente al umbral', async () => {
      const { service } = setup({ tracking });
      expect(await service.detectForSnapshot(snapshot(900))).toBe(1);
    });

    it('no alerta si el precio sigue por encima del umbral', async () => {
      const { service, inserted } = setup({ tracking });
      expect(await service.detectForSnapshot(snapshot(900.01))).toBe(0);
      expect(inserted).toHaveLength(0);
    });
  });

  describe('percentage_drop', () => {
    // 999.99 × (1 − 15/100) = 849.9915, redondeado a 849.99.
    const tracking = { thresholdType: ThresholdTypeEnum.PERCENTAGE_DROP, thresholdValue: 15, referencePrice: 999.99 };

    it('usa el precio objetivo redondeado a centavos', async () => {
      expect(await setup({ tracking }).service.detectForSnapshot(snapshot(849.99))).toBe(1);
      expect(await setup({ tracking }).service.detectForSnapshot(snapshot(850))).toBe(0);
    });

    it('no evalúa si no hay precio de referencia', async () => {
      const { service, priceHistoryRepository } = setup({ tracking: { ...tracking, referencePrice: null } });
      expect(await service.detectForSnapshot(snapshot(1))).toBe(0);
      expect(priceHistoryRepository.findOne).not.toHaveBeenCalled();
    });
  });

  describe('regla de cruce (precio anterior)', () => {
    const tracking = { thresholdType: ThresholdTypeEnum.PRICE_BELOW, thresholdValue: 900, referencePrice: 1000 };

    it('usa el último snapshot posterior al seguimiento: si ya cumplía, no alerta', async () => {
      const { service } = setup({ tracking, previousPrice: 880 });
      expect(await service.detectForSnapshot(snapshot(850))).toBe(0);
    });

    it('alerta si el snapshot anterior no cumplía', async () => {
      const { service } = setup({ tracking, previousPrice: 950 });
      expect(await service.detectForSnapshot(snapshot(850))).toBe(1);
    });

    it('sin snapshot anterior usa el precio de referencia', async () => {
      expect(await setup({ tracking }).service.detectForSnapshot(snapshot(850))).toBe(1);
      expect(
        await setup({ tracking: { ...tracking, referencePrice: 800 } }).service.detectForSnapshot(snapshot(850)),
      ).toBe(0);
    });

    it('busca el anterior solo entre la creación del seguimiento y el snapshot nuevo', async () => {
      const { service, priceHistoryRepository } = setup({ tracking });
      await service.detectForSnapshot(snapshot(850));

      const [{ where }] = priceHistoryRepository.findOne.mock.calls[0] as unknown as [{ where: object }];
      expect(where).toMatchObject({ productId: 'product-id' });
      expect(JSON.stringify(where)).toContain('2026-01-01');
      expect(JSON.stringify(where)).toContain('2026-01-02');
    });
  });
});
