import { rrulestr } from "rrule";

import type { Recurrence } from "../services/recurrence.service";
import type { Transaction } from "../services/transaction.service";

export interface ProjectedTransaction extends Transaction {
  isProjected: true;
  sourceRecurrenceId: number;
}

interface BuildProjectedTransactionsParams {
  recurrences: Recurrence[];
  existingTransactions: Transaction[];
  rangeStart: Date;
  rangeEnd: Date;
}

function normalizeRruleInput(ruleRrule: string): string {
  const raw = ruleRrule.trim();
  if (!raw) return "";

  const normalizedLines = raw
    .replace(/\\n/g, "\n")
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      if (line.startsWith("DTSTART")) return line;
      if (line.startsWith("RRULE:")) return line;
      if (line.includes("FREQ=")) return `RRULE:${line}`;
      return line;
    });

  return normalizedLines.join("\n");
}

function dayKeyFromIso(value: string): string {
  return value.slice(0, 10);
}

function dayKeyFromDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function toNoonUtcIso(value: Date): string {
  return new Date(
    Date.UTC(
      value.getUTCFullYear(),
      value.getUTCMonth(),
      value.getUTCDate(),
      12,
      0,
      0,
      0,
    ),
  ).toISOString();
}

function normalizeText(value: string | null | undefined): string {
  return (value || "").trim().toLowerCase();
}

function txFingerprint(params: {
  accountId: number;
  type: string;
  amount: number;
  description: string | null | undefined;
  dayKey: string;
}) {
  return [
    params.accountId,
    params.type.trim().toUpperCase(),
    Number(params.amount).toFixed(2),
    normalizeText(params.description),
    params.dayKey,
  ].join("|");
}

function getOccurrences(
  ruleRrule: string,
  rangeStart: Date,
  rangeEnd: Date,
): Date[] {
  try {
    const normalizedRule = normalizeRruleInput(ruleRrule);
    if (!normalizedRule) return [];

    const parsedRule = rrulestr(normalizedRule, { forceset: true });
    return parsedRule.between(rangeStart, rangeEnd, true);
  } catch {
    return [];
  }
}

export function buildProjectedTransactions({
  recurrences,
  existingTransactions,
  rangeStart,
  rangeEnd,
}: BuildProjectedTransactionsParams): ProjectedTransaction[] {
  if (rangeEnd < rangeStart) return [];

  const existingByRecurrenceAndDay = new Set<string>();
  const existingByFingerprint = new Set<string>();

  for (const tx of existingTransactions) {
    const txDay = dayKeyFromIso(tx.date);

    if (tx.recurrenceId) {
      existingByRecurrenceAndDay.add(`${tx.recurrenceId}|${txDay}`);
    }

    existingByFingerprint.add(
      txFingerprint({
        accountId: tx.accountId,
        type: tx.type,
        amount: Number(tx.amount),
        description: tx.description,
        dayKey: txDay,
      }),
    );
  }

  const generatedByRecurrenceAndDay = new Set<string>();
  const projected: ProjectedTransaction[] = [];

  let syntheticId = -1;

  for (const recurrence of recurrences) {
    if (!recurrence.active) continue;

    const template = recurrence.templateData;
    const accountId = Number(template.accountId);
    const amount = Number(template.amount);

    if (!Number.isFinite(accountId) || accountId <= 0) continue;
    if (!Number.isFinite(amount)) continue;

    const occurrences = getOccurrences(
      recurrence.ruleRrule,
      rangeStart,
      rangeEnd,
    );

    for (const occurrence of occurrences) {
      const dayKey = dayKeyFromDate(occurrence);
      const recurrenceDayKey = `${recurrence.id}|${dayKey}`;

      if (generatedByRecurrenceAndDay.has(recurrenceDayKey)) {
        continue;
      }

      if (existingByRecurrenceAndDay.has(recurrenceDayKey)) {
        continue;
      }

      const fingerprint = txFingerprint({
        accountId,
        type: template.type,
        amount,
        description: template.description,
        dayKey,
      });

      if (existingByFingerprint.has(fingerprint)) {
        continue;
      }

      generatedByRecurrenceAndDay.add(recurrenceDayKey);

      const isoDate = toNoonUtcIso(occurrence);

      projected.push({
        id: syntheticId,
        userId: recurrence.userId,
        accountId,
        categoryId: template.categoryId ?? null,
        responsibleId: template.responsibleId ?? null,
        description: template.description || "Lançamento recorrente",
        amount,
        date: isoDate,
        paymentDate: isoDate,
        type: template.type,
        status: "PENDING",
        statementId: null,
        installmentNum: null,
        installmentTotal: null,
        parentTransactionId: null,
        recurrenceId: recurrence.id,
        notes: template.notes ?? null,
        isProjected: true,
        sourceRecurrenceId: recurrence.id,
      });

      syntheticId -= 1;
    }
  }

  return projected.sort((a, b) => a.date.localeCompare(b.date));
}
