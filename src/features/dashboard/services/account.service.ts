import api from "@/services/api";

export const AccountType = {
  CHECKING: "CHECKING",
  CREDIT_CARD: "CREDIT_CARD",
  CASH: "CASH",
  INVESTMENT: "INVESTMENT",
} as const;

export type AccountType = typeof AccountType[keyof typeof AccountType];

export interface Account {
  id: number;
  userId: number;
  name: string;
  type: AccountType;
  initialBalance: number;
  currentBalance: number;
  currencyCode: string;
  closingDay?: string | null;
  dueDay?: string | null; // Date string from API
  limitAmount?: number | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateAccountDTO {
  userId: number;
  name: string;
  type: AccountType;
  initialBalance: number;
  currentBalance: number;
  currencyCode: string;
  closingDay?: string | null;
  dueDay?: Date | null;
  limitAmount?: number | null;
  isActive?: boolean;
}

export interface UpdateAccountDTO extends Partial<CreateAccountDTO> {}

export async function getAccounts(userId: number): Promise<Account[]> {
  const response = await api.get(`/accounts/${userId}`);
  return response.data;
}

export async function createAccount(data: CreateAccountDTO): Promise<Account> {
  const response = await api.post("/accounts", data);
  return response.data;
}

export async function updateAccount(id: number, data: UpdateAccountDTO): Promise<Account> {
  const response = await api.put(`/accounts/${id}`, data);
  return response.data;
}

export async function deleteAccount(id: number, userId: number): Promise<void> {
  const response = await api.delete(`/accounts/${id}`, {
    data: { userId }, // Delete schema requires userId in body
  });
  return response.data;
}
