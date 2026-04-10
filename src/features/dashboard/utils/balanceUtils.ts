import { type Account, AccountType } from "../services/account.service";
import { type Transaction } from "../services/transaction.service";

/**
 * Computes the REAL balance for an account:
 * Only CONFIRMED (and RECONCILED) transactions count.
 * PENDING transactions are excluded — they haven't actually moved money yet.
 *
 * realBalance = initialBalance
 *             + Σ(CONFIRMED/RECONCILED INCOME for this account)
 *             - Σ(CONFIRMED/RECONCILED EXPENSE for this account)
 */
export function computeRealBalance(account: Account, transactions: Transaction[]): number {
  const confirmed = transactions.filter(
    tx => tx.accountId === account.id &&
          (tx.status.trim() === "CONFIRMED" || tx.status.trim() === "RECONCILED")
  );
  const income  = confirmed.filter(tx => tx.type.trim() === "INCOME").reduce((s, tx) => s + Number(tx.amount), 0);
  const expense = confirmed.filter(tx => tx.type.trim() === "EXPENSE").reduce((s, tx) => s + Number(tx.amount), 0);
  return Number(account.initialBalance) + income - expense;
}

/**
 * Computes the SIMULATED balance for an account:
 * Includes ALL transactions (CONFIRMED + PENDING + RECONCILED).
 * Shows what the balance WOULD be if all pending items go through.
 */
export function computeSimulatedBalance(account: Account, transactions: Transaction[]): number {
  const acctTxs = transactions.filter(tx => tx.accountId === account.id);
  const income  = acctTxs.filter(tx => tx.type.trim() === "INCOME").reduce((s, tx) => s + Number(tx.amount), 0);
  const expense = acctTxs.filter(tx => tx.type.trim() === "EXPENSE").reduce((s, tx) => s + Number(tx.amount), 0);
  return Number(account.initialBalance) + income - expense;
}

/**
 * Legacy alias — resolves to real balance (CONFIRMED only) for backward compat.
 */
export function computeBalance(account: Account, transactions: Transaction[]): number {
  return computeRealBalance(account, transactions);
}

/**
 * Builds a map of accountId → REAL balance (CONFIRMED only).
 */
export function buildBalanceMap(accounts: Account[], transactions: Transaction[]): Map<number, number> {
  const map = new Map<number, number>();
  for (const acc of accounts) {
    map.set(acc.id, computeRealBalance(acc, transactions));
  }
  return map;
}

/**
 * Builds a map of accountId → SIMULATED balance (all statuses).
 */
export function buildSimulatedBalanceMap(accounts: Account[], transactions: Transaction[]): Map<number, number> {
  const map = new Map<number, number>();
  for (const acc of accounts) {
    map.set(acc.id, computeSimulatedBalance(acc, transactions));
  }
  return map;
}

/**
 * Total REAL balance (CONFIRMED only) across all non-credit-card accounts.
 */
export function computeTotalBalance(accounts: Account[], transactions: Transaction[]): number {
  return accounts
    .filter(a => a.type.trim() !== AccountType.CREDIT_CARD)
    .reduce((s, a) => s + computeRealBalance(a, transactions), 0);
}

/**
 * Total SIMULATED balance (CONFIRMED + PENDING) across all non-credit-card accounts.
 */
export function computeTotalSimulatedBalance(accounts: Account[], transactions: Transaction[]): number {
  return accounts
    .filter(a => a.type.trim() !== AccountType.CREDIT_CARD)
    .reduce((s, a) => s + computeSimulatedBalance(a, transactions), 0);
}
