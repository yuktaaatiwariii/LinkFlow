import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LinksService, MAX_COLLISION_RETRIES } from './links.service';

describe('LinksService', () => {
  let service: LinksService;
  let mockPrismaService: {
    link: {
      create: jest.Mock<(...args: any[]) => Promise<any>>;
      findMany: jest.Mock<(...args: any[]) => Promise<any>>;
      findFirst: jest.Mock<(...args: any[]) => Promise<any>>;
      count: jest.Mock<(...args: any[]) => Promise<any>>;
      delete: jest.Mock<(...args: any[]) => Promise<any>>;
    };
  };
  let mockConfigService: {
    get: jest.Mock<(...args: any[]) => any>;
  };

  const dummyUserId = 'user-cuid-123';
  const dummyLinkId = 'link-cuid-456';

  beforeEach(() => {
    mockPrismaService = {
      link: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        count: jest.fn(),
        delete: jest.fn(),
      },
    };

    mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'APP_BASE_URL') return 'http://localhost:3000';
        return undefined;
      }),
    };

    service = new LinksService(
      mockPrismaService as unknown as PrismaService,
      mockConfigService as unknown as ConfigService,
    );
  });

  describe('createLink', () => {
    it('should create and return a shortened link with correct attributes', async () => {
      const originalUrl = 'https://example.com/test-article';
      const expiresAt = new Date('2027-01-01T00:00:00.000Z');

      const mockDbLink = {
        id: dummyLinkId,
        shortCode: 'abc123',
        originalUrl,
        clickCount: 0,
        createdAt: new Date('2026-10-12T12:00:00.000Z'),
        expiresAt,
        userId: dummyUserId,
      };

      mockPrismaService.link.create.mockResolvedValue(mockDbLink);

      const result = await service.createLink(dummyUserId, {
        originalUrl,
        expiresAt,
      });

      expect(mockPrismaService.link.create).toHaveBeenCalledTimes(1);
      const createArgs = mockPrismaService.link.create.mock.calls[0][0] as { data: { userId: string; originalUrl: string; expiresAt: Date | null; shortCode: string } };
      expect(createArgs.data.userId).toBe(dummyUserId);
      expect(createArgs.data.originalUrl).toBe(originalUrl);
      expect(createArgs.data.expiresAt).toEqual(expiresAt);
      expect(createArgs.data.shortCode).toHaveLength(6);

      expect(result).toEqual({
        id: dummyLinkId,
        shortCode: 'abc123',
        shortUrl: 'http://localhost:3000/abc123',
        originalUrl,
        clickCount: 0,
        createdAt: mockDbLink.createdAt,
        expiresAt,
      });
    });

    it('should handle collision on first attempt and succeed on second attempt', async () => {
      const originalUrl = 'https://example.com/retry-test';
      const p2002Error = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed on the fields: (`shortCode`)',
        {
          code: 'P2002',
          clientVersion: '6.19.3',
        },
      );

      const mockSuccessfulLink = {
        id: dummyLinkId,
        shortCode: 'secondTryCode',
        originalUrl,
        clickCount: 0,
        createdAt: new Date(),
        expiresAt: null,
        userId: dummyUserId,
      };

      mockPrismaService.link.create
        .mockRejectedValueOnce(p2002Error)
        .mockResolvedValueOnce(mockSuccessfulLink);

      const result = await service.createLink(dummyUserId, {
        originalUrl,
      });

      expect(mockPrismaService.link.create).toHaveBeenCalledTimes(2);
      expect(result.shortCode).toBe('secondTryCode');
      expect(result.shortUrl).toBe('http://localhost:3000/secondTryCode');
    });

    it('should throw InternalServerErrorException when collision retry limit is exhausted', async () => {
      const originalUrl = 'https://example.com/exhaust-retries';
      const p2002Error = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed on the fields: (`shortCode`)',
        {
          code: 'P2002',
          clientVersion: '6.19.3',
        },
      );

      mockPrismaService.link.create.mockRejectedValue(p2002Error);

      await expect(
        service.createLink(dummyUserId, { originalUrl }),
      ).rejects.toThrow(InternalServerErrorException);

      expect(mockPrismaService.link.create).toHaveBeenCalledTimes(
        MAX_COLLISION_RETRIES,
      );
    });

    it('should re-throw unexpected non-P2002 database errors immediately without retrying', async () => {
      const originalUrl = 'https://example.com/db-fail';
      const genericDbError = new Error('Database connection timed out');

      mockPrismaService.link.create.mockRejectedValue(genericDbError);

      await expect(
        service.createLink(dummyUserId, { originalUrl }),
      ).rejects.toThrow('Database connection timed out');

      expect(mockPrismaService.link.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('getUserLinks', () => {
    it('should return user links sorted newest first with pagination metadata', async () => {
      const mockLinks = [
        {
          id: 'link-1',
          shortCode: 'code1',
          originalUrl: 'https://example.com/1',
          clickCount: 5,
          createdAt: new Date('2026-10-12T14:00:00.000Z'),
          expiresAt: null,
          userId: dummyUserId,
        },
        {
          id: 'link-2',
          shortCode: 'code2',
          originalUrl: 'https://example.com/2',
          clickCount: 0,
          createdAt: new Date('2026-10-12T13:00:00.000Z'),
          expiresAt: null,
          userId: dummyUserId,
        },
      ];

      mockPrismaService.link.findMany.mockResolvedValue(mockLinks);
      mockPrismaService.link.count.mockResolvedValue(2);

      const result = await service.getUserLinks(dummyUserId, {
        page: 1,
        limit: 10,
      });

      expect(mockPrismaService.link.findMany).toHaveBeenCalledWith({
        where: { userId: dummyUserId },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 10,
      });
      expect(mockPrismaService.link.count).toHaveBeenCalledWith({
        where: { userId: dummyUserId },
      });

      expect(result.data).toHaveLength(2);
      expect(result.data[0].id).toBe('link-1');
      expect(result.data[0].shortUrl).toBe('http://localhost:3000/code1');
      expect(result.meta).toEqual({
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });

    it('should calculate skip offset properly for page 2', async () => {
      mockPrismaService.link.findMany.mockResolvedValue([]);
      mockPrismaService.link.count.mockResolvedValue(25);

      const result = await service.getUserLinks(dummyUserId, {
        page: 2,
        limit: 10,
      });

      expect(mockPrismaService.link.findMany).toHaveBeenCalledWith({
        where: { userId: dummyUserId },
        orderBy: { createdAt: 'desc' },
        skip: 10,
        take: 10,
      });
      expect(result.meta.totalPages).toBe(3);
    });
  });

  describe('getLinkById', () => {
    it('should return the link when found and owned by the requesting user', async () => {
      const mockLink = {
        id: dummyLinkId,
        shortCode: 'myCode',
        originalUrl: 'https://example.com/my-link',
        clickCount: 2,
        createdAt: new Date(),
        expiresAt: null,
        userId: dummyUserId,
      };

      mockPrismaService.link.findFirst.mockResolvedValue(mockLink);

      const result = await service.getLinkById(dummyUserId, dummyLinkId);

      expect(mockPrismaService.link.findFirst).toHaveBeenCalledWith({
        where: {
          id: dummyLinkId,
          userId: dummyUserId,
        },
      });
      expect(result.id).toBe(dummyLinkId);
      expect(result.shortCode).toBe('myCode');
      expect(result.shortUrl).toBe('http://localhost:3000/myCode');
    });

    it('should throw NotFoundException when link is not found or owned by another user', async () => {
      mockPrismaService.link.findFirst.mockResolvedValue(null);

      await expect(
        service.getLinkById(dummyUserId, 'non-existent-or-other-user-link'),
      ).rejects.toThrow(NotFoundException);

      expect(mockPrismaService.link.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'non-existent-or-other-user-link',
          userId: dummyUserId,
        },
      });
    });
  });

  describe('deleteLink', () => {
    it('should delete the link when found and owned by the requesting user', async () => {
      const mockLink = {
        id: dummyLinkId,
        userId: dummyUserId,
      };

      mockPrismaService.link.findFirst.mockResolvedValue(mockLink);
      mockPrismaService.link.delete.mockResolvedValue(mockLink);

      await service.deleteLink(dummyUserId, dummyLinkId);

      expect(mockPrismaService.link.findFirst).toHaveBeenCalledWith({
        where: {
          id: dummyLinkId,
          userId: dummyUserId,
        },
      });
      expect(mockPrismaService.link.delete).toHaveBeenCalledWith({
        where: { id: dummyLinkId },
      });
    });

    it('should throw NotFoundException and not delete when link is not found or owned by another user', async () => {
      mockPrismaService.link.findFirst.mockResolvedValue(null);

      await expect(
        service.deleteLink(dummyUserId, 'unauthorized-or-missing-id'),
      ).rejects.toThrow(NotFoundException);

      expect(mockPrismaService.link.delete).not.toHaveBeenCalled();
    });
  });
});
