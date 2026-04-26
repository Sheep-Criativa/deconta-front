import api from "@/services/api";

export type TransactionType = "INCOME" | "EXPENSE" | "TRANSFER" | "ADJUSTMENT";
export type TransactionStatus = "PENDING" | "CONFIRMED" | "RECONCILED";

export interface RecurrenceTemplateData {
  description: string;
  amount: number;
  accountId: number;
  type: TransactionType;
  status?: TransactionStatus;
  categoryId?: number;
  responsibleId?: number;
  notes?: string;
}

export interface CreateRecurrenceDTO {
  ruleRrule: string;
  templateData: RecurrenceTemplateData;
  active?: boolean;
  userId?: number;
}

export interface UpdateRecurrenceDTO {
  ruleRrule?: string;
  templateData?: Partial<RecurrenceTemplateData>;
  active?: boolean;
  userId?: number;
}

export interface Recurrence {
  id: number;
  userId: number;
  ruleRrule: string;
  templateData: RecurrenceTemplateData;
  lastGeneratedDate: string | null;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

function normalizeRecurrenceListPayload(payload: unknown): Recurrence[] {
  if (Array.isArray(payload)) return payload as Recurrence[];
  if (payload && typeof payload === "object" && "data" in payload) {
    const nested = (payload as { data?: unknown }).data;
    if (Array.isArray(nested)) return nested as Recurrence[];
  }
  return [];
}

export async function getRecurrences(userId?: number): Promise<Recurrence[]> {
  const response = await api.get("/recurrences", {
    params: userId ? { userId } : undefined,
  });
  return normalizeRecurrenceListPayload(response.data);
}

export async function getRecurrenceById(id: number): Promise<Recurrence> {
  const response = await api.get(`/recurrences/${id}`);
  return response.data;
}

export async function createRecurrence(
  data: CreateRecurrenceDTO,
): Promise<Recurrence> {
  const response = await api.post("/recurrences", data);
  return response.data;
}

export async function updateRecurrence(
  id: number,
  data: UpdateRecurrenceDTO,
): Promise<Recurrence> {
  const response = await api.put(`/recurrences/${id}`, data);
  return response.data;
}

export async function setRecurrenceActive(
  id: number,
  active: boolean,
): Promise<Recurrence> {
  const response = await api.patch(`/recurrences/${id}/active`, { active });
  return response.data;
}

export async function deleteRecurrence(id: number): Promise<void> {
  await api.delete(`/recurrences/${id}`);
}
