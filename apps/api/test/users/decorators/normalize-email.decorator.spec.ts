import { plainToInstance } from 'class-transformer';

import { LoginDto } from '../../../src/auth/dto/login.dto.js';
import { CreateUserDto } from '../../../src/users/dto/create-user.dto.js';

describe('@NormalizeEmail', () => {
  it.each([CreateUserDto, LoginDto])('%o guarda el correo en minúsculas y sin espacios', (Dto) => {
    const dto = plainToInstance(Dto, { email: '  Ana.Perez@Example.TEST ' });
    expect(dto.email).toBe('ana.perez@example.test');
  });
});
