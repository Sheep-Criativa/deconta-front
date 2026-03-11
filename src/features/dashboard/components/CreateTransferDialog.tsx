import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Repeat } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { type Account } from "../services/account.service";
import { createTransaction } from "../services/transaction.service";
import { toast } from "sonner";
import { getCategories } from "../services/category.service";

const formSchema = z.object({
  destinationAccountId: z.coerce.number().min(1, "Selecione uma conta de destino"),
  amount: z.coerce.number().min(0.01, "O valor deve ser maior que zero"),
  date: z.string().min(1, "Selecione uma data"),
});

interface CreateTransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  originAccount?: Account | null;
  accounts: Account[];
}

export function CreateTransferDialog({
  open,
  onOpenChange,
  onSuccess,
  originAccount,
  accounts,
}: CreateTransferDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      destinationAccountId: undefined,
      amount: 0,
      date: new Date().toISOString().split("T")[0],
    },
  });

  // Filter out the origin account and credit cards
  const destinationAccounts = accounts.filter(
    (a) => a.id !== originAccount?.id && a.type.trim() !== "CREDIT_CARD"
  );

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user || !originAccount) return;
    setLoading(true);

    try {
      // Find a "Geral" or default category to attach
      const cats = await getCategories(user.id);
      
      const expenseCat = cats.find(c => c.name.toLowerCase() === "transferência" && c.type.trim() === "EXPENSE") 
                      || cats.find(c => c.name.toLowerCase() === "geral" && c.type.trim() === "EXPENSE")
                      || cats.find(c => c.type.trim() === "EXPENSE");
                      
      const incomeCat = cats.find(c => c.name.toLowerCase() === "transferência" && c.type.trim() === "INCOME")
                     || cats.find(c => c.name.toLowerCase() === "geral" && c.type.trim() === "INCOME")
                     || cats.find(c => c.type.trim() === "INCOME");

      const destAccount = destinationAccounts.find(a => a.id === values.destinationAccountId);

      const baseDate = new Date(values.date + "T12:00:00");

      // 1. Withdrawal from Origin (EXPENSE)
      await createTransaction({
        userId: user.id,
        accountId: originAccount.id,
        categoryId: expenseCat ? expenseCat.id : 0,
        responsibleId: 0, // Fallback handled by backend usually, or 0
        description: `Transferência enviada para ${destAccount?.name || "Conta Destino"}`,
        amount: values.amount,
        date: baseDate,
        paymentDate: baseDate,
        type: "EXPENSE",
        status: "CONFIRMED",
      });

      // 2. Deposit into Destination (INCOME)
      await createTransaction({
        userId: user.id,
        accountId: values.destinationAccountId,
        categoryId: incomeCat ? incomeCat.id : 0,
        responsibleId: 0,
        description: `Transferência recebida de ${originAccount.name}`,
        amount: values.amount,
        date: baseDate,
        paymentDate: baseDate,
        type: "INCOME",
        status: "CONFIRMED",
      });

      toast.success("Transferência realizada com sucesso!");
      form.reset();
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Transfer failed", error);
      toast.error("Erro ao realizar transferência.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px] bg-white rounded-t-3xl sm:rounded-3xl border-none shadow-2xl p-4 sm:p-8" aria-describedby={undefined}>
        <DialogHeader className="mb-4">
          <DialogTitle className="text-xl font-black text-zinc-900 flex items-center gap-2">
            <Repeat size={20} className="text-blue-500" />
            Transferência
          </DialogTitle>
          {originAccount && (
            <p className="text-sm font-medium text-zinc-500 mt-1">
              Origem: <span className="text-zinc-900 font-bold">{originAccount.name}</span>
            </p>
          )}
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="destinationAccountId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-black uppercase tracking-widest text-zinc-400">Conta Destino</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value?.toString()}>
                    <FormControl>
                      <SelectTrigger className="h-11 rounded-xl bg-zinc-50 border-zinc-200 font-medium">
                        <SelectValue placeholder="Selecione a conta de destino..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-white rounded-xl shadow-lg border-zinc-100">
                      {destinationAccounts.map(acc => (
                        <SelectItem key={acc.id} value={String(acc.id)} className="font-medium">
                          {acc.name}
                        </SelectItem>
                      ))}
                      {destinationAccounts.length === 0 && (
                        <p className="p-3 text-sm text-zinc-500 text-center">Nenhuma conta disponível.</p>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                      className="h-12 rounded-xl text-xl font-black text-zinc-900 bg-zinc-50 border-zinc-200 focus-visible:ring-blue-500"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-black uppercase tracking-widest text-zinc-400">Data da Transferência</FormLabel>
                  <FormControl>
                    <Input type="date" className="h-11 rounded-xl bg-zinc-50 border-zinc-200 font-medium text-zinc-900" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="pt-4 flex justify-end">
              <Button
                type="submit"
                disabled={loading || destinationAccounts.length === 0}
                className="h-11 px-8 rounded-xl bg-blue-600 text-white font-bold shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all w-full"
              >
                {loading ? "Transferindo..." : "Confirmar Transferência"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
