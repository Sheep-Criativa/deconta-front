import api from "@/services/api";

export interface CreateReportPayload {
  userId: number;
  title: string;
  category: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  cause: string;
  stepToReproduce?: string;
  email?: string;
}

export async function createReport(data: CreateReportPayload): Promise<void> {
  await api.post("/report", data);
}
