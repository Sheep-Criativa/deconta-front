import { type Account, AccountType } from "../services/account.service";
import { type Transaction } from "../services/transaction.service";

/**
 * Computes the real current balance for an account based on its transactions.
 *
 * balance = initialBalance
 *         + Σ(INCOME transactions for this account)
 *         - Σ(EXPENSE transactions for this account)
 *
 * This is necessary because the backend's `currentBalance` field is static
 * (set at account creation) and not updated when transactions are added.
 */
export function computeBalance(account: Account, transactions: Transaction[]): number {
  const acctTxs = transactions.filter(tx => tx.accountId === account.id);
  const income  = acctTxs.filter(tx => tx.type.trim() === "INCOME").reduce((s, tx) => s + Number(tx.amount), 0);
  const expense = acctTxs.filter(tx => tx.type.trim() === "EXPENSE").reduce((s, tx) => s + Number(tx.amount), 0);
  return Number(account.initialBalance) + income - expense;
}

/**
 * Builds a map of accountId → computed balance for fast lookups.
 */
export function buildBalanceMap(accounts: Account[], transactions: Transaction[]): Map<number, number> {
  const map = new Map<number, number>();
  for (const acc of accounts) {
    map.set(acc.id, computeBalance(acc, transactions));
  }
  return map;
}

/**
 * Computes the total non-credit-card balance (sum of all checking/cash/investment accounts).
 */
export function computeTotalBalance(accounts: Account[], transactions: Transaction[]): number {
  return accounts
    .filter(a => a.type.trim() !== AccountType.CREDIT_CARD)
    .reduce((s, a) => s + computeBalance(a, transactions), 0);
}
