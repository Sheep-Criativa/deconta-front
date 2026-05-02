import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ArrowDownCircle, ArrowUpCircle, CalendarDays, CheckCircle2, Clock3, CreditCard, Info, Landmark, Plus, Repeat, ShieldCheck } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";

import { getAccounts, type Account, AccountType } from "../services/account.service";
import { getCategories, type Category } from "../services/category.service";
import { getResponsibles, type Responsible } from "../services/responsible.service";
import { createTransaction, updateTransaction, type Transaction, type TransactionType, type TransactionStatus } from "../services/transaction.service";
import { createRecurrence, type CreateRecurrenceDTO } from "../services/recurrence.service";
import { CreateCategoryDialog } from "./CreateCategoryDialog";
import { CreateResponsibleDialog } from "./CreateResponsibleDialog";
import {
  buildRecurrenceRule,
  getRecurrencePreviewDates,
  recurrenceRuleSummary,
  toRRuleExpression,
  type RecurrenceEndMode,
  type RecurrenceFrequency,
  type RecurrenceRuleFormModel,
  validateRecurrenceRule,
  WEEKDAY_OPTIONS,
  type WeekdayId,
} from "../utils/recurrenceRule";
import { decideTransactionSubmitMode } from "../utils/transactionSubmitDecision";
import { toast } from "sonner";

const baseSchema = z.object({
  accountId: z.preprocess((val) => {
    const num = Number(val);
    return isNaN(num) ? 0 : num;
  }, z.number().min(0)),
  categoryId: z.coerce.number().min(0).optional(), // 0 = Sem categoria
  responsibleId: z.coerce.number().min(0).optional(), // 0 = Sem responsável
  description: z.string().max(250).optional(),
  amount: z.coerce.number().min(0.01, "Valor deve ser maior que zero"),
  date: z.string().min(1, "Selecione uma data"),
  paymentDate: z.string().min(1, "Selecione a data de pagamento"),
  type: z.enum(["INCOME", "EXPENSE", "TRANSFER", "ADJUSTMENT"]),
  status: z.enum(["PENDING", "CONFIRMED", "RECONCILED"]),
  // Credit card only
  installmentTotal: z.coerce.number().min(1).max(36).optional(),
  notes: z.string().max(1000).optional(),
  recurring: z.boolean().default(false),
  recurrenceFrequency: z.enum(["DAILY", "WEEKLY", "MONTHLY", "YEARLY"]).default("MONTHLY"),
  recurrenceInterval: z.coerce.number().int().min(1).max(365).default(1),
  recurrenceStartDate: z.string().optional(),
  recurrenceEndMode: z.enum(["NEVER", "UNTIL", "COUNT"]).default("NEVER"),
  recurrenceUntilDate: z.string().optional(),
  recurrenceCount: z.coerce.number().int().min(1).max(999).optional(),
  recurrenceByweekday: z.array(z.string()).default([]),
  recurrenceBymonthday: z.coerce.number().int().min(1).max(31).optional(),
});

const formSchema = baseSchema.superRefine((data, ctx) => {
  if (data.status !== "PENDING" && data.accountId === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Selecione uma conta",
      path: ["accountId"],
    });
  }
});

interface CreateTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  defaultType?: TransactionType;
  transaction?: Transaction;
  /** Pre-select (and lock) a specific account */
  defaultAccountId?: number;
  /** Show only credit-card accounts in the selector */
  onlyCreditCards?: boolean;
  /** Optionally pre-fill the form with a selected date */
  defaultDate?: Date;
}

export function CreateTransactionDialog({
  open,
  onOpenChange,
  onSuccess,
  defaultType = "EXPENSE",
  transaction,
  defaultAccountId,
  onlyCreditCards = false,
  defaultDate,
}: CreateTransactionDialogProps) {
  const isEditMode = !!transaction;
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [responsibles, setResponsibles] = useState<Responsible[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [isCatDialogOpen, setIsCatDialogOpen] = useState(false);
  const [isRespDialogOpen, setIsRespDialogOpen] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      type: defaultType,
      status: "CONFIRMED",
      date: format(new Date(), "yyyy-MM-dd"),
      paymentDate: format(new Date(), "yyyy-MM-dd"),
      categoryId: 0,
      responsibleId: 0,
      amount: "" as any,
      installmentTotal: 1,
      description: "",
      notes: "",
      recurring: false,
      recurrenceFrequency: "MONTHLY",
      recurrenceInterval: 1,
      recurrenceStartDate: format(new Date(), "yyyy-MM-dd"),
      recurrenceEndMode: "NEVER",
      recurrenceUntilDate: undefined,
      recurrenceCount: undefined,
      recurrenceByweekday: [],
      recurrenceBymonthday: new Date().getDate(),
    },
  });

  const transactionType = form.watch("type");
  const accountId = form.watch("accountId");
  const isRecurring = form.watch("recurring");
  const recurrenceFrequency = form.watch("recurrenceFrequency") as RecurrenceFrequency;
  const recurrenceEndMode = form.watch("recurrenceEndMode") as RecurrenceEndMode;
  const recurrenceStartDate = form.watch("recurrenceStartDate");
  const recurrenceByweekday = form.watch("recurrenceByweekday") as WeekdayId[];
  const recurrenceBymonthday = form.watch("recurrenceBymonthday");
  const recurrenceInterval = form.watch("recurrenceInterval");
  const recurrenceCount = form.watch("recurrenceCount");
  const recurrenceUntilDate = form.watch("recurrenceUntilDate");
  // CC context: explicit account lock, onlyCreditCards filter, or selected account is CC
  const isCreditCard = !!defaultAccountId || onlyCreditCards || selectedAccount?.type.trim() === AccountType.CREDIT_CARD;

  const recurrenceModel = useMemo<RecurrenceRuleFormModel>(() => {
    const startDate = recurrenceStartDate || form.getValues("date");
    const startDay = Number(startDate?.split("-")[2]);
    const monthlyDay = Number(recurrenceBymonthday ?? startDay);

    return {
      frequency: recurrenceFrequency,
      interval: Math.max(1, Number(recurrenceInterval) || 1),
      startDate,
      endMode: recurrenceEndMode,
      untilDate: recurrenceEndMode === "UNTIL" ? recurrenceUntilDate : undefined,
      count: recurrenceEndMode === "COUNT" ? recurrenceCount : undefined,
      byweekday: recurrenceFrequency === "WEEKLY" ? recurrenceByweekday : [],
      bymonthday:
        recurrenceFrequency === "MONTHLY" && monthlyDay >= 1 && monthlyDay <= 31
          ? monthlyDay
          : undefined,
    };
  }, [
    recurrenceFrequency,
    recurrenceInterval,
    recurrenceStartDate,
    recurrenceEndMode,
    recurrenceUntilDate,
    recurrenceCount,
    recurrenceByweekday,
    recurrenceBymonthday,
    form,
  ]);

  const recurrenceRule = useMemo(() => {
    if (!isRecurring || isEditMode) return "";
    try {
      return buildRecurrenceRule(recurrenceModel);
    } catch {
      return "";
    }
  }, [isRecurring, isEditMode, recurrenceModel]);

  const recurrenceRuleExpression = useMemo(() => {
    if (!recurrenceRule) return "";
    try {
      return toRRuleExpression(recurrenceRule);
    } catch {
      return "";
    }
  }, [recurrenceRule]);

  const recurrencePreviewDates = useMemo(() => {
    if (!recurrenceRule) return [];
    return getRecurrencePreviewDates(recurrenceRule, 4);
  }, [recurrenceRule]);

  const recurrenceSummaryText = useMemo(() => {
    if (!recurrenceRule) return "";
    return recurrenceRuleSummary(recurrenceModel);
  }, [recurrenceRule, recurrenceModel]);

  // Load select options
  useEffect(() => {
    if (!user || !open) return;
    Promise.all([
      getAccounts(user.id),
      getCategories(user.id),
      getResponsibles(user.id),
    ]).then(async ([accs, cats, resps]) => {
      const activeAccs = accs.filter(a => a.isActive);
      setAccounts(
        onlyCreditCards
          ? activeAccs.filter(a => a.type.trim() === AccountType.CREDIT_CARD)
          : activeAccs
      );
      setCategories(cats);
      
      let activeResps = resps.filter(r => r.isActive);
      
      // If user has NO responsibles at all, auto-create one named "Eu" or their name
      if (activeResps.length === 0) {
        try {
          const { createResponsible } = await import("../services/responsible.service");
          const defaultName = user.name ? user.name.split(" ")[0] : "Eu";
          const newResp = await createResponsible({
            userId: user.id,
            name: defaultName,
            color: "#6366f1"
          });
          activeResps = [newResp];
        } catch (e) {
          console.error("Auto-create fallback responsible failed", e);
        }
      }
      
      setResponsibles(activeResps);
      
      // Auto-select: prefer the responsible whose name matches the logged-in user,
      // otherwise fall back to the first one.
      if (!transaction && activeResps.length > 0) {
        const userName = user.name?.trim().toLowerCase() ?? "";
        const selfResp = activeResps.find(
          r => r.name.trim().toLowerCase() === userName
        ) ?? activeResps[0];
        form.setValue("responsibleId", selfResp.id);
      }
    });
  }, [user, open, onlyCreditCards]);

  // Track selected account object to detect CREDIT_CARD
  useEffect(() => {
    const acc = accounts.find(a => a.id === Number(accountId)) ?? null;
    setSelectedAccount(acc);
  }, [accountId, accounts]);

  useEffect(() => {
    if (open) {
      if (transaction) {
        form.reset({
          accountId: transaction.accountId,
          categoryId: transaction.categoryId ?? 0,
          responsibleId: transaction.responsibleId ?? 0,
          type: transaction.type.trim() as TransactionType,
          status: transaction.status.trim() as TransactionStatus,
          date: transaction.date.split("T")[0],
          paymentDate: (transaction.paymentDate ?? transaction.date).split("T")[0],
          amount: Number(transaction.amount),
          installmentTotal: transaction.installmentTotal ?? 1,
          description: transaction.description ?? "",
          notes: transaction.notes ?? "",
          recurring: false,
          recurrenceFrequency: "MONTHLY",
          recurrenceInterval: 1,
          recurrenceStartDate: transaction.date.split("T")[0],
          recurrenceEndMode: "NEVER",
          recurrenceUntilDate: undefined,
          recurrenceCount: undefined,
          recurrenceByweekday: [],
          recurrenceBymonthday: Number(transaction.date.split("T")[0].split("-")[2]),
        });
      } else {
        const baseDate = defaultDate ? format(defaultDate, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd");
        form.reset({
          type: defaultType,
          status: "CONFIRMED",
          date: baseDate,
          paymentDate: baseDate,
          categoryId: 0,
          responsibleId: 0,
          amount: "" as any,
          installmentTotal: 1,
          description: "",
          notes: "",
          recurring: false,
          recurrenceFrequency: "MONTHLY",
          recurrenceInterval: 1,
          recurrenceStartDate: baseDate,
          recurrenceEndMode: "NEVER",
          recurrenceUntilDate: undefined,
          recurrenceCount: undefined,
          recurrenceByweekday: [],
          recurrenceBymonthday: Number(baseDate.split("-")[2]),
          // Pre-select the account if provided
          ...(defaultAccountId ? { accountId: defaultAccountId } : {}),
        });
        setSelectedAccount(null);
      }
    }
  }, [open, defaultType, transaction, defaultAccountId, defaultDate]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user) return;
    setLoading(true);
    try {
      // Fallback Categoria para evitar erro 500
      let resolvedCategoryId = values.categoryId;
      if (!resolvedCategoryId || resolvedCategoryId === 0) {
        const catType = (values.type === "INCOME") ? "INCOME" : "EXPENSE";
        const existingCat = categories.find(
          c => c.name.trim().toLowerCase() === "geral" && c.type.trim() === catType
        );
        if (existingCat) {
          resolvedCategoryId = existingCat.id;
        } else {
          try {
            const { createCategory } = await import("../services/category.service");
            const createdCat = await createCategory({
              userId: user.id,
              name: "Geral",
              icon: "Tag",
              color: "#64748b",
              type: catType,
            });
            resolvedCategoryId = createdCat.id;
            setCategories(prev => [...prev, createdCat]);
          } catch (createErr) {
            // Se o backend retornar erro pois já existe (causando até crash de headers sent)
            // refazemos o fetch das categorias para ver se o registro apareceu.
            const { getCategories } = await import("../services/category.service");
            const freshCats = await getCategories(user.id);
            setCategories(freshCats);
            const foundCat = freshCats.find(c => c.name.trim().toLowerCase() === "geral" && c.type.trim() === catType);
            if (foundCat) {
              resolvedCategoryId = foundCat.id;
            } else {
              throw createErr;
            }
          }
        }
      }

      // Fallback Responsável para evitar erro 500
      let resolvedRespId = values.responsibleId;
      if (!resolvedRespId || resolvedRespId === 0) {
        const userName = user.name ? user.name.split(" ")[0] : "Eu";
        const existingResp = responsibles.find(
          r => r.name.trim().toLowerCase() === userName.toLowerCase()
        );
        if (existingResp) {
          resolvedRespId = existingResp.id;
        } else {
          try {
            const { createResponsible } = await import("../services/responsible.service");
            const createdResp = await createResponsible({
              userId: user.id,
              name: userName,
              color: "#6366f1"
            });
            resolvedRespId = createdResp.id;
            setResponsibles(prev => [...prev, createdResp]);
          } catch (createErr) {
            // Repetimos o processo para o responsável
            const { getResponsibles } = await import("../services/responsible.service");
            const freshResps = await getResponsibles(user.id);
            const activeFreshResps = freshResps.filter(r => r.isActive);
            setResponsibles(activeFreshResps);
            const foundResp = activeFreshResps.find(r => r.name.trim().toLowerCase() === userName.toLowerCase());
            if (foundResp) {
              resolvedRespId = foundResp.id;
            } else {
              throw createErr;
            }
          }
        }
      }

      const submitDate = values.date;
      const submitPaymentDate = isCreditCard ? values.date : values.paymentDate;
      const shouldSplitInstallments = isCreditCard && !values.recurring && (values.installmentTotal ?? 1) > 1;
      const finalAmount = shouldSplitInstallments
        ? Number((values.amount / (values.installmentTotal ?? 1)).toFixed(2))
        : values.amount;

      const baseDate = new Date(submitDate + "T12:00:00");
      const basePaymentDate = new Date(submitPaymentDate + "T12:00:00");

      const submitMode = decideTransactionSubmitMode({
        isEditMode,
        recurring: values.recurring,
      });

      if (submitMode === "UPDATE_TRANSACTION" && transaction) {
        await updateTransaction(transaction.id, {
          userId: user.id,
          accountId: values.accountId === 0 ? null : values.accountId,
          categoryId: resolvedCategoryId,
          responsibleId: resolvedRespId,
          description: values.description || undefined,
          amount: finalAmount,
          date: baseDate,
          paymentDate: basePaymentDate,
          type: values.type as TransactionType,
          status: isCreditCard ? "CONFIRMED" : values.status as TransactionStatus,
          notes: values.notes || undefined,
        });
        toast.success("Transação atualizada!");
      } else if (submitMode === "CREATE_RECURRENCE") {
        if (recurrenceModel.frequency === "WEEKLY" && recurrenceModel.byweekday.length === 0) {
          toast.error("Selecione pelo menos um dia da semana para a recorrência.");
          return;
        }

        if (recurrenceModel.frequency === "MONTHLY" && !recurrenceModel.bymonthday) {
          toast.error("Selecione o dia do mês para a recorrência mensal.");
          return;
        }

        if (recurrenceModel.endMode === "UNTIL" && !recurrenceModel.untilDate) {
          toast.error("Informe a data final da recorrência.");
          return;
        }

        if (recurrenceModel.endMode === "COUNT" && !recurrenceModel.count) {
          toast.error("Informe a quantidade de ocorrências da recorrência.");
          return;
        }

        const builtRule = buildRecurrenceRule(recurrenceModel);
        const validationError = validateRecurrenceRule(builtRule);
        if (validationError) {
          toast.error(`RRULE inválida: ${validationError}`);
          return;
        }

        const payload: CreateRecurrenceDTO = {
          ruleRrule: builtRule,
          templateData: {
            accountId: values.accountId === 0 ? null : values.accountId,
            categoryId: resolvedCategoryId && resolvedCategoryId > 0 ? resolvedCategoryId : undefined,
            responsibleId: resolvedRespId && resolvedRespId > 0 ? resolvedRespId : undefined,
            description: (values.description || "Lançamento recorrente").trim(),
            amount: Number(values.amount),
            type: values.type as TransactionType,
            status: isCreditCard ? "CONFIRMED" : values.status as TransactionStatus,
            notes: values.notes?.trim() || undefined,
          },
          active: true,
        };

        const createdRecurrence = await createRecurrence(payload);
        const generatedNow = Boolean((createdRecurrence as { generatedNow?: boolean }).generatedNow);
        toast.success(
          generatedNow
            ? "Recorrência criada e uma transação foi gerada imediatamente."
            : "Recorrência criada com sucesso!"
        );
      } else {
        await createTransaction({
          userId: user.id,
          accountId: values.accountId === 0 ? null : values.accountId,
          categoryId: resolvedCategoryId!,
          responsibleId: resolvedRespId!,
          description: values.description || undefined,
          amount: finalAmount,
          date: baseDate,
          paymentDate: basePaymentDate,
          type: values.type as TransactionType,
          status: isCreditCard ? "CONFIRMED" : values.status as TransactionStatus,
          notes: values.notes || undefined,
          ...(isCreditCard && {
            installmentTotal: values.installmentTotal ?? 1,
          }),
        });
        toast.success(
          isCreditCard && (values.installmentTotal ?? 1) > 1
            ? `${values.installmentTotal} parcelas lançadas!`
            : "Transação criada!"
        );
      }

      form.reset();
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Failed to save transaction", error);
      if (error.response?.data) {
        console.error("=== ZOD ERROR DO BACKEND ===", JSON.stringify(error.response.data, null, 2));
      }
      toast.error("Erro ao salvar transação. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  // Filter categories by selected type (INCOME/EXPENSE)
  const filteredCategories = categories.filter(c =>
    transactionType === "INCOME"
      ? c.type.trim() === "INCOME"
      : c.type.trim() === "EXPENSE"
  );

  const typeConfig = {
    INCOME:     { label: "Receita",     color: "text-emerald-600 bg-emerald-50 border-emerald-200", icon: ArrowUpCircle },
    EXPENSE:    { label: "Despesa",     color: "text-rose-600 bg-rose-50 border-rose-200",           icon: ArrowDownCircle },
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] bg-white rounded-t-3xl sm:rounded-3xl border-none shadow-2xl p-4 sm:p-8 max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
        <DialogHeader className="mb-4 sm:mb-6">
          <DialogTitle className="text-xl sm:text-2xl font-black text-zinc-900 tracking-tight">
            {isEditMode
              ? "Editar Transação"
              : isCreditCard
                ? "Nova Despesa no Cartão"
                : "Nova Transação"}
          </DialogTitle>
          {isCreditCard && (
            <p className="text-sm text-zinc-400 mt-1 font-medium">
              <span className="inline-flex items-center gap-1.5">
                <CreditCard size={14} className="text-zinc-500" />
                Parcelamento disponível logo abaixo.
              </span>
            </p>
          )}
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">

            {/* Type selector — hidden in CC context (always EXPENSE) */}
            {!isCreditCard && (
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-black uppercase tracking-widest text-zinc-400">Tipo</FormLabel>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {(Object.keys(typeConfig) as Array<keyof typeof typeConfig>).map(t => {
                        const cfg = typeConfig[t];
                        const Icon = cfg.icon;
                        const active = field.value === t;
                        return (
                          <button
                            key={t}
                            type="button"
                            onClick={() => field.onChange(t)}
                            className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-2xl border-2 text-[10px] font-black uppercase tracking-wider transition-all ${
                              active ? cfg.color + " border-current" : "border-zinc-100 text-zinc-400 hover:border-zinc-200 hover:text-zinc-600"
                            }`}
                          >
                            <Icon size={18} />
                            {cfg.label}
                          </button>
                        );
                      })}
                    </div>
                  </FormItem>
                )}
              />
            )}

            {/* Amount */}
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-black uppercase tracking-widest text-zinc-400">Valor (R$)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0,00"
                      className="h-12 rounded-xl text-xl font-black text-zinc-900 bg-zinc-50 border-zinc-200 focus-visible:ring-emerald-500"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Account + Category row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Account — locked badge when defaultAccountId is set */}
              {defaultAccountId ? (
                <FormItem className="min-w-0 flex flex-col">
                  <FormLabel className="text-xs font-black uppercase tracking-widest text-zinc-400">Cartão</FormLabel>
                  <div className="h-11 rounded-xl bg-zinc-900 text-white flex items-center px-3 gap-2 text-sm font-bold overflow-hidden">
                    <CreditCard size={14} className="shrink-0" />
                    <span className="truncate flex-1 min-w-0">
                      {accounts.find(a => a.id === defaultAccountId)?.name ?? "Cartão"}
                    </span>
                  </div>
                </FormItem>
              ) : (
                <FormField
                  control={form.control}
                  name="accountId"
                  render={({ field }) => (
                    <FormItem className="min-w-0 flex flex-col">
                      <FormLabel className="text-xs font-black uppercase tracking-widest text-zinc-400">Conta</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value ? String(field.value) : ""}>
                        <FormControl>
                          <SelectTrigger className="h-11 rounded-xl bg-zinc-50 border-zinc-200 font-medium overflow-hidden">
                            <SelectValue placeholder="Selecione..." className="truncate" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-white rounded-xl shadow-lg border-zinc-100 max-h-60 overflow-y-auto w-full">
                          {/* Sem conta option */}
                          <SelectItem value="0" className="font-medium text-zinc-400 min-w-0">
                            <span className="flex items-center gap-2 truncate pr-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-zinc-300 inline-block shrink-0" />
                              <span className="truncate">Sem conta vinculada</span>
                            </span>
                          </SelectItem>
                          {accounts.map(acc => (
                            <SelectItem key={acc.id} value={String(acc.id)} className="font-medium min-w-0">
                              <span className="flex items-center gap-2 truncate pr-2">
                                {acc.type.trim() === AccountType.CREDIT_CARD ? (
                                  <CreditCard size={14} className="text-zinc-500 shrink-0" />
                                ) : (
                                  <Landmark size={14} className="text-zinc-500 shrink-0" />
                                )}
                                <span className="truncate flex-1">{acc.name}</span>
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem className="min-w-0 flex flex-col">
                    <FormLabel className="text-xs font-black uppercase tracking-widest text-zinc-400">Categoria</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={String(field.value ?? 0)}
                    >
                      <FormControl>
                        <SelectTrigger className="h-11 rounded-xl bg-zinc-50 border-zinc-200 font-medium overflow-hidden">
                          <SelectValue placeholder="Selecione..." className="truncate" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-white rounded-xl shadow-lg border-zinc-100 max-h-60 overflow-y-auto w-full">
                        {/* Sem categoria option */}
                        <SelectItem value="0" className="font-medium text-zinc-400 min-w-0">
                          <span className="flex items-center gap-2 truncate pr-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-zinc-300 inline-block shrink-0" />
                            <span className="truncate">Sem categoria</span>
                          </span>
                        </SelectItem>
                        {filteredCategories.map(cat => (
                          <SelectItem key={cat.id} value={String(cat.id)} className="font-medium min-w-0">
                            <span className="flex items-center gap-2 truncate pr-2">
                              <span
                                className="w-2.5 h-2.5 rounded-full inline-block flex-shrink-0"
                                style={{ backgroundColor: cat.color || "#64748b" }}
                              />
                              <span className="truncate flex-1">{cat.name}</span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {/* Inline category creation */}
                    <button
                      type="button"
                      onClick={() => setIsCatDialogOpen(true)}
                      className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 hover:text-emerald-700 mt-1 transition-colors"
                    >
                      <Plus size={11} /> Nova categoria
                    </button>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Responsible */}
            <FormField
              control={form.control}
              name="responsibleId"
              render={({ field }) => (
                <FormItem className="min-w-0 flex flex-col">
                  <FormLabel className="text-xs font-black uppercase tracking-widest text-zinc-400">Responsável</FormLabel>
                  <Select onValueChange={field.onChange} value={String(field.value ?? 0)}>
                    <FormControl>
                      <SelectTrigger className="h-11 rounded-xl bg-zinc-50 border-zinc-200 font-medium overflow-hidden">
                        <SelectValue placeholder="Selecione..." className="truncate" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-white rounded-xl shadow-lg border-zinc-100 max-h-60 overflow-y-auto w-full">
                      {/* Sem responsável option */}
                      <SelectItem value="0" className="font-medium text-zinc-400 min-w-0">
                        <span className="flex items-center gap-2 truncate pr-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-zinc-300 inline-block shrink-0" />
                          <span className="truncate">Sem responsável</span>
                        </span>
                      </SelectItem>
                      {responsibles.map(r => (
                        <SelectItem key={r.id} value={String(r.id)} className="font-medium min-w-0">
                          <span className="flex items-center gap-2 truncate pr-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
                              style={{ backgroundColor: r.color || "#94a3b8" }}
                            />
                            <span className="truncate flex-1">{r.name}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {/* Inline responsible creation */}
                  <button
                    type="button"
                    onClick={() => setIsRespDialogOpen(true)}
                    className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 hover:text-emerald-700 mt-1 transition-colors"
                  >
                    <Plus size={11} /> Novo responsável
                  </button>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Dates row */}
            <div className={`grid grid-cols-1 gap-4 ${isCreditCard ? "" : "sm:grid-cols-2"}`}>
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel className="text-xs font-black uppercase tracking-widest text-zinc-400">
                      {isCreditCard ? "Data da Compra" : "Data"}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        className="h-11 rounded-xl bg-zinc-50 border-zinc-200 font-medium"
                        value={field.value}
                        onChange={(event) => {
                          const nextDate = event.target.value;
                          field.onChange(nextDate);
                          if (!isEditMode) {
                            form.setValue("recurrenceStartDate", nextDate, { shouldDirty: true });
                            const day = Number(nextDate.split("-")[2]);
                            if (day >= 1 && day <= 31) {
                              form.setValue("recurrenceBymonthday", day, { shouldDirty: true });
                            }
                          }
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {!isCreditCard && (
                <FormField
                  control={form.control}
                  name="paymentDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel className="text-xs font-black uppercase tracking-widest text-zinc-400">
                        Data de Pagamento
                      </FormLabel>
                      <FormControl>
                        <Input type="date" className="h-11 rounded-xl bg-zinc-50 border-zinc-200 font-medium" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            {!isEditMode && !isCreditCard && (
              <FormField
                control={form.control}
                name="recurring"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-xl border border-zinc-100 bg-white p-4 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                        <Repeat size={14} className="text-emerald-500" />
                        Recorrente
                      </FormLabel>
                      <p className="text-xs text-zinc-500 font-medium">
                        Ative para transformar este lançamento em uma regra recorrente.
                      </p>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="border-zinc-300 data-[state=unchecked]:bg-zinc-300 data-[state=checked]:bg-emerald-600"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            )}

            {!isEditMode && !isCreditCard && isRecurring && (
              <div className="bg-zinc-50/70 p-4 rounded-2xl border border-zinc-100 space-y-4">
                <div className="flex items-center gap-2">
                  <CalendarDays size={16} className="text-zinc-500" />
                  <h3 className="text-sm font-black text-zinc-700">Configuração de recorrência</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="recurrenceFrequency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-black uppercase tracking-widest text-zinc-400">Frequência</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-11 rounded-xl bg-white border-zinc-200 font-medium">
                              <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-white rounded-xl shadow-lg border-zinc-100">
                            <SelectItem value="DAILY">Diária</SelectItem>
                            <SelectItem value="WEEKLY">Semanal</SelectItem>
                            <SelectItem value="MONTHLY">Mensal</SelectItem>
                            <SelectItem value="YEARLY">Anual</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="recurrenceInterval"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-black uppercase tracking-widest text-zinc-400">Intervalo</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={1}
                            max={365}
                            className="h-11 rounded-xl bg-white border-zinc-200 font-medium"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="recurrenceStartDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-black uppercase tracking-widest text-zinc-400">Data de início</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            className="h-11 rounded-xl bg-white border-zinc-200 font-medium"
                            value={field.value}
                            onChange={(event) => {
                              const nextDate = event.target.value;
                              field.onChange(nextDate);
                              const day = Number(nextDate.split("-")[2]);
                              if (day >= 1 && day <= 31) {
                                form.setValue("recurrenceBymonthday", day, { shouldDirty: true });
                              }
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="recurrenceEndMode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-black uppercase tracking-widest text-zinc-400">Termina em</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-11 rounded-xl bg-white border-zinc-200 font-medium">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-white rounded-xl shadow-lg border-zinc-100">
                            <SelectItem value="NEVER">Nunca</SelectItem>
                            <SelectItem value="UNTIL">Em uma data</SelectItem>
                            <SelectItem value="COUNT">Por quantidade</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {recurrenceEndMode === "UNTIL" && (
                  <FormField
                    control={form.control}
                    name="recurrenceUntilDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-black uppercase tracking-widest text-zinc-400">Data final</FormLabel>
                        <FormControl>
                          <Input type="date" className="h-11 rounded-xl bg-white border-zinc-200 font-medium" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {recurrenceEndMode === "COUNT" && (
                  <FormField
                    control={form.control}
                    name="recurrenceCount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-black uppercase tracking-widest text-zinc-400">Quantidade de ocorrências</FormLabel>
                        <FormControl>
                          <Input type="number" min={1} max={999} className="h-11 rounded-xl bg-white border-zinc-200 font-medium" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {recurrenceFrequency === "WEEKLY" && (
                  <FormField
                    control={form.control}
                    name="recurrenceByweekday"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-black uppercase tracking-widest text-zinc-400">Dias da semana</FormLabel>
                        <div className="flex gap-2 flex-wrap">
                          {WEEKDAY_OPTIONS.map((weekday) => {
                            const selected = (field.value || []).includes(weekday.id);
                            return (
                              <button
                                key={weekday.id}
                                type="button"
                                onClick={() => {
                                  const current = (field.value || []) as WeekdayId[];
                                  const next = selected
                                    ? current.filter((id) => id !== weekday.id)
                                    : [...current, weekday.id];
                                  field.onChange(next);
                                }}
                                className={`w-10 h-10 rounded-full text-sm font-bold transition-all border-2 flex items-center justify-center ${
                                  selected
                                    ? "bg-zinc-900 text-white border-zinc-900"
                                    : "bg-white border-zinc-200 text-zinc-500 hover:border-zinc-300"
                                }`}
                                title={weekday.fullLabel}
                              >
                                {weekday.shortLabel}
                              </button>
                            );
                          })}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {recurrenceFrequency === "MONTHLY" && (
                  <FormField
                    control={form.control}
                    name="recurrenceBymonthday"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-black uppercase tracking-widest text-zinc-400">Dia do mês</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={1}
                            max={31}
                            className="h-11 rounded-xl bg-white border-zinc-200 font-medium"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 space-y-2">
                  <p className="text-xs font-black uppercase tracking-widest text-emerald-700">Preview</p>
                  <p className="text-sm font-semibold text-emerald-800">{recurrenceSummaryText || "Regra inválida"}</p>
                  {recurrenceRuleExpression && (
                    <p className="text-[11px] font-mono text-emerald-700 break-all">{recurrenceRuleExpression}</p>
                  )}
                  {recurrencePreviewDates.length > 0 && (
                    <div className="text-xs text-emerald-800 font-medium space-y-1">
                      {recurrencePreviewDates.map((date, index) => (
                        <p key={`${date.toISOString()}-${index}`}>
                          • {format(date, "dd/MM/yyyy")}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Credit Card: Installments */}
            {isCreditCard && !isRecurring && (
              <FormField
                control={form.control}
                name="installmentTotal"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel className="text-xs font-black uppercase tracking-widest text-zinc-400">Parcelas</FormLabel>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                      {[1, 2, 3, 6, 9, 12].map(n => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => field.onChange(n)}
                          className={`py-2.5 rounded-xl text-sm font-black transition-all border-2 ${
                            field.value === n
                              ? "bg-zinc-900 text-white border-zinc-900"
                              : "border-zinc-100 text-zinc-500 hover:border-zinc-300"
                          }`}
                        >
                          {n}x
                        </button>
                      ))}
                    </div>
                    <div className="mt-2">
                      <Input
                        type="number"
                        min={1}
                        max={36}
                        value={field.value}
                        onChange={e => field.onChange(Number(e.target.value))}
                        placeholder="Ou digite..."
                        className="h-10 rounded-xl bg-zinc-50 border-zinc-200 text-sm"
                      />
                    </div>
                    {field.value && field.value > 1 && (
                      <div className="text-[11px] text-zinc-500 mt-2 font-medium bg-zinc-50 p-2 rounded-lg border border-zinc-100 flex justify-between items-center">
                        <span>{field.value}x de R$ {(Number(form.watch("amount")) / field.value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                        <span className="text-emerald-600 hidden sm:inline">Divisão inteligente (Automática)</span>
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Status */}
            {!isCreditCard && (
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center gap-1">
                      <FormLabel className="text-xs font-black uppercase tracking-widest text-zinc-400">Status</FormLabel>
                      <TooltipProvider delayDuration={200}>
                        <Tooltip>
                          <TooltipTrigger type="button" tabIndex={-1} className="cursor-help">
                            <Info size={14} className="text-zinc-400 hover:text-emerald-500 transition-colors" />
                          </TooltipTrigger>
                          <TooltipContent className="bg-zinc-900 border-zinc-800 text-white max-w-[280px] p-3 shadow-xl rounded-xl">
                            <div className="space-y-2 text-xs font-medium">
                              <p><span className="text-emerald-400 font-bold">Confirmado:</span> Quando uma receita já caiu na conta ou despesa já foi descontada.</p>
                              <p><span className="text-amber-400 font-bold">Pendente:</span> Receitas a receber e despesas a pagar (ainda não descontadas).</p>
                              <p><span className="text-blue-400 font-bold">Conciliado:</span> Transação verificada com o extrato bancário oficial.</p>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-11 rounded-xl bg-zinc-50 border-zinc-200 font-medium">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-white rounded-xl shadow-lg border-zinc-100">
                        <SelectItem value="CONFIRMED" className="font-medium text-emerald-600">
                          <span className="flex items-center gap-2">
                            <CheckCircle2 size={14} />
                            <span>Confirmado</span>
                          </span>
                        </SelectItem>
                        <SelectItem value="PENDING" className="font-medium text-amber-600">
                          <span className="flex items-center gap-2">
                            <Clock3 size={14} />
                            <span>Pendente</span>
                          </span>
                        </SelectItem>
                        <SelectItem value="RECONCILED" className="font-medium text-blue-600">
                          <span className="flex items-center gap-2">
                            <ShieldCheck size={14} />
                            <span>Conciliado</span>
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-black uppercase tracking-widest text-zinc-400">Descrição (opcional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: Supermercado, Netflix, Aluguel..."
                      className="h-11 rounded-xl bg-zinc-50 border-zinc-200 font-medium focus-visible:ring-emerald-500"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notes / Comentários */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-black uppercase tracking-widest text-zinc-400">Comentários / Observações</FormLabel>
                  <FormControl>
                    <textarea
                      placeholder="Alguma nota adicional..."
                      className="w-full h-20 p-3 rounded-xl bg-zinc-50 border border-zinc-200 font-medium focus-visible:ring-emerald-500 focus-visible:outline-none focus:ring-2 resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl font-black text-sm bg-zinc-900 hover:bg-zinc-800 text-white shadow-lg mt-2"
            >
              {loading
                ? isRecurring && !isEditMode
                  ? "Salvando recorrência..."
                  : "Salvando..."
                : isEditMode
                  ? "Salvar Alterações"
                  : isRecurring
                    ? "Salvar Recorrência"
                  : isCreditCard && (form.watch("installmentTotal") ?? 1) > 1
                    ? `Lançar ${form.watch("installmentTotal")} parcelas`
                    : "Salvar Transação"
              }
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>

    {/* Inline category creation — opens on top of the transaction dialog */}
    <CreateCategoryDialog
      open={isCatDialogOpen}
      onOpenChange={setIsCatDialogOpen}
      defaultType={transactionType === "INCOME" ? "INCOME" : "EXPENSE"}
      onSuccess={async () => {
        if (!user) return;
        const cats = await getCategories(user.id);
        setCategories(cats);
        // Auto-select the newest category of the right type
        const matching = cats
          .filter(c => c.type.trim() === (transactionType === "INCOME" ? "INCOME" : "EXPENSE"))
          .at(-1);
        if (matching) form.setValue("categoryId", matching.id);
      }}
    />

    {/* Inline responsible creation */}
    <CreateResponsibleDialog
      open={isRespDialogOpen}
      onOpenChange={setIsRespDialogOpen}
      onSuccess={async () => {
        if (!user) return;
        const resps = await getResponsibles(user.id);
        const active = resps.filter(r => r.isActive);
        setResponsibles(active);
        // Auto-select the newest responsible
        const newest = active.at(-1);
        if (newest) form.setValue("responsibleId", newest.id);
      }}
    />
    </>
  );
}
