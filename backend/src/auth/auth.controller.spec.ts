import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: {
    register: jest.Mock<(...args: any[]) => Promise<any>>;
    login: jest.Mock<(...args: any[]) => Promise<any>>;
  };

  const mockSafeUser = {
    id: 'user-cuid-1',
    email: 'student@example.com',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    authService = {
      register: jest.fn(),
      login: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: authService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('register should invoke AuthService.register', async () => {
    authService.register.mockResolvedValue({
      accessToken: 'token-123',
      user: mockSafeUser,
    });

    const result = await controller.register({
      email: 'student@example.com',
      password: 'StrongPassword123',
    });

    expect(authService.register).toHaveBeenCalledWith({
      email: 'student@example.com',
      password: 'StrongPassword123',
    });
    expect(result.accessToken).toBe('token-123');
    expect(result.user).toEqual(mockSafeUser);
  });

  it('login should invoke AuthService.login', async () => {
    authService.login.mockResolvedValue({
      accessToken: 'token-456',
      user: mockSafeUser,
    });

    const result = await controller.login({
      email: 'student@example.com',
      password: 'StrongPassword123',
    });

    expect(authService.login).toHaveBeenCalledWith({
      email: 'student@example.com',
      password: 'StrongPassword123',
    });
    expect(result.accessToken).toBe('token-456');
    expect(result.user).toEqual(mockSafeUser);
  });

  it('getProfile should return current user from request', () => {
    const mockRequest = { user: mockSafeUser };
    const result = controller.getProfile(mockRequest as any);
    expect(result).toEqual(mockSafeUser);
  });
});
