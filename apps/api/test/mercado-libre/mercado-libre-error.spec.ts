import { HttpException, HttpStatus } from '@nestjs/common';

import {
  describeMercadoLibreError,
  MercadoLibreRequestError,
  toClientException,
} from '../../src/mercado-libre/mercado-libre-error.js';

describe('errores de Mercado Libre', () => {
  it.each([
    [404, HttpStatus.NOT_FOUND],
    [429, HttpStatus.TOO_MANY_REQUESTS],
    [500, HttpStatus.BAD_GATEWAY],
    [401, HttpStatus.BAD_GATEWAY],
    [403, HttpStatus.BAD_GATEWAY],
    [undefined, HttpStatus.BAD_GATEWAY],
  ])('Mercado Libre %s → cliente %s, sin detalles internos', (status, expected) => {
    const exception = toClientException(new MercadoLibreRequestError(status)) as HttpException;

    expect(exception.getStatus()).toBe(expected);
    const body = JSON.stringify(exception.getResponse());
    expect(body).not.toMatch(/\/products|\/oauth|token|Bearer|client_secret|auth\/url/i);
  });

  it('no altera errores que no vienen de Mercado Libre', () => {
    const other = new Error('otro');
    expect(toClientException(other)).toBe(other);
  });

  it('el detalle para logs solo toma estado, código y mensaje de Mercado Libre', () => {
    const axiosLikeError = {
      message: 'Request failed with status code 400',
      config: { headers: { Authorization: 'Bearer secreto' }, data: 'client_secret=abc&refresh_token=xyz' },
      response: { status: 400, data: { error: 'invalid_grant', message: 'Grant inválido' } },
    };

    const detail = describeMercadoLibreError(axiosLikeError);

    expect(detail).toEqual({ status: 400, code: 'invalid_grant', message: 'Grant inválido' });
    expect(JSON.stringify(detail)).not.toMatch(/secreto|client_secret|refresh_token/);
  });
});
