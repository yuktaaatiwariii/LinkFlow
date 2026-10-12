import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';

describe('Auth & Core System (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;

  const testEmail = `e2e-test-${Date.now()}@example.com`;
  const testPassword = 'StrongPassword123!';
  let validToken = '';
  let registeredUserId = '';

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
    jwtService = app.get<JwtService>(JwtService);
  });

  afterAll(async () => {
    // Clean up test data created during test execution
    if (prisma) {
      await prisma.user.deleteMany({
        where: {
          email: {
            contains: 'e2e-test-',
          },
        },
      });
    }
    await app.close();
  });

  describe('Existing Core Routes Preservation', () => {
    it('/ (GET) should preserve existing root route', async () => {
      const response = await request(app.getHttpServer()).get('/').expect(200);
      expect(response.text).toBe('Hello World!');
    });

    it('/health (GET) should preserve existing database health check', async () => {
      const response = await request(app.getHttpServer()).get('/health').expect(200);
      expect(response.body).toEqual({
        status: 'ok',
        database: 'connected',
      });
    });
  });

  describe('POST /auth/register', () => {
    it('should successfully register a user and return safe user with access token', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: `  ${testEmail.toUpperCase()}  `,
          password: testPassword,
        })
        .expect(201);

      expect(response.body).toHaveProperty('accessToken');
      expect(typeof response.body.accessToken).toBe('string');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(testEmail.toLowerCase());
      expect(response.body.user.id).toBeDefined();
      expect(response.body.user.createdAt).toBeDefined();
      expect(response.body.user.updatedAt).toBeDefined();

      // Ensure password and passwordHash are NEVER leaked
      expect(response.body.user.passwordHash).toBeUndefined();
      expect(response.body.user.password).toBeUndefined();
      expect(response.body.passwordHash).toBeUndefined();
      expect(response.body.password).toBeUndefined();

      registeredUserId = response.body.user.id;
      validToken = response.body.accessToken;

      // Verify database record has hashed password, not plaintext
      const dbUser = await prisma.user.findUnique({
        where: { id: registeredUserId },
      });
      expect(dbUser).not.toBeNull();
      expect(dbUser?.passwordHash).not.toBe(testPassword);
      expect(dbUser?.passwordHash.startsWith('$2')).toBe(true);
    });

    it('should reject duplicate email registration with 409 Conflict', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: testEmail,
          password: testPassword,
        })
        .expect(409);

      expect(response.body.message).toContain('already exists');
    });

    it('should reject duplicate email even with different casing and whitespace (normalization)', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: `   ${testEmail.toUpperCase()}   `,
          password: 'AnotherPassword123',
        })
        .expect(409);

      expect(response.body.message).toContain('already exists');
    });

    it('should reject registration with invalid email format (400 Bad Request)', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'not-a-valid-email',
          password: testPassword,
        })
        .expect(400);

      expect(Array.isArray(response.body.message)).toBe(true);
    });

    it('should reject registration with missing password (400 Bad Request)', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'valid.email@example.com',
        })
        .expect(400);
    });

    it('should reject registration with password shorter than 8 characters (400 Bad Request)', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'short.pass@example.com',
          password: '123',
        })
        .expect(400);

      expect(response.body.message).toEqual(
        expect.arrayContaining([expect.stringContaining('at least 8 characters')]),
      );
    });
  });

  describe('POST /auth/login', () => {
    it('should successfully log in with valid credentials and return access token', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: `  ${testEmail.toUpperCase()}  `,
          password: testPassword,
        })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(typeof response.body.accessToken).toBe('string');
      expect(response.body.user.email).toBe(testEmail.toLowerCase());
      expect(response.body.user.passwordHash).toBeUndefined();
    });

    it('should reject login with incorrect password with 401 Unauthorized', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testEmail,
          password: 'WrongPassword999',
        })
        .expect(401);

      expect(response.body.message).toBe('Invalid email or password.');
    });

    it('should reject login with non-existent email with identical 401 message', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'does-not-exist@example.com',
          password: testPassword,
        })
        .expect(401);

      expect(response.body.message).toBe('Invalid email or password.');
    });

    it('should reject login with missing credentials (400 Bad Request)', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({})
        .expect(400);
    });
  });

  describe('GET /auth/me', () => {
    it('should return the authenticated user profile when a valid Bearer token is provided', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body.id).toBe(registeredUserId);
      expect(response.body.email).toBe(testEmail.toLowerCase());
      expect(response.body.createdAt).toBeDefined();
      expect(response.body.updatedAt).toBeDefined();
      expect(response.body.passwordHash).toBeUndefined();
      expect(response.body.password).toBeUndefined();
    });

    it('should return 401 Unauthorized when no token is provided', async () => {
      await request(app.getHttpServer()).get('/auth/me').expect(401);
    });

    it('should return 401 Unauthorized when a malformed token is provided', async () => {
      await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', 'Bearer invalid-malformed-token')
        .expect(401);
    });

    it('should return 401 Unauthorized when an invalid signature token is provided', async () => {
      // Sign a token with a different secret
      const forgedToken = jwtService.sign(
        { sub: registeredUserId, email: testEmail },
        { secret: 'wrong-fake-signature-secret-key-12345' },
      );

      await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${forgedToken}`)
        .expect(401);
    });

    it('should return 401 Unauthorized when an expired token is provided', async () => {
      const expiredToken = jwtService.sign(
        { sub: registeredUserId, email: testEmail },
        { expiresIn: '-10s' },
      );

      await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);
    });
  });
});
