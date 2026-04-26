export type TransactionSubmitMode =
  | "UPDATE_TRANSACTION"
  | "CREATE_TRANSACTION"
  | "CREATE_RECURRENCE";

interface DecideTransactionSubmitModeInput {
  isEditMode: boolean;
  recurring: boolean;
}

export function decideTransactionSubmitMode({
  isEditMode,
  recurring,
}: DecideTransactionSubmitModeInput): TransactionSubmitMode {
  if (isEditMode) {
    return "UPDATE_TRANSACTION";
  }

  if (recurring) {
    return "CREATE_RECURRENCE";
  }

  return "CREATE_TRANSACTION";
}
