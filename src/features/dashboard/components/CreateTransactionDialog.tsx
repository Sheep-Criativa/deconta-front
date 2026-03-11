import { useEffect, useState } from "react";
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
import { ArrowDownCircle, ArrowUpCircle, CreditCard, Repeat, Plus, Landmark, CheckCircle2, Clock3, ShieldCheck } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getAccounts, type Account, AccountType } from "../services/account.service";
import { getCategories, type Category } from "../services/category.service";
import { getResponsibles, type Responsible } from "../services/responsible.service";
import { createTransaction, updateTransaction, type Transaction, type TransactionType, type TransactionStatus } from "../services/transaction.service";
import { CreateCategoryDialog } from "./CreateCategoryDialog";
import { CreateResponsibleDialog } from "./CreateResponsibleDialog";
import { toast } from "sonner";

const formSchema = z.object({
  accountId: z.preprocess((val) => {
    const num = Number(val);
    return isNaN(num) ? 0 : num;
  }, z.number().min(1, "Selecione uma conta")),
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
}

export function CreateTransactionDialog({
  open,
  onOpenChange,
  onSuccess,
  defaultType = "EXPENSE",
  transaction,
  defaultAccountId,
  onlyCreditCards = false,
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
      date: new Date().toISOString().split("T")[0],
      paymentDate: new Date().toISOString().split("T")[0],
      amount: 0,
      installmentTotal: 1,
      description: "",
    },
  });

  const transactionType = form.watch("type");
  const accountId = form.watch("accountId");
  // CC context: explicit account lock, onlyCreditCards filter, or selected account is CC
  const isCreditCard = !!defaultAccountId || onlyCreditCards || selectedAccount?.type.trim() === AccountType.CREDIT_CARD;

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
          categoryId: transaction.categoryId ?? undefined,
          responsibleId: transaction.responsibleId ?? undefined,
          type: transaction.type.trim() as TransactionType,
          status: transaction.status.trim() as TransactionStatus,
          date: transaction.date.split("T")[0],
          paymentDate: (transaction.paymentDate ?? transaction.date).split("T")[0],
          amount: Number(transaction.amount),
          installmentTotal: transaction.installmentTotal ?? 1,
          description: transaction.description ?? "",
        });
      } else {
        form.reset({
          type: defaultType,
          status: "CONFIRMED",
          date: new Date().toISOString().split("T")[0],
          paymentDate: new Date().toISOString().split("T")[0],
          amount: 0,
          installmentTotal: 1,
          description: "",
          // Pre-select the account if provided
          ...(defaultAccountId ? { accountId: defaultAccountId } : {}),
        });
        setSelectedAccount(null);
      }
    }
  }, [open, defaultType, transaction, defaultAccountId]);

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

      const baseDate = new Date(values.date + "T12:00:00");
      const basePaymentDate = new Date(values.paymentDate + "T12:00:00");

      if (isEditMode && transaction) {
        await updateTransaction(transaction.id, {
          categoryId: resolvedCategoryId,
          responsibleId: resolvedRespId,
          description: values.description || undefined,
          amount: values.amount,
          date: baseDate,
          paymentDate: basePaymentDate,
          type: values.type as TransactionType,
          status: isCreditCard ? "CONFIRMED" : values.status as TransactionStatus,
        });
        toast.success("Transação atualizada!");
      } else {
        await createTransaction({
          userId: user.id,
          accountId: values.accountId,
          categoryId: resolvedCategoryId!,
          responsibleId: resolvedRespId!,
          description: values.description || undefined,
          amount: values.amount,
          date: baseDate,
          paymentDate: basePaymentDate,
          type: values.type as TransactionType,
          status: isCreditCard ? "CONFIRMED" : values.status as TransactionStatus,
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
    } catch (error) {
      console.error("Failed to save transaction", error);
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
                      {(Object.keys(typeConfig) as TransactionType[]).map(t => {
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
                      <Select onValueChange={field.onChange} value={field.value?.toString()}>
                        <FormControl>
                          <SelectTrigger className="h-11 rounded-xl bg-zinc-50 border-zinc-200 font-medium overflow-hidden">
                            <SelectValue placeholder="Selecione..." className="truncate" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-white rounded-xl shadow-lg border-zinc-100 max-h-60 overflow-y-auto w-full">
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
                      value={field.value?.toString()}
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
                  <Select onValueChange={field.onChange} value={field.value?.toString()}>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel className="text-xs font-black uppercase tracking-widest text-zinc-400">
                      {isCreditCard ? "Data da Compra" : "Data"}
                    </FormLabel>
                    <FormControl>
                      <Input type="date" className="h-11 rounded-xl bg-zinc-50 border-zinc-200 font-medium" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="paymentDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel className="text-xs font-black uppercase tracking-widest text-zinc-400">
                      {isCreditCard ? "Data 1ª Parcela" : "Data de Pagamento"}
                    </FormLabel>
                    <FormControl>
                      <Input type="date" className="h-11 rounded-xl bg-zinc-50 border-zinc-200 font-medium" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Credit Card: Installments */}
            {isCreditCard && (
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
                      <p className="text-[11px] text-zinc-400 font-medium mt-1">
                        {field.value}x de R$ {(Number(form.watch("amount")) / field.value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </p>
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
                    <FormLabel className="text-xs font-black uppercase tracking-widest text-zinc-400">Status</FormLabel>
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

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl font-black text-sm bg-zinc-900 hover:bg-zinc-800 text-white shadow-lg mt-2"
            >
              {loading
                ? "Salvando..."
                : isEditMode
                  ? "Salvar Alterações"
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
