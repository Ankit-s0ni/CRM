import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  it('returns the standard API error contract with a request ID', async () => {
    const response = await request(app.getHttpServer())
      .get('/workspace/status')
      .expect(400);

    expect(response.headers['x-request-id']).toBeTruthy();
    expect(response.body).toMatchObject({
      statusCode: 400,
      code: 'BAD_REQUEST',
      message: 'Subdomain or tenant ID required',
      path: '/workspace/status',
    });
    expect((response.body as { requestId: string }).requestId).toBe(
      response.headers['x-request-id'],
    );
  });

  afterEach(async () => {
    await app.close();
  });
});
