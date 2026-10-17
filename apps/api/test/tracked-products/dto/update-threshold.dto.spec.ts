import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { UpdateThresholdDto } from '../../../src/tracked-products/dto/update-threshold.dto.js';

const isValid = async (thresholdType: string, thresholdValue: unknown) =>
  (await validate(plainToInstance(UpdateThresholdDto, { thresholdType, thresholdValue }))).length === 0;

describe('UpdateThresholdDto', () => {
  it('price_below acepta cualquier precio mayor a 0', async () => {
    expect(await isValid('price_below', 0.01)).toBe(true);
    expect(await isValid('price_below', 150000)).toBe(true);
    expect(await isValid('price_below', 0)).toBe(false);
    expect(await isValid('price_below', -5)).toBe(false);
  });

  it('percentage_drop solo acepta de 1 a 99', async () => {
    expect(await isValid('percentage_drop', 1)).toBe(true);
    expect(await isValid('percentage_drop', 99)).toBe(true);
    expect(await isValid('percentage_drop', 0.5)).toBe(false);
    expect(await isValid('percentage_drop', 100)).toBe(false);
  });

  it('rechaza tipos desconocidos y valores no numéricos', async () => {
    expect(await isValid('price_above', 100)).toBe(false);
    expect(await isValid('price_below', '100')).toBe(false);
  });
});
