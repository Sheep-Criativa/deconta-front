import api from "@/services/api";

export type TransactionType = "INCOME" | "EXPENSE" | "TRANSFER" | "ADJUSTMENT";
export type TransactionStatus = "PENDING" | "CONFIRMED" | "RECONCILED";

export interface RecurrenceTemplateData {
  description: string;
  amount: number;
  accountId: number;
  categoryId: number;
  type: TransactionType;
  status: TransactionStatus;
  tags?: string[];
  responsibleId?: number;
}

export interface CreateRecurrenceDTO {
  ruleRrule: string;
  templateData: RecurrenceTemplateData;
  active?: boolean;
}

export interface Recurrence {
  id: number;
  userId: number;
  ruleRrule: string;
  templateData: RecurrenceTemplateData;
  lastGeneratedDate: string | null;
  active: boolean;
}

export async function getRecurrences(userId: number): Promise<Recurrence[]> {
  const response = await api.get(`/recurrences/${userId}`);
  return response.data;
}

export async function createRecurrence(data: CreateRecurrenceDTO): Promise<Recurrence> {
  const response = await api.post("/recurrences", data);
  return response.data;
}

export async function deleteRecurrence(id: number): Promise<void> {
  await api.delete(`/recurrences/${id}`);
}
