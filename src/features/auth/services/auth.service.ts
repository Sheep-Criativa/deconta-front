import api from '@/services/api';

export interface RegisterData {
  name: string;
  email: string;
  passwordHash: string;
}

export async function registerUser(data: RegisterData) {
  const response = await api.post('/users', data);
  return response.data;
}

export async function loginUser(email: string, passwordHash: string) {
  const response = await api.post('/auth/login', { email, passwordHash });
  return response.data;
}

export interface User {
  id: number;
  name: string;
  email: string;
}

export async function getMe(): Promise<User> {
  const response = await api.get('/auth/me');
  return response.data;
}

export async function logoutUser() {
  await api.post('/auth/logout');
}