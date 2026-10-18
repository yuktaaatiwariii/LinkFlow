import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Links System (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const userAEmail = `e2e-links-userA-${Date.now()}@example.com`;
  const userBEmail = `e2e-links-userB-${Date.now()}@example.com`;
  const testPassword = 'StrongPassword123!';

  let userAToken = '';
  let userBToken = '';
  let userAId = '';
  let userBId = '';

  let createdLinkId = '';
  let createdShortCode = '';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);

    // Register User A
    const resA = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: userAEmail, password: testPassword })
      .expect(201);
    userAToken = resA.body.accessToken;
    userAId = resA.body.user.id;

    // Register User B
    const resB = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: userBEmail, password: testPassword })
      .expect(201);
    userBToken = resB.body.accessToken;
    userBId = resB.body.user.id;
  });

  afterAll(async () => {
    if (prisma) {
      // Clean up links and test users created during execution
      await prisma.link.deleteMany({
        where: {
          userId: { in: [userAId, userBId] },
        },
      });
      await prisma.user.deleteMany({
        where: {
          id: { in: [userAId, userBId] },
        },
      });
    }
    await app.close();
  });

  describe('POST /links (Create Link)', () => {
    it('should reject unauthenticated request with 401 Unauthorized', async () => {
      await request(app.getHttpServer())
        .post('/links')
        .send({
          originalUrl: 'https://example.com/test',
        })
        .expect(401);
    });

    it('should reject request missing originalUrl with 400 Bad Request', async () => {
      const response = await request(app.getHttpServer())
        .post('/links')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({})
        .expect(400);

      expect(response.body.message).toEqual(
        expect.arrayContaining([expect.stringContaining('originalUrl')]),
      );
    });

    it('should reject invalid / malformed URL with 400 Bad Request', async () => {
      const response = await request(app.getHttpServer())
        .post('/links')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          originalUrl: 'not-a-valid-url-address',
        })
        .expect(400);

      expect(response.body.message).toEqual(
        expect.arrayContaining([expect.stringContaining('absolute URL')]),
      );
    });

    it('should reject unsupported protocols such as javascript: or ftp:', async () => {
      await request(app.getHttpServer())
        .post('/links')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          originalUrl: 'javascript:alert(1)',
        })
        .expect(400);

      await request(app.getHttpServer())
        .post('/links')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          originalUrl: 'ftp://files.example.com',
        })
        .expect(400);
    });

    it('should reject past or invalid expiration date with 400 Bad Request', async () => {
      const pastDate = new Date(Date.now() - 3600000).toISOString();
      const response = await request(app.getHttpServer())
        .post('/links')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          originalUrl: 'https://example.com/target',
          expiresAt: pastDate,
        })
        .expect(400);

      expect(response.body.message).toEqual(
        expect.arrayContaining([expect.stringContaining('future')]),
      );
    });

    it('should reject unexpected extra fields due to forbidNonWhitelisted policy', async () => {
      await request(app.getHttpServer())
        .post('/links')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          originalUrl: 'https://example.com/target',
          userId: 'hacker-attempt-id',
          clickCount: 999,
        })
        .expect(400);
    });

    it('should successfully create link with valid URL and future expiresAt', async () => {
      const futureDate = '2028-06-01T12:00:00.000Z';
      const response = await request(app.getHttpServer())
        .post('/links')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          originalUrl: 'https://example.com/awesome-product?ref=123',
          expiresAt: futureDate,
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('shortCode');
      expect(response.body).toHaveProperty('shortUrl');
      expect(response.body.originalUrl).toBe(
        'https://example.com/awesome-product?ref=123',
      );
      expect(response.body.clickCount).toBe(0);
      expect(response.body.createdAt).toBeDefined();
      expect(response.body.expiresAt).toBe(futureDate);
      expect(response.body.shortUrl).toContain(response.body.shortCode);

      createdLinkId = response.body.id;
      createdShortCode = response.body.shortCode;

      // Verify database record has correct userId ownership and properties
      const dbLink = await prisma.link.findUnique({
        where: { id: createdLinkId },
      });
      expect(dbLink).not.toBeNull();
      expect(dbLink?.userId).toBe(userAId);
      expect(dbLink?.shortCode).toBe(createdShortCode);
      expect(dbLink?.clickCount).toBe(0);
    });

    it('should successfully create link without expiration date (null expiresAt)', async () => {
      const response = await request(app.getHttpServer())
        .post('/links')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          originalUrl: 'https://docs.example.com/api/v1',
        })
        .expect(201);

      expect(response.body.id).toBeDefined();
      expect(response.body.expiresAt).toBeNull();
      expect(response.body.shortCode).toHaveLength(6);
    });
  });

  describe('GET /links (List User Links)', () => {
    it('should reject unauthenticated request with 401', async () => {
      await request(app.getHttpServer()).get('/links').expect(401);
    });

    it('should return only User A links when authenticated as User A', async () => {
      const response = await request(app.getHttpServer())
        .get('/links')
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('meta');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.meta.total).toBe(2);
      expect(response.body.data.length).toBe(2);

      // Verify that all returned links are owned by User A in DB
      for (const item of response.body.data) {
        const dbRecord = await prisma.link.findUnique({
          where: { id: item.id },
        });
        expect(dbRecord?.userId).toBe(userAId);
      }
    });

    it('should return empty list when authenticated as User B with no links created', async () => {
      const response = await request(app.getHttpServer())
        .get('/links')
        .set('Authorization', `Bearer ${userBToken}`)
        .expect(200);

      expect(response.body.data).toEqual([]);
      expect(response.body.meta.total).toBe(0);
    });

    it('should support pagination query params', async () => {
      const response = await request(app.getHttpServer())
        .get('/links?page=1&limit=1')
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(200);

      expect(response.body.data.length).toBe(1);
      expect(response.body.meta.total).toBe(2);
      expect(response.body.meta.page).toBe(1);
      expect(response.body.meta.limit).toBe(1);
      expect(response.body.meta.totalPages).toBe(2);
    });
  });

  describe('GET /links/:id (Retrieve Single Link)', () => {
    it('should reject unauthenticated request with 401', async () => {
      await request(app.getHttpServer())
        .get(`/links/${createdLinkId}`)
        .expect(401);
    });

    it('should retrieve link owned by authenticated User A', async () => {
      const response = await request(app.getHttpServer())
        .get(`/links/${createdLinkId}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(200);

      expect(response.body.id).toBe(createdLinkId);
      expect(response.body.shortCode).toBe(createdShortCode);
      expect(response.body.originalUrl).toBe(
        'https://example.com/awesome-product?ref=123',
      );
      expect(response.body.clickCount).toBe(0);
    });

    it('should return 404 Not Found when User B attempts to access User A link (strict isolation)', async () => {
      const response = await request(app.getHttpServer())
        .get(`/links/${createdLinkId}`)
        .set('Authorization', `Bearer ${userBToken}`)
        .expect(404);

      expect(response.body.message).toBe('Link not found');
    });

    it('should return 404 Not Found for non-existent link ID', async () => {
      const response = await request(app.getHttpServer())
        .get('/links/non-existent-link-cuid')
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(404);

      expect(response.body.message).toBe('Link not found');
    });
  });

  describe('DELETE /links/:id (Delete Link)', () => {
    it('should reject unauthenticated delete request with 401', async () => {
      await request(app.getHttpServer())
        .delete(`/links/${createdLinkId}`)
        .expect(401);
    });

    it('should return 404 Not Found when User B attempts to delete User A link (strict isolation)', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/links/${createdLinkId}`)
        .set('Authorization', `Bearer ${userBToken}`)
        .expect(404);

      expect(response.body.message).toBe('Link not found');
    });

    it('should return 404 Not Found when deleting non-existent link', async () => {
      const response = await request(app.getHttpServer())
        .delete('/links/non-existent-link-cuid')
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(404);

      expect(response.body.message).toBe('Link not found');
    });

    it('should successfully delete link owned by authenticated User A (204 No Content)', async () => {
      await request(app.getHttpServer())
        .delete(`/links/${createdLinkId}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(204);

      // Verify link is no longer retrievable
      await request(app.getHttpServer())
        .get(`/links/${createdLinkId}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(404);
    });
  });
});
