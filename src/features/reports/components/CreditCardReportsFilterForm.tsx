import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { type Account } from "@/features/dashboard/services/account.service";
import { type Category } from "@/features/dashboard/services/category.service";
import { type Responsible } from "@/features/dashboard/services/responsible.service";
import { getStatements, type Statement } from "@/features/dashboard/services/credit-card.service";
import { FileText, Loader2, CreditCard, Mail } from "lucide-react";
import { type FormFilterData } from "./ReportsFilterForm";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

const creditCardUiFilterSchema = z.object({
  accountId: z.coerce.number().optional(), // undefined means ALL
  statementId: z.coerce.number().optional(),
  referenceMonth: z.string().optional(),
  groupBy: z.enum(["none", "category", "responsible", "account"]).default("none"),
  categoryId: z.coerce.number().optional(),
  responsibleId: z.coerce.number().optional(),
  layoutMode: z.enum(["SIMPLE"]).default("SIMPLE"),
});

type CreditCardFormValues = z.infer<typeof creditCardUiFilterSchema>;

interface CreditCardReportsFilterFormProps {
  accounts: Account[]; // Devemos receber as contas e filtraremos as de crédito aqui
  categories: Category[];
  responsibles: Responsible[];
  onSubmitFilters: (filters: FormFilterData) => void;
  isLoading: boolean;
  onExportPdf: () => void;
  onSendEmail: () => void;
}

export function CreditCardReportsFilterForm({
  accounts,
  categories,
  responsibles,
  onSubmitFilters,
  isLoading,
  onExportPdf,
  onSendEmail,
}: CreditCardReportsFilterFormProps) {
  
  const creditCards = accounts.filter(a => a.type === "CREDIT_CARD");
  
  const [statements, setStatements] = useState<Statement[]>([]);
  const [loadingStatements, setLoadingStatements] = useState(false);

  const form = useForm<CreditCardFormValues>({
    resolver: zodResolver(creditCardUiFilterSchema) as any,
    defaultValues: {
      groupBy: "none",
      layoutMode: "SIMPLE",
      accountId: undefined,
      statementId: undefined,
      referenceMonth: format(new Date(), "yyyy-MM"),
      categoryId: undefined,
      responsibleId: undefined,
    },
  });

  const selectedAccountId = form.watch("accountId");

  // Fetch statements whenever a credit card is selected
  useEffect(() => {
    if (selectedAccountId && !isNaN(selectedAccountId)) {
      setLoadingStatements(true);
      form.setValue("statementId", undefined as any); // Reset statement when card changes
      
      getStatements(selectedAccountId)
        .then(data => {
          // Sort statements by start date descending
          const sorted = data.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
          setStatements(sorted);
        })
        .catch(console.error)
        .finally(() => setLoadingStatements(false));
    } else {
      setStatements([]);
    }
  }, [selectedAccountId, form]);

  const handleSubmit = (values: CreditCardFormValues) => {
    let startDate = "";
    let endDate = "";
    let customLabel = "";

    // Múltiplos Cartões
    if (!values.accountId) {
      if (!values.referenceMonth) {
        toast.error("Selecione o mês de referência");
        return;
      }
      const [year, month] = values.referenceMonth.split("-");
      const firstDay = new Date(Number(year), Number(month) - 1, 1);
      const lastDay = new Date(Number(year), Number(month), 0);
      
      startDate = format(firstDay, "yyyy-MM-dd");
      endDate = format(lastDay, "yyyy-MM-dd");
      
      const monthName = format(firstDay, "MMMM/yyyy", { locale: ptBR });
      customLabel = `Todas as Faturas de Crédito - ${monthName.charAt(0).toUpperCase() + monthName.slice(1)}`;
    } 
    // Cartão Específico
    else {
      const statement = statements.find(s => s.id === values.statementId);
      if (!statement) {
        toast.error("Selecione uma fatura do cartão");
        return;
      }
      startDate = statement.startDate.split("T")[0];
      endDate = statement.endDate.split("T")[0];
      customLabel = `Fatura de ${getStatementLabel(statement)}`;
    }

    // Convert local logic to global FormFilterData expectations
    const filterData: FormFilterData = {
      accountId: values.accountId,
      accountType: "CREDIT_CARD",
      startDate,
      endDate,
      groupBy: values.accountId ? (values.groupBy === "account" ? "category" : values.groupBy) : values.groupBy,
      layoutMode: values.layoutMode,
      categoryId: values.categoryId,
      responsibleId: values.responsibleId,
      // Fixado EXPENSE e Status OPEN/CONFIRMED para reports simplificados
      type: "EXPENSE",
      customDateRangeLabel: customLabel,
    };

    onSubmitFilters(filterData);
  };

  const getStatementLabel = (s: Statement) => {
    const monthName = format(new Date(s.dueDate), "MMMM/yyyy", { locale: ptBR });
    const capitalized = monthName.charAt(0).toUpperCase() + monthName.slice(1);
    const StatusMap: Record<string, string> = {
      OPEN: 'Aberta',
      CLOSED: 'Fechada',
      PAID: 'Paga',
      PARTIALLY_PAID: 'Parcial'
    };
    return `${capitalized} - ${StatusMap[s.status] || s.status}`;
  };

  return (
    <div className="bg-white p-6 rounded-b-3xl rounded-tr-3xl border border-zinc-100 shadow-sm w-full">
      <div className="flex flex-col gap-4 mb-6">
        <h3 className="text-lg font-black text-zinc-900 flex items-center gap-2">
          <CreditCard size={18} className="text-indigo-500 shrink-0" /> Relatório de Fatura
        </h3>
        <div className="grid grid-cols-2 gap-2 w-full">
          <Button 
            type="button"
            variant="outline" 
            onClick={onSendEmail}
            disabled={isLoading}
            className="rounded-xl font-bold bg-white text-blue-600 border-zinc-200 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-all shadow-sm w-full"
          >
            <Mail size={16} className="mr-2 shrink-0" />
            E-mail
          </Button>
          <Button 
            type="button"
            variant="outline" 
            onClick={onExportPdf}
            disabled={isLoading}
            className="rounded-xl font-bold bg-white text-indigo-600 border-zinc-200 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 transition-all shadow-sm w-full truncate"
          >
            <FileText size={16} className="mr-2 shrink-0" />
            PDF
          </Button>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 gap-4">

            {/* Credit Card Account */}
            <FormField
              control={form.control}
              name="accountId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-black uppercase tracking-widest text-zinc-400">Cartão de Crédito</FormLabel>
                   <Select onValueChange={(val) => field.onChange(val === "ALL" ? undefined : Number(val))} value={field.value?.toString() || "ALL"}>
                    <FormControl>
                      <SelectTrigger className="h-11 rounded-xl bg-zinc-50 border-zinc-200 font-medium font-zinc-900">
                        <SelectValue placeholder="Selecione um Cartão" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-white rounded-xl shadow-lg border-zinc-100 max-h-60 overflow-y-auto">
                      <SelectItem value="ALL" className="font-bold text-indigo-600">Todos os Cartões</SelectItem>
                      {creditCards.map(acc => (
                        <SelectItem key={acc.id} value={acc.id.toString()} className="font-medium text-zinc-800">
                          {acc.name}
                        </SelectItem>
                      ))}
                      {creditCards.length === 0 && (
                        <p className="p-3 text-sm text-zinc-500">Nenhum cartão cadastrado.</p>
                      )}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            {/* Statement / Fatura ou Mês Genérico */}
            {!selectedAccountId ? (
              <FormField
                control={form.control}
                name="referenceMonth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-black uppercase tracking-widest text-zinc-400">
                      Mês de Referência
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <input 
                          type="month"
                          onChange={field.onChange}
                          value={field.value || ""}
                          className="h-11 w-full rounded-xl bg-zinc-50 border border-zinc-200 px-3 font-medium text-zinc-900 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-zinc-400"
                        />
                      </div>
                    </FormControl>
                  </FormItem>
                )}
              />
            ) : (
              <FormField
                control={form.control}
                name="statementId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-black uppercase tracking-widest text-zinc-400 flex justify-between">
                      Fatura Exata do Cartão
                      {loadingStatements && <Loader2 size={12} className="animate-spin text-indigo-500" />}
                    </FormLabel>
                    <Select 
                      onValueChange={(val) => field.onChange(Number(val))} 
                      value={field.value?.toString() || ""}
                      disabled={loadingStatements}
                    >
                      <FormControl>
                        <SelectTrigger className="h-11 rounded-xl bg-zinc-50 border-zinc-200 font-medium font-zinc-900">
                          <SelectValue placeholder="Selecione o mês" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-white rounded-xl shadow-lg border-zinc-100 max-h-60 overflow-y-auto">
                        {statements.map(stmt => (
                          <SelectItem key={stmt.id} value={stmt.id.toString()} className="font-medium text-zinc-800">
                            {getStatementLabel(stmt)}
                          </SelectItem>
                        ))}
                        {statements.length === 0 && !loadingStatements && (
                          <p className="p-3 text-sm text-zinc-500">Nenhuma fatura encontrada.</p>
                        )}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            )}
            
            {/* Group By */}
            <FormField
              control={form.control}
              name="groupBy"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-black uppercase tracking-widest text-zinc-400">Agrupamento</FormLabel>
                   <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-11 rounded-xl bg-zinc-50 border-zinc-200 font-medium font-zinc-900">
                        <SelectValue placeholder="Extrato Detalhado" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-white rounded-xl shadow-lg border-zinc-100">
                      <SelectItem value="none" className="font-medium">Extrato Detalhado</SelectItem>
                      <SelectItem value="category" className="font-medium">Por Categoria</SelectItem>
                      <SelectItem value="responsible" className="font-medium">Por Responsável</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            {/* Category */}
            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-black uppercase tracking-widest text-zinc-400">Categoria (Opcional)</FormLabel>
                  <Select onValueChange={(val) => field.onChange(val === "ALL" ? undefined : Number(val))} value={field.value?.toString() || "ALL"}>
                    <FormControl>
                      <SelectTrigger className="h-11 rounded-xl bg-zinc-50 border-zinc-200 font-medium font-zinc-900">
                        <SelectValue placeholder="Todas as Categorias" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-white rounded-xl shadow-lg border-zinc-100 max-h-60 overflow-y-auto">
                      <SelectItem value="ALL" className="font-medium">Todas as Categorias</SelectItem>
                      {categories.map(cat => (
                        <SelectItem key={cat.id} value={cat.id.toString()} className="font-medium text-zinc-800">
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            {/* Responsible */}
            <FormField
              control={form.control}
              name="responsibleId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-black uppercase tracking-widest text-zinc-400">Responsável (Opcional)</FormLabel>
                   <Select onValueChange={(val) => field.onChange(val === "ALL" ? undefined : Number(val))} value={field.value?.toString() || "ALL"}>
                    <FormControl>
                      <SelectTrigger className="h-11 rounded-xl bg-zinc-50 border-zinc-200 font-medium font-zinc-900">
                        <SelectValue placeholder="Todos os Responsáveis" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-white rounded-xl shadow-lg border-zinc-100 max-h-60 overflow-y-auto">
                      <SelectItem value="ALL" className="font-medium">Todos os Responsáveis</SelectItem>
                      {responsibles.map(resp => (
                        <SelectItem key={resp.id} value={resp.id.toString()} className="font-medium text-zinc-800">
                          {resp.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

          </div>

          <div className="flex justify-end pt-4">
            <Button
              type="submit"
              disabled={isLoading || (selectedAccountId && !form.watch("statementId")) || (!selectedAccountId && !form.watch("referenceMonth"))}
              className="h-11 px-8 rounded-xl bg-indigo-500 text-white font-bold shadow-lg shadow-indigo-500/20 hover:bg-indigo-600 hover:shadow-indigo-600/30 transition-all text-[15px] w-full"
            >
              {isLoading ? "Processando..." : "Bater Fatura"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
