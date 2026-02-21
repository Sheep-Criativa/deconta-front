import api from "@/services/api";

export interface Category {
  id: number;
  userId: number;
  name: string;
  icon?: string | null;
  color?: string | null;
  parentCategoryId?: number | null;
  type: "INCOME" | "EXPENSE";
  createdAt: string;
  updatedAt: string;
}

export interface CreateCategoryDTO {
  userId: number;
  name: string;
  icon: string;
  color: string;
  parentCategoryId?: number;
  type: "INCOME" | "EXPENSE";
}

export interface UpdateCategoryDTO {
  userId: number;
  name?: string;
  icon?: string;
  color?: string;
  parentCategoryId?: number;
  type?: "INCOME" | "EXPENSE";
}

export async function getCategories(userId: number): Promise<Category[]> {
  const response = await api.get(`/categories/${userId}`);
  return response.data;
}

export async function createCategory(data: CreateCategoryDTO): Promise<Category> {
  const response = await api.post("/categories", data);
  return response.data;
}

export async function updateCategory(id: number, data: UpdateCategoryDTO): Promise<Category> {
  const response = await api.put(`/categories/${id}`, data);
  return response.data;
}

export async function deleteCategory(id: number, userId: number): Promise<void> {
  await api.delete(`/categories/${id}`, { data: { userId } });
}
