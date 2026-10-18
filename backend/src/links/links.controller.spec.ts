import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { LinksController } from './links.controller';
import { LinksService } from './links.service';
import { CreateLinkDto } from './dto/create-link.dto';
import { ListLinksQueryDto } from './dto/list-links-query.dto';

describe('LinksController', () => {
  let controller: LinksController;
  let mockLinksService: {
    createLink: jest.Mock<(...args: any[]) => Promise<any>>;
    getUserLinks: jest.Mock<(...args: any[]) => Promise<any>>;
    getLinkById: jest.Mock<(...args: any[]) => Promise<any>>;
    deleteLink: jest.Mock<(...args: any[]) => Promise<any>>;
  };

  const dummyUser = {
    id: 'user-cuid-123',
    email: 'test@example.com',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRequest = {
    user: dummyUser,
  } as any;

  beforeEach(() => {
    mockLinksService = {
      createLink: jest.fn(),
      getUserLinks: jest.fn(),
      getLinkById: jest.fn(),
      deleteLink: jest.fn(),
    };

    controller = new LinksController(
      mockLinksService as unknown as LinksService,
    );
  });

  describe('create', () => {
    it('should delegate link creation with authenticated user id and dto to LinksService', async () => {
      const dto: CreateLinkDto = {
        originalUrl: 'https://example.com/target',
      };
      const expectedResponse = {
        id: 'link-1',
        shortCode: 'abc123',
        shortUrl: 'http://localhost:3000/abc123',
        originalUrl: dto.originalUrl,
        clickCount: 0,
        createdAt: new Date(),
        expiresAt: null,
      };

      mockLinksService.createLink.mockResolvedValue(expectedResponse);

      const result = await controller.create(mockRequest, dto);

      expect(mockLinksService.createLink).toHaveBeenCalledWith(
        dummyUser.id,
        dto,
      );
      expect(result).toBe(expectedResponse);
    });
  });

  describe('findAll', () => {
    it('should delegate user link listing to LinksService', async () => {
      const query: ListLinksQueryDto = { page: 1, limit: 10 };
      const expectedResponse = {
        data: [],
        meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
      };

      mockLinksService.getUserLinks.mockResolvedValue(expectedResponse);

      const result = await controller.findAll(mockRequest, query);

      expect(mockLinksService.getUserLinks).toHaveBeenCalledWith(
        dummyUser.id,
        query,
      );
      expect(result).toBe(expectedResponse);
    });
  });

  describe('findOne', () => {
    it('should delegate single link retrieval to LinksService', async () => {
      const linkId = 'link-cuid-1';
      const expectedResponse = {
        id: linkId,
        shortCode: 'code1',
        shortUrl: 'http://localhost:3000/code1',
        originalUrl: 'https://example.com',
        clickCount: 0,
        createdAt: new Date(),
        expiresAt: null,
      };

      mockLinksService.getLinkById.mockResolvedValue(expectedResponse);

      const result = await controller.findOne(mockRequest, linkId);

      expect(mockLinksService.getLinkById).toHaveBeenCalledWith(
        dummyUser.id,
        linkId,
      );
      expect(result).toBe(expectedResponse);
    });
  });

  describe('delete', () => {
    it('should delegate link deletion with authenticated user id and link id to LinksService', async () => {
      const linkId = 'link-to-delete-123';
      mockLinksService.deleteLink.mockResolvedValue(undefined);

      await controller.delete(mockRequest, linkId);

      expect(mockLinksService.deleteLink).toHaveBeenCalledWith(
        dummyUser.id,
        linkId,
      );
    });
  });
});
