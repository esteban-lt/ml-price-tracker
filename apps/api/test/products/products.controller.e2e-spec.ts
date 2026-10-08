import { randomUUID } from 'node:crypto';
import request from 'supertest';
import {
  ExecutionContext,
  HttpException,
  HttpStatus,
  INestApplication,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { setupApp } from '../../src/app.setup.js';
import {
  MercadoLibreApiService,
  MercadoLibreProduct,
} from '../../src/mercado-libre/api/mercado-libre-api.service.js';
import { MercadoLibreAuthService } from '../../src/mercado-libre/auth/mercado-libre-auth.service.js';
import { Product } from '../../src/products/entities/product.entity.js';
import { ProductsModule } from '../../src/products/products.module.js';

// Mercado Libre y la base de datos se simulan; todo lo demás (rutas, validación, guard,
// serialización y manejo de errores) es el código real del módulo.

const AUTHORIZATION = { Authorization: 'Bearer test-token' };

const fakeJwtGuard = {
  canActivate(context: ExecutionContext): boolean {
    const { headers } = context.switchToHttp().getRequest<{ headers: Record<string, string> }>();
    if (headers.authorization !== AUTHORIZATION.Authorization) throw new UnauthorizedException();
    return true;
  },
};

function buildMercadoLibreProduct(overrides: Partial<MercadoLibreProduct> = {}): MercadoLibreProduct {
  return {
    id: 'MLM12345678',
    name: 'Producto de prueba',
    url: 'https://www.mercadolibre.com.mx/p/MLM12345678',
    pictures: ['https://http2.mlstatic.com/imagen.jpg'],
    price: 999,
    originalPrice: null,
    currency: 'MXN',
    freeShipping: true,
    itemId: 'MLM987654321',
    sellersCount: 3,
    ...overrides,
  };
}

// Repositorio en memoria con solo los métodos que usa ProductsService.
function createProductRepositoryFake() {
  const products: Product[] = [];
  const matches = (product: Product, where: Partial<Product>) =>
    Object.entries(where).every(([key, value]) => product[key as keyof Product] === value);
  const findOneBy = async (where: Partial<Product>) =>
    products.find((product) => matches(product, where)) ?? null;

  return {
    products,
    findOneBy,
    findOneByOrFail: async (where: Partial<Product>) => (await findOneBy(where))!,
    find: async () => [...products],
    create: (data: Partial<Product>) => ({ ...data }) as Product,
    save: async (product: Product) => {
      const savedProduct = { ...product, id: randomUUID(), isAvailable: true, createdAt: new Date() };
      products.push(savedProduct);
      return savedProduct;
    },
  };
}

describe('ProductsController (e2e)', () => {
  let app: INestApplication;
  let productRepository: ReturnType<typeof createProductRepositoryFake>;
  const mercadoLibreApiService = { getProduct: vi.fn() };

  const addProduct = (body: object) =>
    request(app.getHttpServer()).post('/products').set(AUTHORIZATION).send(body);

  beforeEach(async () => {
    productRepository = createProductRepositoryFake();
    mercadoLibreApiService.getProduct.mockReset();
    mercadoLibreApiService.getProduct.mockImplementation(async (productId: string) =>
      buildMercadoLibreProduct({ id: productId }),
    );

    const moduleFixture = await Test.createTestingModule({ imports: [ProductsModule] })
      .overrideProvider(getRepositoryToken(Product))
      .useValue(productRepository)
      .overrideProvider(MercadoLibreApiService)
      .useValue(mercadoLibreApiService)
      .overrideProvider(MercadoLibreAuthService)
      .useValue({})
      .overrideGuard(AuthGuard('jwt'))
      .useValue(fakeJwtGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    setupApp(app);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('rechaza peticiones sin token', async () => {
    await request(app.getHttpServer()).get('/products').expect(HttpStatus.UNAUTHORIZED);
    await request(app.getHttpServer())
      .post('/products')
      .send({ store: 'mercado_libre', externalId: 'MLM12345678' })
      .expect(HttpStatus.UNAUTHORIZED);
  });

  describe('POST /products', () => {
    it('agrega un producto de Mercado Libre', async () => {
      const response = await addProduct({ store: 'mercado_libre', externalId: 'MLM12345678' }).expect(
        HttpStatus.CREATED,
      );

      expect(response.body).toMatchObject({
        id: expect.any(String),
        store: 'mercado_libre',
        externalId: 'MLM12345678',
        name: expect.any(String),
        url: expect.any(String),
        isAvailable: true,
      });
      expect(mercadoLibreApiService.getProduct).toHaveBeenCalledWith('MLM12345678');
    });

    it('devuelve el mismo producto si se agrega dos veces', async () => {
      const body = { store: 'mercado_libre', externalId: 'MLM12345678' };

      const first = await addProduct(body).expect(HttpStatus.CREATED);
      const second = await addProduct(body).expect(HttpStatus.CREATED);

      expect(second.body.id).toBe(first.body.id);
      expect(productRepository.products).toHaveLength(1);
    });

    it.each([
      ['sin externalId', { store: 'mercado_libre' }],
      ['externalId con formato inválido', { store: 'mercado_libre', externalId: 'abc123' }],
      ['tienda inválida', { store: 'ebay', externalId: 'MLM12345678' }],
      ['campos no permitidos', { store: 'mercado_libre', externalId: 'MLM12345678', price: 10 }],
    ])('responde 400 con %s', async (_case, body) => {
      await addProduct(body).expect(HttpStatus.BAD_REQUEST);
      expect(mercadoLibreApiService.getProduct).not.toHaveBeenCalled();
    });

    it('responde 501 para Amazon', async () => {
      await addProduct({ store: 'amazon', externalId: 'B0ABC12345' }).expect(HttpStatus.NOT_IMPLEMENTED);
    });

    it('responde 404 si el producto no existe en Mercado Libre', async () => {
      mercadoLibreApiService.getProduct.mockRejectedValue(new NotFoundException());

      await addProduct({ store: 'mercado_libre', externalId: 'MLM12345678' }).expect(HttpStatus.NOT_FOUND);
      expect(productRepository.products).toHaveLength(0);
    });

    it('responde 502 si Mercado Libre falla', async () => {
      mercadoLibreApiService.getProduct.mockRejectedValue(
        new HttpException('Error de Mercado Libre', HttpStatus.INTERNAL_SERVER_ERROR),
      );

      await addProduct({ store: 'mercado_libre', externalId: 'MLM12345678' }).expect(HttpStatus.BAD_GATEWAY);
    });
  });

  describe('GET /products', () => {
    it('lista los productos agregados', async () => {
      await addProduct({ store: 'mercado_libre', externalId: 'MLM11111111' });
      await addProduct({ store: 'mercado_libre', externalId: 'MLM22222222' });

      const response = await request(app.getHttpServer())
        .get('/products')
        .set(AUTHORIZATION)
        .expect(HttpStatus.OK);

      expect(response.body).toHaveLength(2);
      expect(response.body.map((product: Product) => product.externalId)).toEqual(
        expect.arrayContaining(['MLM11111111', 'MLM22222222']),
      );
    });
  });

  describe('GET /products/:id', () => {
    it('devuelve el producto por id', async () => {
      const { body: addedProduct } = await addProduct({ store: 'mercado_libre', externalId: 'MLM12345678' });

      const response = await request(app.getHttpServer())
        .get(`/products/${addedProduct.id}`)
        .set(AUTHORIZATION)
        .expect(HttpStatus.OK);

      expect(response.body).toMatchObject({ id: addedProduct.id, externalId: 'MLM12345678' });
    });

    it('responde 404 si el producto no existe', async () => {
      await request(app.getHttpServer())
        .get(`/products/${randomUUID()}`)
        .set(AUTHORIZATION)
        .expect(HttpStatus.NOT_FOUND);
    });

    it('responde 400 si el id no es un UUID', async () => {
      await request(app.getHttpServer()).get('/products/abc').set(AUTHORIZATION).expect(HttpStatus.BAD_REQUEST);
    });
  });
});
