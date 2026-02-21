import api from "@/services/api";

export type TransactionType = "INCOME" | "EXPENSE" | "TRANSFER" | "ADJUSTMENT";
export type TransactionStatus = "PENDING" | "CONFIRMED" | "RECONCILED";

export interface Transaction {
  id: number;
  userId: number;
  accountId: number;
  categoryId: number | null;
  responsibleId: number | null;
  description: string | null;
  amount: number;
  date: string;
  paymentDate: string | null;
  type: TransactionType;
  status: TransactionStatus;
  statementId: number | null;
  installmentNum: number | null;
  installmentTotal: number | null;
  parentTransactionId: number | null;
  recurrenceId: number | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateTransactionDTO {
  userId: number;
  accountId: number;
  categoryId: number;
  responsibleId: number;
  description?: string;
  amount: number;
  date: Date;
  paymentDate: Date;
  type: TransactionType;
  status: TransactionStatus;
  // Credit card only
  statementId?: number | null;
  installmentTotal?: number | null;
  parentTransactionId?: number | null;
  recurrenceId?: number | null;
}

export interface UpdateTransactionDTO {
  categoryId?: number;
  responsibleId?: number;
  description?: string;
  amount?: number;
  date?: Date;
  paymentDate?: Date;
  type?: TransactionType;
  status?: TransactionStatus;
}

export async function getTransactions(userId: number): Promise<Transaction[]> {
  const response = await api.get(`/transactions/${userId}`);
  return response.data;
}

export async function createTransaction(data: CreateTransactionDTO): Promise<Transaction | Transaction[]> {
  const response = await api.post("/transactions", data);
  return response.data;
}

export async function updateTransaction(id: number, data: UpdateTransactionDTO): Promise<Transaction> {
  const response = await api.put(`/transactions/${id}`, data);
  return response.data;
}

export async function deleteTransaction(id: number): Promise<void> {
  await api.delete(`/transactions/${id}`);
}
