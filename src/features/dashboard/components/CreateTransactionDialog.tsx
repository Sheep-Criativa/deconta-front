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
import { ArrowDownCircle, ArrowUpCircle, CreditCard, Repeat } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getAccounts, type Account, AccountType } from "../services/account.service";
import { getCategories, type Category } from "../services/category.service";
import { getResponsibles, type Responsible } from "../services/responsible.service";
import { createTransaction, updateTransaction, type Transaction, type TransactionType, type TransactionStatus } from "../services/transaction.service";
import { toast } from "sonner";

const formSchema = z.object({
  accountId: z.coerce.number().min(1, "Selecione uma conta"),
  categoryId: z.coerce.number().min(1, "Selecione uma categoria"),
  responsibleId: z.coerce.number().min(1, "Selecione um responsável"),
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
}

export function CreateTransactionDialog({
  open,
  onOpenChange,
  onSuccess,
  defaultType = "EXPENSE",
  transaction,
}: CreateTransactionDialogProps) {
  const isEditMode = !!transaction;
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [responsibles, setResponsibles] = useState<Responsible[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);

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
  const isCreditCard = selectedAccount?.type.trim() === AccountType.CREDIT_CARD;

  // Load select options
  useEffect(() => {
    if (!user || !open) return;
    Promise.all([
      getAccounts(user.id),
      getCategories(user.id),
      getResponsibles(user.id),
    ]).then(([accs, cats, resps]) => {
      setAccounts(accs.filter(a => a.isActive));
      setCategories(cats);
      setResponsibles(resps.filter(r => r.isActive));
    });
  }, [user, open]);

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
        });
        setSelectedAccount(null);
      }
    }
  }, [open, defaultType, transaction]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user) return;
    setLoading(true);
    try {
      const baseDate = new Date(values.date + "T12:00:00");
      const basePaymentDate = new Date(values.paymentDate + "T12:00:00");

      if (isEditMode && transaction) {
        await updateTransaction(transaction.id, {
          categoryId: values.categoryId,
          responsibleId: values.responsibleId,
          description: values.description || undefined,
          amount: values.amount,
          date: baseDate,
          paymentDate: basePaymentDate,
          type: values.type as TransactionType,
          status: values.status as TransactionStatus,
        });
        toast.success("Transação atualizada!");
      } else {
        await createTransaction({
          userId: user.id,
          accountId: values.accountId,
          categoryId: values.categoryId,
          responsibleId: values.responsibleId,
          description: values.description || undefined,
          amount: values.amount,
          date: baseDate,
          paymentDate: basePaymentDate,
          type: values.type as TransactionType,
          status: values.status as TransactionStatus,
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
    TRANSFER:   { label: "Transferência", color: "text-blue-600 bg-blue-50 border-blue-200",         icon: Repeat },
    ADJUSTMENT: { label: "Ajuste",      color: "text-amber-600 bg-amber-50 border-amber-200",        icon: CreditCard },
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] bg-white rounded-3xl border-none shadow-2xl p-8" aria-describedby={undefined}>
        <DialogHeader className="mb-6">
          <DialogTitle className="text-2xl font-black text-zinc-900 tracking-tight">
            {isEditMode ? "Editar Transação" : "Nova Transação"}
          </DialogTitle>
          {isCreditCard && (
            <div className="flex items-center gap-2 text-xs font-bold text-blue-600 bg-blue-50 px-3 py-2 rounded-xl border border-blue-100 mt-2">
              <CreditCard size={14} />
              Cartão de crédito detectado — parcelamento disponível
            </div>
          )}
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">

            {/* Type selector — pill style */}
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-black uppercase tracking-widest text-zinc-400">Tipo</FormLabel>
                  <div className="grid grid-cols-4 gap-2">
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
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="accountId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-black uppercase tracking-widest text-zinc-400">Conta</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value?.toString()}>
                      <FormControl>
                        <SelectTrigger className="h-11 rounded-xl bg-zinc-50 border-zinc-200 font-medium">
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-white rounded-xl shadow-lg border-zinc-100">
                        {accounts.map(acc => (
                          <SelectItem key={acc.id} value={String(acc.id)} className="font-medium">
                            {acc.type.trim() === AccountType.CREDIT_CARD ? "💳 " : "🏦 "}{acc.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-black uppercase tracking-widest text-zinc-400">Categoria</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value?.toString()}>
                      <FormControl>
                        <SelectTrigger className="h-11 rounded-xl bg-zinc-50 border-zinc-200 font-medium">
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-white rounded-xl shadow-lg border-zinc-100">
                        {filteredCategories.map(cat => (
                          <SelectItem key={cat.id} value={String(cat.id)} className="font-medium">
                            {cat.icon} {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                <FormItem>
                  <FormLabel className="text-xs font-black uppercase tracking-widest text-zinc-400">Responsável</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value?.toString()}>
                    <FormControl>
                      <SelectTrigger className="h-11 rounded-xl bg-zinc-50 border-zinc-200 font-medium">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-white rounded-xl shadow-lg border-zinc-100">
                      {responsibles.map(r => (
                        <SelectItem key={r.id} value={String(r.id)} className="font-medium">
                          <span className="flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full inline-block"
                              style={{ backgroundColor: r.color || "#94a3b8" }}
                            />
                            {r.name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Dates row */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
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
                  <FormItem>
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
                  <FormItem>
                    <FormLabel className="text-xs font-black uppercase tracking-widest text-zinc-400">Parcelas</FormLabel>
                    <div className="grid grid-cols-6 gap-2">
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
                      <SelectItem value="CONFIRMED" className="font-medium text-emerald-600">✅ Confirmado</SelectItem>
                      <SelectItem value="PENDING"   className="font-medium text-amber-600">⏳ Pendente</SelectItem>
                      <SelectItem value="RECONCILED" className="font-medium text-blue-600">🔒 Conciliado</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

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
  );
}
