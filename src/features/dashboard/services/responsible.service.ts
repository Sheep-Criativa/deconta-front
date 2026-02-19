import api from "@/services/api";

export interface Responsible {
  id: number;
  userId: number;
  name: string;
  color?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateResponsibleDTO {
  userId: number;
  name: string;
  color?: string | null;
  isActive?: boolean;
}

export interface UpdateResponsibleDTO {
  userId: number;
  name?: string;
  color?: string | null;
  isActive?: boolean;
}

export async function getResponsibles(userId: number): Promise<Responsible[]> {
  const response = await api.get(`/responsibles/${userId}`);
  return response.data;
}

export async function createResponsible(data: CreateResponsibleDTO): Promise<Responsible> {
  const response = await api.post("/responsibles", data);
  return response.data;
}

export async function updateResponsible(id: number, data: UpdateResponsibleDTO): Promise<Responsible> {
  const response = await api.put(`/responsibles/${id}`, data);
  return response.data;
}

export async function deleteResponsible(id: number, userId: number): Promise<void> {
  await api.delete(`/responsibles/${id}`, { data: { userId } });
}
