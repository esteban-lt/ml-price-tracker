import { Transform } from 'class-transformer';

// El correo se guarda y se busca en minúsculas y sin espacios alrededor.
export function NormalizeEmail(): PropertyDecorator {
  return Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value));
}
