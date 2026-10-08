import { IsEnum, IsNotEmpty, IsString, ValidateBy, ValidationArguments } from 'class-validator';

import { StoreEnum } from '../entities/product.entity.js';

const EXTERNAL_ID_FORMATS: Partial<Record<StoreEnum, { pattern: RegExp; example: string }>> = {
  [StoreEnum.MERCADO_LIBRE]: { pattern: /^MLM\d+$/, example: 'MLM12345678' },
};

function findExternalIdFormat(validationArguments?: ValidationArguments) {
  const dto = validationArguments?.object as AddProductDto | undefined;
  return dto ? EXTERNAL_ID_FORMATS[dto.store] : undefined;
}

// El formato del externalId depende de la tienda; las tiendas sin formato registrado no se validan aquí.
function MatchesStoreExternalIdFormat(): PropertyDecorator {
  return ValidateBy({
    name: 'matchesStoreExternalIdFormat',
    validator: {
      validate: (value: unknown, validationArguments?: ValidationArguments) => {
        // Si falta el valor o no es texto, ya lo reportan @IsNotEmpty y @IsString.
        if (typeof value !== 'string' || value === '') return true;

        const format = findExternalIdFormat(validationArguments);
        return !format || format.pattern.test(value);
      },
      defaultMessage: (validationArguments?: ValidationArguments) =>
        `El externalId no tiene el formato esperado para la tienda (ejemplo: ${findExternalIdFormat(validationArguments)?.example})`,
    },
  });
}

export class AddProductDto {
  @IsEnum(StoreEnum, { message: `La tienda debe ser una de: ${Object.values(StoreEnum).join(', ')}` })
  store: StoreEnum;

  @IsString({ message: 'El externalId debe ser texto' })
  @IsNotEmpty({ message: 'Debe enviar el externalId del producto' })
  @MatchesStoreExternalIdFormat()
  externalId: string;
}
