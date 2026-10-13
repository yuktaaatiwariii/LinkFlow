import { apiRequest } from './api.client';

export interface LinkItem {
  id: string;
  shortCode: string;
  shortUrl: string;
  originalUrl: string;
  clickCount: number;
  createdAt: string;
  expiresAt: string | null;
}

export interface PaginatedLinks {
  data: LinkItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface CreateLinkPayload {
  originalUrl: string;
  expiresAt?: string;
}

export const linksService = {
  async createLink(payload: CreateLinkPayload): Promise<LinkItem> {
    return apiRequest<LinkItem>(
      '/links',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      true,
    );
  },

  async getMyLinks(page: number = 1, limit: number = 20): Promise<PaginatedLinks> {
    return apiRequest<PaginatedLinks>(
      `/links?page=${page}&limit=${limit}`,
      { method: 'GET' },
      true,
    );
  },

  async getLinkById(id: string): Promise<LinkItem> {
    return apiRequest<LinkItem>(`/links/${id}`, { method: 'GET' }, true);
  },
};
