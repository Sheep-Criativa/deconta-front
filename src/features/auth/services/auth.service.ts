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