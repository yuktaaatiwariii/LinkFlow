import { apiRequest } from './api.client';
import { deleteAuthToken, saveAuthToken } from './token.storage';

export interface User {
  id: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}

export interface RegisterPayload {
  email: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export const authService = {
  async register(payload: RegisterPayload): Promise<AuthResponse> {
    const data = await apiRequest<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    await saveAuthToken(data.accessToken);
    return data;
  },

  async login(payload: LoginPayload): Promise<AuthResponse> {
    const data = await apiRequest<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    await saveAuthToken(data.accessToken);
    return data;
  },

  async getMe(): Promise<User> {
    return apiRequest<User>('/auth/me', { method: 'GET' }, true);
  },

  async logout(): Promise<void> {
    await deleteAuthToken();
  },
};
