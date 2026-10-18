import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SafeUser } from '../users/users.service';
import { CreateLinkDto } from './dto/create-link.dto';
import { LinkResponseDto } from './dto/link-response.dto';
import { ListLinksQueryDto } from './dto/list-links-query.dto';
import { LinksService, PaginatedLinksResponse } from './links.service';

interface AuthenticatedRequest {
  user: SafeUser;
}

@Controller('links')
@UseGuards(JwtAuthGuard)
export class LinksController {
  constructor(private readonly linksService: LinksService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Request() req: AuthenticatedRequest,
    @Body() createLinkDto: CreateLinkDto,
  ): Promise<LinkResponseDto> {
    return this.linksService.createLink(req.user.id, createLinkDto);
  }

  @Get()
  async findAll(
    @Request() req: AuthenticatedRequest,
    @Query() query: ListLinksQueryDto,
  ): Promise<PaginatedLinksResponse> {
    return this.linksService.getUserLinks(req.user.id, query);
  }

  @Get(':id')
  async findOne(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<LinkResponseDto> {
    return this.linksService.getLinkById(req.user.id, id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<void> {
    return this.linksService.deleteLink(req.user.id, id);
  }
}
