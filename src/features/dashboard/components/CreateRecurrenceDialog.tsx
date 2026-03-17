import { useEffect, useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { RRule, Frequency } from "rrule";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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
  ArrowDownCircle,
  ArrowUpCircle,
  Repeat,
  Landmark,
  CalendarDays,
  Check
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

import { getAccounts, type Account } from "../services/account.service";
import { getCategories, type Category } from "../services/category.service";
import { createRecurrence, type CreateRecurrenceDTO } from "../services/recurrence.service";
import { toast } from "sonner";

// Zod schema for UI form
const formSchema = z.object({
  description: z.string().min(1, "A descrição é obrigatória"),
  amount: z.coerce.number().min(0.01, "O valor deve ser maior que zero"),
  type: z.enum(["INCOME", "EXPENSE"]),
  accountId: z.preprocess((val) => Number(val), z.number().min(1, "Selecione uma conta")),
  categoryId: z.preprocess((val) => Number(val), z.number().min(1, "Selecione uma categoria")),
  
  frequency: z.enum(["DAILY", "WEEKLY", "MONTHLY", "YEARLY"]),
  byweekday: z.array(z.string()).optional(),
  bymonthday: z.coerce.number().min(1).max(31).optional(),
  
  active: z.boolean().default(true),
});

type FormValues = z.infer<typeof formSchema>;

export const WEEKDAYS = [
  { id: "MO", label: "S", rrule: RRule.MO },
  { id: "TU", label: "T", rrule: RRule.TU },
  { id: "WE", label: "Q", rrule: RRule.WE },
  { id: "TH", label: "Q", rrule: RRule.TH },
  { id: "FR", label: "S", rrule: RRule.FR },
  { id: "SA", label: "S", rrule: RRule.SA },
  { id: "SU", label: "D", rrule: RRule.SU },
];

const FREQ_MAP: Record<string, Frequency> = {
  DAILY: RRule.DAILY,
  WEEKLY: RRule.WEEKLY,
  MONTHLY: RRule.MONTHLY,
  YEARLY: RRule.YEARLY,
};

interface CreateRecurrenceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  defaultType?: "INCOME" | "EXPENSE";
}

export function CreateRecurrenceDialog({
  open,
  onOpenChange,
  onSuccess,
  defaultType = "EXPENSE",
}: CreateRecurrenceDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: defaultType,
      amount: 0,
      description: "",
      frequency: "MONTHLY",
      bymonthday: new Date().getDate(),
      byweekday: [],
      active: true,
      accountId: 0,
      categoryId: 0,
    },
  });

  const transactionType = form.watch("type");
  const frequency = form.watch("frequency");

  useEffect(() => {
    if (!user || !open) return;
    Promise.all([
      getAccounts(user.id),
      getCategories(user.id),
    ]).then(([accs, cats]) => {
      setAccounts(accs.filter((a) => a.isActive));
      setCategories(cats);
    });
  }, [user, open]);

  useEffect(() => {
    if (open) {
      form.reset({
        type: defaultType,
        amount: 0,
        description: "",
        frequency: "MONTHLY",
        bymonthday: new Date().getDate(),
        byweekday: [],
        active: true,
        accountId: 0,
        categoryId: 0,
      });
    }
  }, [open, defaultType, form]);

  const filteredCategories = categories.filter((c) => c.type.trim() === transactionType);

  // Derive RRule string for preview and submission
  const currentRuleString = useMemo(() => {
    try {
      const values = form.getValues();
      let byweekdayOpt;
      if (values.frequency === "WEEKLY" && values.byweekday && values.byweekday.length > 0) {
        byweekdayOpt = values.byweekday.map((dayId) => WEEKDAYS.find((w) => w.id === dayId)?.rrule).filter(Boolean);
      }
      
      let bymonthdayOpt;
      if (values.frequency === "MONTHLY" && values.bymonthday) {
        bymonthdayOpt = [values.bymonthday];
      }

      const rule = new RRule({
        freq: FREQ_MAP[values.frequency],
        byweekday: byweekdayOpt as any,
        bymonthday: bymonthdayOpt,
      });

      // rule.toString() outputs something like 'FREQ=MONTHLY;BYMONTHDAY=5'
      // sometimes prepended with 'RRULE:'
      return rule.toString().replace(/^RRULE:/, "");
    } catch {
      return "";
    }
  }, [form.watch()]);

  // Generate preview dates
  const previewDates = useMemo(() => {
    try {
      if (!currentRuleString) return [];
      // Add dtstart to calculate preview from today
      const rule = RRule.fromString(`DTSTART:${format(new Date(), "yyyyMMdd'T'HHmmss'Z'")}\nRRULE:${currentRuleString}`);
      const nextYear = new Date();
      nextYear.setFullYear(nextYear.getFullYear() + 1);
      return rule.between(new Date(), nextYear, true).slice(0, 4);
    } catch (e) {
      return [];
    }
  }, [currentRuleString]);

  async function onSubmit(values: FormValues) {
    if (!user) return;
    setLoading(true);

    try {
      if (!currentRuleString) {
        toast.error("Regra de recorrência inválida.");
        setLoading(false);
        return;
      }

      if (values.frequency === "WEEKLY" && (!values.byweekday || values.byweekday.length === 0)) {
        toast.error("Selecione pelo menos um dia da semana.");
        setLoading(false);
        return;
      }

      const payload: CreateRecurrenceDTO = {
        ruleRrule: currentRuleString,
        templateData: {
          accountId: values.accountId,
          categoryId: values.categoryId,
          description: values.description,
          amount: values.amount,
          type: values.type,
          status: "CONFIRMED",
        },
        active: values.active,
      };

      await createRecurrence(payload);
      toast.success("Recorrência criada com sucesso!");
      form.reset();
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to create recurrence", error);
      toast.error("Erro ao salvar recorrência. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  const typeConfig = {
    INCOME: { label: "Receita", color: "text-emerald-600 bg-emerald-50 border-emerald-200", icon: ArrowUpCircle },
    EXPENSE: { label: "Despesa", color: "text-rose-600 bg-rose-50 border-rose-200", icon: ArrowDownCircle },
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] bg-white rounded-t-3xl sm:rounded-3xl border-none shadow-2xl p-4 sm:p-8 max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
        <DialogHeader className="mb-4 sm:mb-6">
          <DialogTitle className="text-xl sm:text-2xl font-black text-zinc-900 tracking-tight flex items-center gap-2">
            <Repeat className="text-emerald-500" size={24} />
            Nova Recorrência
          </DialogTitle>
          <p className="text-sm text-zinc-400 font-medium">
            Configure um agendamento automático para seus lançamentos.
          </p>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            {/* Type selector */}
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-black uppercase tracking-widest text-zinc-400">Tipo</FormLabel>
                  <div className="grid grid-cols-2 gap-2">
                    {(Object.keys(typeConfig) as Array<keyof typeof typeConfig>).map((t) => {
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

            {/* Description & Amount */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-black uppercase tracking-widest text-zinc-400">Descrição</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: Netflix, Salário..."
                        className="h-11 rounded-xl bg-zinc-50 border-zinc-200 font-medium focus-visible:ring-emerald-500"
                        {...field}
                      />
                    </FormControl>
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
                        placeholder="0,00"
                        className="h-11 rounded-xl font-black text-zinc-900 bg-zinc-50 border-zinc-200 focus-visible:ring-emerald-500"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Account & Category */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="accountId"
                render={({ field }) => (
                  <FormItem className="min-w-0 flex flex-col">
                    <FormLabel className="text-xs font-black uppercase tracking-widest text-zinc-400">Conta</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ? String(field.value) : undefined}>
                      <FormControl>
                        <SelectTrigger className="h-11 rounded-xl bg-zinc-50 border-zinc-200 font-medium overflow-hidden">
                          <SelectValue placeholder="Selecione..." className="truncate" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-white rounded-xl shadow-lg border-zinc-100 max-h-60 overflow-y-auto w-full">
                        {accounts.map((acc) => (
                          <SelectItem key={acc.id} value={String(acc.id)} className="font-medium min-w-0">
                            <span className="flex items-center gap-2 truncate pr-2">
                              <Landmark size={14} className="text-zinc-500 shrink-0" />
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

              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem className="min-w-0 flex flex-col">
                    <FormLabel className="text-xs font-black uppercase tracking-widest text-zinc-400">Categoria</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ? String(field.value) : undefined}>
                      <FormControl>
                        <SelectTrigger className="h-11 rounded-xl bg-zinc-50 border-zinc-200 font-medium overflow-hidden">
                          <SelectValue placeholder="Selecione..." className="truncate" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-white rounded-xl shadow-lg border-zinc-100 max-h-60 overflow-y-auto w-full">
                        {filteredCategories.map((cat) => (
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
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="bg-zinc-50/50 p-4 rounded-2xl border border-zinc-100 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <CalendarDays size={16} className="text-zinc-400" />
                <h3 className="text-sm font-black text-zinc-700">Configuração de Repetição</h3>
              </div>

              {/* Frequency */}
              <FormField
                control={form.control}
                name="frequency"
                render={({ field }) => (
                  <FormItem className="min-w-0 flex flex-col">
                    <FormLabel className="text-xs font-black uppercase tracking-widest text-zinc-400">Frequência</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-11 rounded-xl bg-white border-zinc-200 font-medium overflow-hidden">
                          <SelectValue placeholder="Selecione..." className="truncate" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-white rounded-xl shadow-lg border-zinc-100 max-h-60 overflow-y-auto w-full">
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

              {/* Weekly Days */}
              {frequency === "WEEKLY" && (
                <FormField
                  control={form.control}
                  name="byweekday"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-black uppercase tracking-widest text-zinc-400">Quais dias?</FormLabel>
                      <div className="flex gap-2">
                        {WEEKDAYS.map((day) => {
                          const isSelected = field.value?.includes(day.id);
                          return (
                            <button
                              key={day.id}
                              type="button"
                              onClick={() => {
                                const current = field.value || [];
                                const next = isSelected
                                  ? current.filter((id) => id !== day.id)
                                  : [...current, day.id];
                                field.onChange(next);
                              }}
                              className={`w-10 h-10 rounded-full text-sm font-bold transition-all border-2 flex items-center justify-center ${
                                isSelected
                                  ? "bg-zinc-900 text-white border-zinc-900"
                                  : "bg-white border-zinc-200 text-zinc-500 hover:border-zinc-300"
                              }`}
                            >
                              {day.label}
                            </button>
                          );
                        })}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Monthly Day */}
              {frequency === "MONTHLY" && (
                <FormField
                  control={form.control}
                  name="bymonthday"
                  render={({ field }) => (
                    <FormItem className="min-w-0 flex flex-col">
                      <FormLabel className="text-xs font-black uppercase tracking-widest text-zinc-400">Dia do Mês</FormLabel>
                      <Select
                        onValueChange={(v) => field.onChange(Number(v))}
                        value={field.value ? String(field.value) : undefined}
                      >
                        <FormControl>
                          <SelectTrigger className="h-11 rounded-xl bg-white border-zinc-200 font-medium overflow-hidden">
                            <SelectValue placeholder="Selecione o dia" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-white rounded-xl shadow-lg border-zinc-100 max-h-60 overflow-y-auto w-full grid grid-cols-4 p-2 gap-1">
                          {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                            <SelectItem key={day} value={String(day)} className="justify-center rounded-lg cursor-pointer">
                              {day}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Preview */}
              {previewDates.length > 0 && (
                <div className="mt-4 p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                  <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Check size={14} /> Pré-visualização
                  </p>
                  <ul className="text-sm font-medium text-emerald-800 space-y-1">
                    {previewDates.map((d, i) => (
                      <li key={i}>• {format(d, "dd 'de' MMMM, yyyy", { locale: ptBR })}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Active Toggle */}
            <FormField
              control={form.control}
              name="active"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-xl border border-zinc-100 bg-white p-4 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel className="text-sm font-bold text-zinc-900">Ativar Regra</FormLabel>
                    <p className="text-xs text-zinc-500 font-medium">As transações serão geradas automaticamente.</p>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      className="data-[state=checked]:bg-emerald-500"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl font-black text-sm bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg mt-2 transition-all active:scale-[0.98]"
            >
              {loading ? "Salvando..." : "Criar Recorrência"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
