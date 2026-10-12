import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';

describe('AuthService', () => {
  let authService: AuthService;
  let usersService: {
    findByEmail: jest.Mock<any>;
    findById: jest.Mock<any>;
    create: jest.Mock<any>;
  };
  let jwtService: {
    signAsync: jest.Mock<any>;
  };

  beforeEach(async () => {
    usersService = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
    };

    jwtService = {
      signAsync: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: usersService,
        },
        {
          provide: JwtService,
          useValue: jwtService,
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(authService).toBeDefined();
  });

  describe('register', () => {
    it('should successfully register a user and return safe user with access token', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      const safeUser = {
        id: 'user-cuid-1',
        email: 'student@example.com',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      usersService.create.mockResolvedValue(safeUser);
      jwtService.signAsync.mockResolvedValue('mock-jwt-token');

      const result = await authService.register({
        email: '  STUDENT@EXAMPLE.COM  ',
        password: 'StrongPassword123',
      });

      // Normalization verification
      expect(usersService.findByEmail).toHaveBeenCalledWith('student@example.com');
      expect(usersService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'student@example.com',
          passwordHash: expect.any(String),
        }),
      );

      // Verify password was hashed and not stored in plaintext
      const createCall = usersService.create.mock.calls[0][0];
      expect(createCall.passwordHash).not.toBe('StrongPassword123');
      expect(createCall.passwordHash.startsWith('$2')).toBe(true);

      // Verify return structure
      expect(result.accessToken).toBe('mock-jwt-token');
      expect(result.user).toEqual(safeUser);
      expect((result.user as any).passwordHash).toBeUndefined();
    });

    it('should reject registration if email is already registered', async () => {
      usersService.findByEmail.mockResolvedValue({
        id: 'existing-id',
        email: 'student@example.com',
        passwordHash: 'hashed',
      });

      await expect(
        authService.register({
          email: 'student@example.com',
          password: 'StrongPassword123',
        }),
      ).rejects.toThrow(ConflictException);

      expect(usersService.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('should successfully authenticate with valid credentials', async () => {
      const plainPassword = 'StrongPassword123';
      const hashedPassword = await bcrypt.hash(plainPassword, 10);
      const mockUser = {
        id: 'user-1',
        email: 'student@example.com',
        passwordHash: hashedPassword,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      usersService.findByEmail.mockResolvedValue(mockUser);
      jwtService.signAsync.mockResolvedValue('mock-login-token');

      const result = await authService.login({
        email: 'student@example.com',
        password: plainPassword,
      });

      expect(result.accessToken).toBe('mock-login-token');
      expect(result.user.email).toBe('student@example.com');
      expect((result.user as any).passwordHash).toBeUndefined();
    });

    it('should reject with 401 Unauthorized when password does not match', async () => {
      const hashedPassword = await bcrypt.hash('CorrectPassword123', 10);
      usersService.findByEmail.mockResolvedValue({
        id: 'user-1',
        email: 'student@example.com',
        passwordHash: hashedPassword,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(
        authService.login({
          email: 'student@example.com',
          password: 'WrongPassword',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should reject with identical 401 message when email is not found', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      let caughtError: any;
      try {
        await authService.login({
          email: 'nonexistent@example.com',
          password: 'AnyPassword123',
        });
      } catch (err) {
        caughtError = err;
      }

      expect(caughtError).toBeInstanceOf(UnauthorizedException);
      expect(caughtError.message).toBe('Invalid email or password.');
    });
  });
});
