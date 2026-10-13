import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLinkDto } from './dto/create-link.dto';
import { LinkResponseDto } from './dto/link-response.dto';
import { ListLinksQueryDto } from './dto/list-links-query.dto';
import {
  DEFAULT_SHORT_CODE_LENGTH,
  generateShortCode,
} from './utils/short-code.generator';

export const MAX_COLLISION_RETRIES = 5;

export interface PaginatedLinksResponse {
  data: LinkResponseDto[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

@Injectable()
export class LinksService {
  private readonly logger = new Logger(LinksService.name);
  private readonly baseUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    const rawBaseUrl =
      this.configService.get<string>('APP_BASE_URL') || 'http://localhost:3000';
    this.baseUrl = rawBaseUrl.replace(/\/+$/, '');
  }

  /**
   * Helper function to build the full short URL and map Link model to LinkResponseDto.
   */
  private formatLinkResponse(link: {
    id: string;
    shortCode: string;
    originalUrl: string;
    clickCount: number;
    createdAt: Date;
    expiresAt: Date | null;
  }): LinkResponseDto {
    return {
      id: link.id,
      shortCode: link.shortCode,
      shortUrl: `${this.baseUrl}/${link.shortCode}`,
      originalUrl: link.originalUrl,
      clickCount: link.clickCount,
      createdAt: link.createdAt,
      expiresAt: link.expiresAt,
    };
  }

  /**
   * Creates a shortened link owned by the authenticated user.
   *
   * Generates a Base62 short code and safely handles database collisions
   * with a bounded retry limit.
   */
  async createLink(userId: string, dto: CreateLinkDto): Promise<LinkResponseDto> {
    let attempts = 0;

    while (attempts < MAX_COLLISION_RETRIES) {
      attempts++;
      const shortCode = generateShortCode(DEFAULT_SHORT_CODE_LENGTH);

      try {
        const createdLink = await this.prisma.link.create({
          data: {
            shortCode,
            originalUrl: dto.originalUrl,
            expiresAt: dto.expiresAt ?? null,
            userId,
          },
        });

        return this.formatLinkResponse(createdLink);
      } catch (error) {
        // Prisma P2002 error code denotes a Unique constraint violation
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          this.logger.warn(
            `Collision detected for shortCode "${shortCode}" on attempt ${attempts}/${MAX_COLLISION_RETRIES}. Retrying...`,
          );
          continue;
        }

        // Re-throw any unexpected database errors
        throw error;
      }
    }

    this.logger.error(
      `Exhausted short code generation retries (${MAX_COLLISION_RETRIES} attempts) without finding an unused code.`,
    );
    throw new InternalServerErrorException(
      'Unable to generate a unique short code. Please try again.',
    );
  }

  /**
   * Retrieves links owned by the authenticated user with pagination and newest-first sorting.
   */
  async getUserLinks(
    userId: string,
    query: ListLinksQueryDto,
  ): Promise<PaginatedLinksResponse> {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 20;
    const skip = (page - 1) * limit;

    const [links, total] = await Promise.all([
      this.prisma.link.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.link.count({
        where: { userId },
      }),
    ]);

    const formattedData = links.map((link) => this.formatLinkResponse(link));

    return {
      data: formattedData,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Retrieves a single link by its ID, strictly isolated to the authenticated user.
   * If the record does not exist or belongs to another user, returns 404 Not Found.
   */
  async getLinkById(userId: string, linkId: string): Promise<LinkResponseDto> {
    const link = await this.prisma.link.findFirst({
      where: {
        id: linkId,
        userId,
      },
    });

    if (!link) {
      throw new NotFoundException('Link not found');
    }

    return this.formatLinkResponse(link);
  }
}
