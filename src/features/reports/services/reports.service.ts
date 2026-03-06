import api from '@/services/api';
import { z } from 'zod';

// Interfaces for Response Types based on backend logic
export interface GetSummaryResponse {
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
  countTransactions: number;
}

export interface GetByCategoryResponse {
  categoryId: number | null;
  categoryName: string;
  total: number;
  count: number;
}

export interface GetByResponsibleResponse {
  responsibleId: number | null;
  responsibleName: string;
  total: number;
  count: number;
}

export interface GetByAccountResponse {
  accountId: number | null;
  accountName: string;
  total: number;
  count: number;
}

// Zod Schema for the filter form (adapted from backend getReportSchema)
export const reportFilterSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  accountId: z.coerce.number().optional(),
  categoryId: z.coerce.number().optional(),
  responsibleId: z.coerce.number().optional(),
  type: z.enum(["INCOME", "EXPENSE", "TRANSFER", "ADJUSTMENT"]).optional(),
  status: z.enum(["PENDING", "CONFIRMED", "RECONCILED"]).optional(),
});

export type ReportFilterFilters = z.infer<typeof reportFilterSchema>;

// Shared service function to build query string
function buildQueryString(filters?: ReportFilterFilters): string {
  if (!filters) return '';
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.append(key, String(value));
    }
  });

  const query = params.toString();
  return query ? `?${query}` : '';
}

// Service Hooks / Calls
export async function getSummaryReport(userId: number, filters?: ReportFilterFilters): Promise<GetSummaryResponse> {
  const query = buildQueryString(filters);
  const response = await api.get(`/reports/summary/${userId}${query}`);
  return response.data;
}

export async function getByCategoryReport(userId: number, filters?: ReportFilterFilters): Promise<GetByCategoryResponse[]> {
  const query = buildQueryString(filters);
  const response = await api.get(`/reports/by-category/${userId}${query}`);
  return response.data;
}

export async function getByResponsibleReport(userId: number, filters?: ReportFilterFilters): Promise<GetByResponsibleResponse[]> {
  const query = buildQueryString(filters);
  const response = await api.get(`/reports/by-responsible/${userId}${query}`);
  return response.data;
}

export async function getByAccountReport(userId: number, filters?: ReportFilterFilters): Promise<GetByAccountResponse[]> {
  const query = buildQueryString(filters);
  const response = await api.get(`/reports/by-account/${userId}${query}`);
  return response.data;
}

export async function downloadPdfReport(userId: number, payload: any): Promise<Blob> {
  
  const response = await api.post(
    `/reports/download-pdf/${userId}`,
    payload,
    { responseType: "blob" }
  );

  return response.data;
}