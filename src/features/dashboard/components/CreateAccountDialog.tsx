import { useState, useEffect } from "react";
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { type Account, createAccount, updateAccount, AccountType } from "../services/account.service";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

// ─── Schema ──────────────────────────────────────────────────────────────────
const formSchema = z.object({
  name:           z.string().min(2, "O nome deve ter pelo menos 2 caracteres").max(100),
  type:           z.nativeEnum(AccountType),
  initialBalance: z.coerce.number(),                         // only used on create
  currencyCode:   z.string().length(3, "Código da moeda deve ter 3 caracteres").default("BRL"),
  closingDay:     z.string().optional(),
  dueDay:         z.string().optional(),
  limitAmount:    z.coerce.number().optional(),
});

type FormValues = z.infer<typeof formSchema>;

// ─── Props ────────────────────────────────────────────────────────────────────
interface CreateAccountDialogProps {
  open:           boolean;
  onOpenChange:   (open: boolean) => void;
  onSuccess:      () => void;
  defaultType?:   AccountType;
  editingAccount?: Account | null;   // when provided → edit mode
}

export function CreateAccountDialog({
  open,
  onOpenChange,
  onSuccess,
  defaultType,
  editingAccount,
}: CreateAccountDialogProps) {
  const { user }     = useAuth();
  const isEditing    = !!editingAccount;
  // A type is "fixed" when: editing (can't change), or created from CC screen
  const isCreditCard = (editingAccount?.type.trim() ?? defaultType) === AccountType.CREDIT_CARD;
  const [loading, setLoading] = useState(false);

  const form = useForm<FormValues, unknown, FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      name:           "",
      type:           defaultType ?? AccountType.CHECKING,
      initialBalance: 0,
      currencyCode:   "BRL",
      closingDay:     "",
      dueDay:         "",
      limitAmount:    0,
    },
  });

  // Pre-fill form when editing, reset when creating
  useEffect(() => {
    if (!open) return;

    if (editingAccount) {
      form.reset({
        name:           editingAccount.name,
        type:           editingAccount.type.trim() as AccountType,
        initialBalance: Number(editingAccount.initialBalance),
        currencyCode:   editingAccount.currencyCode.trim(),
        closingDay:     editingAccount.closingDay?.toString() ?? "",
        dueDay:         editingAccount.dueDay
                          ? editingAccount.dueDay.split("T")[0]   // ISO → "YYYY-MM-DD"
                          : "",
        limitAmount:    editingAccount.limitAmount ? Number(editingAccount.limitAmount) : 0,
      });
    } else {
      form.reset({
        name:           "",
        type:           defaultType ?? AccountType.CHECKING,
        initialBalance: 0,
        currencyCode:   "BRL",
        closingDay:     "",
        dueDay:         "",
        limitAmount:    0,
      });
    }
  }, [open, editingAccount, defaultType]);

  const accountType = form.watch("type");

  async function onSubmit(values: FormValues) {
    if (!user) return;
    setLoading(true);

    try {
      if (isEditing && editingAccount) {
        // ── EDIT MODE: only send fields that can be safely edited ──
        const payload: any = {
          userId:       user.id,
          name:         values.name,
          type:         values.type,
          currencyCode: values.currencyCode,
          isActive:     editingAccount.isActive,
          // initialBalance intentionally NOT sent on edit
        };

        if (values.type === AccountType.CREDIT_CARD) {
          payload.closingDay  = values.closingDay || null;
          payload.limitAmount = values.limitAmount ?? null;
          if (values.dueDay) payload.dueDay = new Date(values.dueDay + "T12:00:00");
        }

        await updateAccount(editingAccount.id, payload);
        toast.success("Conta atualizada!");
      } else {
        // ── CREATE MODE ──
        const payload: any = {
          userId:         user.id,
          name:           values.name,
          type:           values.type,
          initialBalance: values.initialBalance,
          currentBalance: values.initialBalance,
          currencyCode:   values.currencyCode,
          isActive:       true,
        };

        if (values.type === AccountType.CREDIT_CARD) {
          payload.closingDay  = values.closingDay || null;
          payload.limitAmount = values.limitAmount ?? null;
          if (values.dueDay) payload.dueDay = new Date(values.dueDay + "T12:00:00");
        }

        await createAccount(payload);
        toast.success("Conta criada com sucesso!");
      }

      form.reset();
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to save account", error);
      toast.error(`Erro ao ${isEditing ? "atualizar" : "criar"} conta. Tente novamente.`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-white rounded-3xl border-none shadow-2xl p-8">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-2xl font-semibold text-zinc-900">
          {isEditing
            ? (isCreditCard ? "Editar Cartão" : "Editar Conta")
            : (isCreditCard ? "Novo Cartão"   : "Nova Conta")}
          </DialogTitle>
          {isEditing && (
            <p className="text-sm text-zinc-400 mt-1">
              O saldo é calculado automaticamente pelas transações.
            </p>
          )}
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">

            {/* Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel className="text-sm font-semibold text-zinc-800">Nome da Conta</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: NuBank, Carteira..."
                      className="h-11 rounded-lg bg-white border-zinc-300 text-zinc-900 focus-visible:ring-emerald-500"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-red-500" />
                </FormItem>
              )}
            />

            {/* Type — fixed badge for CC, select for others */}
            {isCreditCard ? (
              <div className="flex items-center gap-2 py-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-900 text-white text-xs font-black">
                  <span>💳</span> Cartão de Crédito
                </span>
              </div>
            ) : (
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-sm font-semibold text-zinc-800">Tipo</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={isEditing}
                    >
                      <FormControl>
                        <SelectTrigger className="h-11 rounded-lg bg-white border-zinc-300 text-zinc-900 focus:ring-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed">
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-white border-zinc-200 rounded-xl shadow-lg">
                        <SelectItem value={AccountType.CHECKING}    className="focus:bg-emerald-50 focus:text-emerald-900 cursor-pointer">Conta Corrente</SelectItem>
                        <SelectItem value={AccountType.CREDIT_CARD} className="focus:bg-emerald-50 focus:text-emerald-900 cursor-pointer">Cartão de Crédito</SelectItem>
                        <SelectItem value={AccountType.CASH}        className="focus:bg-emerald-50 focus:text-emerald-900 cursor-pointer">Dinheiro</SelectItem>
                        <SelectItem value={AccountType.INVESTMENT}  className="focus:bg-emerald-50 focus:text-emerald-900 cursor-pointer">Investimento</SelectItem>
                      </SelectContent>
                    </Select>
                    {isEditing && (
                      <p className="text-[11px] text-zinc-400">O tipo não pode ser alterado após a criação.</p>
                    )}
                    <FormMessage className="text-red-500" />
                  </FormItem>
                )}
              />
            )}

            {/* Saldo Inicial + Moeda — only on create AND only for non-CC accounts */}
            {!isEditing && !isCreditCard && (
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="initialBalance"
                  render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel className="text-sm font-semibold text-zinc-800">Saldo Inicial</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          className="h-11 rounded-lg bg-white border-zinc-300 text-zinc-900 focus-visible:ring-emerald-500"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-red-500" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="currencyCode"
                  render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel className="text-sm font-semibold text-zinc-800">Moeda</FormLabel>
                      <FormControl>
                        <Input
                          maxLength={3}
                          className="h-11 rounded-lg bg-white border-zinc-300 text-zinc-900 focus-visible:ring-emerald-500 uppercase"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-red-500" />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Credit card fields */}
            {accountType === AccountType.CREDIT_CARD && (
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-zinc-100">
                <FormField
                  control={form.control}
                  name="closingDay"
                  render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel className="text-sm font-semibold text-zinc-800">Dia Fechamento</FormLabel>
                      <FormControl>
                        <Input
                          type="number" min="1" max="31" placeholder="Ex: 5"
                          className="h-11 rounded-lg bg-white border-zinc-300 text-zinc-900 focus-visible:ring-emerald-500"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-red-500" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="dueDay"
                  render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel className="text-sm font-semibold text-zinc-800">Vencimento</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          className="h-11 rounded-lg bg-white border-zinc-300 text-zinc-900 focus-visible:ring-emerald-500"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-red-500" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="limitAmount"
                  render={({ field }) => (
                    <FormItem className="col-span-2 space-y-1">
                      <FormLabel className="text-sm font-semibold text-zinc-800">Limite do Cartão</FormLabel>
                      <FormControl>
                        <Input
                          type="number" step="0.01"
                          className="h-11 rounded-lg bg-white border-zinc-300 text-zinc-900 focus-visible:ring-emerald-500"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-red-500" />
                    </FormItem>
                  )}
                />
              </div>
            )}

            <div className="flex justify-end pt-6">
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 rounded-lg bg-emerald-500 text-white text-base font-semibold shadow-xl shadow-emerald-500/20 hover:shadow-emerald-700/30 hover:bg-emerald-600 transition-all"
              >
                {loading
                  ? (isEditing ? "Salvando..." : "Criando...")
                  : (isEditing ? "Salvar alterações" : "Criar Conta")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
