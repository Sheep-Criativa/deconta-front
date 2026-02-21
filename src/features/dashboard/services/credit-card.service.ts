import api from "@/services/api";

export type StatementStatus = "OPEN" | "CLOSED" | "PAID" | "PARTIALLY_PAID";

export interface Statement {
  id: number;
  accountId: number;
  startDate: string;
  endDate: string;
  dueDate: string;
  status: StatementStatus;
  totalAmount: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface StatementPaymentDTO {
  paymentAccountId: number;
  amount: number;
  date: Date;
}

export async function getStatements(accountId: number): Promise<Statement[]> {
  const response = await api.get(`/statements/${accountId}`);
  return response.data;
}

export async function updateStatementStatus(id: number, accountId: number, status: StatementStatus) {
  const response = await api.put(`/statements/${id}`, {
    accountId,
    status
  });
  return response.data;
}

// Helper to calculate summary data based on accounts and statements
export function calculateCardStats(account: any, statements: Statement[]) {
  const limit = account.limitAmount || 0;
  const currentStatement = statements.find(s => s.status === "OPEN")?.totalAmount || 0;
  const availableLimit = limit - currentStatement; // Simplification, usually it takes all unpaid into account
  
  return {
    limit,
    currentStatement,
    availableLimit
  };
}
