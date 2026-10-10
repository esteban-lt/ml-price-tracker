import { IsEnum, IsNumber, IsPositive, Max, ValidateBy, ValidationArguments } from 'class-validator';

import { ThresholdTypeEnum } from '../entities/tracked-product.entity.js';

// Máximo que cabe en una columna decimal(10,2).
const MAX_THRESHOLD_VALUE = 99_999_999.99;
const MIN_PERCENTAGE_DROP = 1;
const MAX_PERCENTAGE_DROP = 99;

// Si el umbral es un porcentaje de bajada, debe estar entre 1 y 99.
function IsValidPercentageDrop(): PropertyDecorator {
  return ValidateBy({
    name: 'isValidPercentageDrop',
    validator: {
      validate: (value: unknown, validationArguments?: ValidationArguments) => {
        const dto = validationArguments?.object as UpdateThresholdDto | undefined;
        // Si el valor no es número, ya lo reporta @IsNumber.
        if (dto?.thresholdType !== ThresholdTypeEnum.PERCENTAGE_DROP || typeof value !== 'number') return true;
        return value >= MIN_PERCENTAGE_DROP && value <= MAX_PERCENTAGE_DROP;
      },
      defaultMessage: () => `El porcentaje de bajada debe estar entre ${MIN_PERCENTAGE_DROP} y ${MAX_PERCENTAGE_DROP}`,
    },
  });
}

export class UpdateThresholdDto {
  @IsEnum(ThresholdTypeEnum, {
    message: `El tipo de umbral debe ser uno de: ${Object.values(ThresholdTypeEnum).join(', ')}`,
  })
  thresholdType: ThresholdTypeEnum;

  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'El valor del umbral debe ser un número con máximo 2 decimales' })
  @IsPositive({ message: 'El valor del umbral debe ser mayor a 0' })
  @Max(MAX_THRESHOLD_VALUE, { message: `El valor del umbral no puede ser mayor a ${MAX_THRESHOLD_VALUE}` })
  @IsValidPercentageDrop()
  thresholdValue: number;
}
