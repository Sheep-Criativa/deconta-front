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
import { createAccount, AccountType } from "../services/account.service";
import { useAuth } from "@/hooks/useAuth";

const formSchema = z.object({
  name: z.string().min(2, "O nome deve ter pelo menos 2 caracteres").max(100),
  type: z.nativeEnum(AccountType),
  initialBalance: z.coerce.number().min(0, "O saldo não pode ser negativo"),
  currencyCode: z.string().length(3, "Código da moeda deve ter 3 caracteres").default("BRL"),
  closingDay: z.string().optional(),
  dueDay: z.string().optional(), // Using string for date input consistency
  limitAmount: z.coerce.number().optional(),
});

interface CreateAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  defaultType?: AccountType;
}

export function CreateAccountDialog({
  open,
  onOpenChange,
  onSuccess,
  defaultType,
}: CreateAccountDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      type: defaultType ?? AccountType.CHECKING,
      initialBalance: 0,
      currencyCode: "BRL",
      closingDay: "",
      dueDay: "",
      limitAmount: 0,
    },
  });

  // Reset form with correct type when dialog opens
  useEffect(() => {
    if (open) {
      form.reset({
        name: "",
        type: defaultType ?? AccountType.CHECKING,
        initialBalance: 0,
        currencyCode: "BRL",
        closingDay: "",
        dueDay: "",
        limitAmount: 0,
      });
    }
  }, [open, defaultType]);

  const accountType = form.watch("type");

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user) return;

    setLoading(true);
    try {
      if (values.type === AccountType.CREDIT_CARD) {
        const payload: any = {
          userId: user.id,
          name: values.name,
          type: values.type,
          initialBalance: values.initialBalance,
          currentBalance: values.initialBalance,
          currencyCode: values.currencyCode,
          isActive: true,
          closingDay: values.closingDay ?? null,
          limitAmount: values.limitAmount ?? null,
        };

        // dueDay comes as "YYYY-MM-DD" string from input, must be a Date for backend
        if (values.dueDay) {
          // Add time to avoid timezone shift (treat as local noon)
          payload.dueDay = new Date(values.dueDay + "T12:00:00");
        }

        await createAccount(payload);
      } else {
        const payload: any = {
          userId: user.id,
          name: values.name,
          type: values.type,
          initialBalance: values.initialBalance,
          currentBalance: values.initialBalance,
          currencyCode: values.currencyCode,
          isActive: true,
        };
        await createAccount(payload);
      }

      form.reset();
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to create account", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-white rounded-3xl border-none shadow-2xl p-8">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-2xl font-semibold text-zinc-900">Nova Conta</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
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

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel className="text-sm font-semibold text-zinc-800">Tipo</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="h-11 rounded-lg bg-white border-zinc-300 text-zinc-900 focus:ring-emerald-500">
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-white border-zinc-200 rounded-xl shadow-lg">
                      <SelectItem value={AccountType.CHECKING} className="focus:bg-emerald-50 focus:text-emerald-900 cursor-pointer">Conta Corrente</SelectItem>
                      <SelectItem value={AccountType.CREDIT_CARD} className="focus:bg-emerald-50 focus:text-emerald-900 cursor-pointer">Cartão de Crédito</SelectItem>
                      <SelectItem value={AccountType.CASH} className="focus:bg-emerald-50 focus:text-emerald-900 cursor-pointer">Dinheiro</SelectItem>
                      <SelectItem value={AccountType.INVESTMENT} className="focus:bg-emerald-50 focus:text-emerald-900 cursor-pointer">Investimento</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage className="text-red-500" />
                </FormItem>
              )}
            />

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
                          type="number" 
                          min="1" 
                          max="31" 
                          placeholder="Ex: 5" 
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
              </div>
            )}

            <div className="flex justify-end pt-6">
              <Button 
                type="submit" 
                disabled={loading} 
                className="w-full h-11 rounded-lg bg-emerald-500 text-white text-base font-semibold shadow-xl shadow-emerald-500/20 hover:shadow-emerald-700/30 hover:bg-emerald-600 transition-all"
              >
                {loading ? "Criando..." : "Criar Conta"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
