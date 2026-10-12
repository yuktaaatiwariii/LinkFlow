import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import { UsersService } from '../../users/users.service';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let usersService: {
    findById: jest.Mock<any>;
  };
  let configService: {
    get: jest.Mock<any>;
  };

  beforeEach(() => {
    usersService = {
      findById: jest.fn(),
    };
    configService = {
      get: jest.fn().mockReturnValue('super-secret-key-12345'),
    };

    strategy = new JwtStrategy(
      configService as unknown as ConfigService,
      usersService as unknown as UsersService,
    );
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  it('should throw an error if JWT_SECRET is missing', () => {
    const invalidConfigService = {
      get: jest.fn().mockReturnValue(undefined),
    };

    expect(() => {
      new JwtStrategy(
        invalidConfigService as unknown as ConfigService,
        usersService as unknown as UsersService,
      );
    }).toThrow('FATAL: JWT_SECRET environment variable is missing');
  });

  it('should return safe user if user is found', async () => {
    const safeUser = {
      id: 'user-1',
      email: 'student@example.com',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    usersService.findById.mockResolvedValue(safeUser);

    const result = await strategy.validate({
      sub: 'user-1',
      email: 'student@example.com',
    });

    expect(usersService.findById).toHaveBeenCalledWith('user-1');
    expect(result).toEqual(safeUser);
  });

  it('should throw UnauthorizedException if user is not found', async () => {
    usersService.findById.mockResolvedValue(null);

    await expect(
      strategy.validate({
        sub: 'nonexistent-user',
        email: 'student@example.com',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });
});
