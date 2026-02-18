import api from '@/services/api';

export interface UserData {
    name: string;
    email: string;
}

export async function getUserData() {
    const response = await api.get('/users');
    return response.data;
}