import { from, throwError } from 'rxjs';
import { ServiceUnavailableException } from '@nestjs/common';

import { MercadoLibreAuthService } from '../../../src/mercado-libre/auth/mercado-libre-auth.service.js';

const tokenResponse = (n: number) => ({
  access_token: `access-${n}`,
  refresh_token: `refresh-${n}`,
  expires_in: 21600,
  token_type: 'bearer',
  scope: 'offline_access read',
  user_id: 1,
});

const invalidGrant = () =>
  throwError(() => ({
    message: 'Request failed with status code 400',
    response: { status: 400, data: { error: 'invalid_grant', message: 'invalid grant' } },
  }));

// HTTP y repositorio simulados. `storedTokens` es lo que devuelve cada lectura de la fila única.
function setup(storedTokens: (string | null)[]) {
  const reads = [...storedTokens];
  const repository = {
    findOneBy: vi.fn(async () => {
      const token = reads.length > 1 ? reads.shift() : reads[0];
      return token ? { id: 1, refreshToken: token } : null;
    }),
    upsert: vi.fn(async () => undefined),
    existsBy: vi.fn(async () => true),
  };
  const http = { post: vi.fn() };
  const config = { getOrThrow: (key: string) => `test-${key}` };

  const service = new MercadoLibreAuthService(http as never, config as never, repository as never);
  return { service, http, repository };
}

describe('MercadoLibreAuthService (renovación del token)', () => {
  it('hace una sola renovación ante peticiones simultáneas y guarda el refresh token nuevo', async () => {
    const { service, http, repository } = setup(['refresh-0']);
    let respond!: () => void;
    http.post.mockReturnValue(from(new Promise((resolve) => (respond = () => resolve({ data: tokenResponse(1) })))));

    const pending = Promise.all(Array.from({ length: 5 }, () => service.getValidToken()));
    await vi.waitFor(() => expect(http.post).toHaveBeenCalled());
    respond();

    expect(await pending).toEqual(Array(5).fill('access-1'));
    expect(http.post).toHaveBeenCalledTimes(1);
    expect(repository.upsert).toHaveBeenCalledWith({ id: 1, refreshToken: 'refresh-1' }, ['id']);
    expect(await service.getValidToken()).toBe('access-1');
    expect(http.post).toHaveBeenCalledTimes(1);
  });

  it('ante invalid_grant reintenta una vez si el token guardado cambió', async () => {
    const { service, http } = setup(['refresh-old', 'refresh-new']);
    http.post.mockReturnValueOnce(invalidGrant()).mockReturnValueOnce(from([{ data: tokenResponse(2) }]));

    expect(await service.getValidToken()).toBe('access-2');
    expect(http.post).toHaveBeenCalledTimes(2);
    expect(String(http.post.mock.calls[1][1])).toContain('refresh_token=refresh-new');
  });

  it('ante invalid_grant sin cambios no reintenta y responde un 503 genérico', async () => {
    const { service, http } = setup(['refresh-old']);
    http.post.mockReturnValue(invalidGrant());

    const error = await service.getValidToken().catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ServiceUnavailableException);
    expect((error as Error).message).not.toMatch(/auth\/url|refresh_token|autoriza/i);
    expect(http.post).toHaveBeenCalledTimes(1);
  });

  it('sin autorización guardada responde un 503 genérico sin llamar a Mercado Libre', async () => {
    const { service, http } = setup([null]);

    await expect(service.getValidToken()).rejects.toThrow(ServiceUnavailableException);
    expect(http.post).not.toHaveBeenCalled();
  });
});

describe('MercadoLibreAuthService (intercambio del code)', () => {
  it('guarda el refresh token y deja el access token en memoria', async () => {
    const { service, http, repository } = setup([null]);
    http.post.mockReturnValue(from([{ data: tokenResponse(1) }]));

    const status = await service.exchangeCode('TG-code');

    expect(repository.upsert).toHaveBeenCalledWith({ id: 1, refreshToken: 'refresh-1' }, ['id']);
    expect(status).toMatchObject({ authorized: true, access_token_expires_at: expect.any(String) });
    expect(String(http.post.mock.calls[0][1])).toContain('grant_type=authorization_code');
    expect(await service.getValidToken()).toBe('access-1');
  });

  it('da un error claro si Mercado Libre no devuelve refresh token', async () => {
    const { service, http, repository } = setup([null]);
    http.post.mockReturnValue(from([{ data: { ...tokenResponse(1), refresh_token: undefined } }]));

    await expect(service.exchangeCode('TG-code')).rejects.toThrow(/refresh_token/);
    expect(repository.upsert).not.toHaveBeenCalled();
  });

  it('si Mercado Libre rechaza el code responde 503 sin guardar nada', async () => {
    const { service, http, repository } = setup([null]);
    http.post.mockReturnValue(invalidGrant());

    await expect(service.exchangeCode('TG-code')).rejects.toThrow(ServiceUnavailableException);
    expect(repository.upsert).not.toHaveBeenCalled();
  });

  // Comportamiento actual: el fallo se registra en el log, el access token queda en memoria y el
  // estado refleja lo que hay en la base (sin autorización guardada).
  it('si falla el guardado no lanza error y el estado muestra que no quedó autorizado', async () => {
    const { service, http, repository } = setup([null]);
    http.post.mockReturnValue(from([{ data: tokenResponse(1) }]));
    repository.upsert.mockRejectedValue(new Error('connection terminated'));
    repository.existsBy.mockResolvedValue(false);

    const status = await service.exchangeCode('TG-code');

    expect(status.authorized).toBe(false);
    expect(await service.getValidToken()).toBe('access-1');
  });
});
