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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { type Account } from "@/features/dashboard/services/account.service";
import { type Category } from "@/features/dashboard/services/category.service";
import { type Responsible } from "@/features/dashboard/services/responsible.service";
import { Filter, FileText } from "lucide-react";
import { reportFilterSchema, type ReportFilterFilters } from "../services/reports.service";

export interface FormFilterData extends ReportFilterFilters {
  groupBy: "none" | "category" | "responsible" | "account";
}

const uiFilterSchema = reportFilterSchema.extend({
  groupBy: z.enum(["none", "category", "responsible", "account"]),
});

interface ReportsFilterFormProps {
  accounts: Account[];
  categories: Category[];
  responsibles: Responsible[];
  onSubmitFilters: (filters: FormFilterData) => void;
  isLoading: boolean;
  onExportPdf: () => void;
}

export function ReportsFilterForm({
  accounts,
  categories,
  responsibles,
  onSubmitFilters,
  isLoading,
  onExportPdf,
}: ReportsFilterFormProps) {
  const form = useForm<FormFilterData>({
    resolver: zodResolver(uiFilterSchema) as any,
    defaultValues: {
      groupBy: "none",
      startDate: "",
      endDate: "",
      accountId: undefined,
      categoryId: undefined,
      responsibleId: undefined,
      type: undefined,
      status: undefined,
    },
  });

  return (
    <div className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm w-full">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-black text-zinc-900 flex items-center gap-2">
          <Filter size={18} className="text-emerald-500" /> Filtros do Relatório
        </h3>
        <Button 
          variant="outline" 
          onClick={onExportPdf}
          disabled={isLoading}
          className="rounded-xl font-bold bg-white text-emerald-600 border-zinc-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 transition-all shadow-sm"
        >
          <FileText size={16} className="mr-2" />
          Exportar PDF
        </Button>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmitFilters)} className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            
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
                        <SelectValue placeholder="Resumo Geral" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-white rounded-xl shadow-lg border-zinc-100">
                      <SelectItem value="none" className="font-medium">Resumo Geral</SelectItem>
                      <SelectItem value="category" className="font-medium">Por Categoria</SelectItem>
                      <SelectItem value="responsible" className="font-medium">Por Responsável</SelectItem>
                      <SelectItem value="account" className="font-medium">Por Conta</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

             {/* Type */}
             <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-black uppercase tracking-widest text-zinc-400">Tipo de Transação</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || "ALL"}>
                    <FormControl>
                      <SelectTrigger className="h-11 rounded-xl bg-zinc-50 border-zinc-200 font-medium text-zinc-900">
                        <SelectValue placeholder="Todos os Tipos" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-white rounded-xl shadow-lg border-zinc-100">
                      <SelectItem value="ALL" className="font-medium">Todos os Tipos</SelectItem>
                      <SelectItem value="INCOME" className="font-medium text-emerald-600">Receita</SelectItem>
                      <SelectItem value="EXPENSE" className="font-medium text-rose-500">Despesa</SelectItem>
                      <SelectItem value="TRANSFER" className="font-medium text-blue-500">Transferência</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            {/* Start Date */}
            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-black uppercase tracking-widest text-zinc-400">Data Inicial</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      className="h-11 rounded-xl bg-zinc-50 border-zinc-200 font-medium text-zinc-900 shadow-none focus-visible:ring-emerald-500"
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* End Date */}
            <FormField
              control={form.control}
              name="endDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-black uppercase tracking-widest text-zinc-400">Data Final</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      className="h-11 rounded-xl bg-zinc-50 border-zinc-200 font-medium text-zinc-900 shadow-none focus-visible:ring-emerald-500"
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Account */}
            <FormField
              control={form.control}
              name="accountId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-black uppercase tracking-widest text-zinc-400">Conta/Cartão</FormLabel>
                  <Select onValueChange={(val) => field.onChange(val === "ALL" ? undefined : Number(val))} value={field.value?.toString() || "ALL"}>
                    <FormControl>
                      <SelectTrigger className="h-11 rounded-xl bg-zinc-50 border-zinc-200 font-medium font-zinc-900">
                        <SelectValue placeholder="Todas as Contas" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-white rounded-xl shadow-lg border-zinc-100 max-h-60 overflow-y-auto">
                      <SelectItem value="ALL" className="font-medium">Todas as Contas</SelectItem>
                      {accounts.map(acc => (
                        <SelectItem key={acc.id} value={acc.id.toString()} className="font-medium text-zinc-800">
                          {acc.name}
                        </SelectItem>
                      ))}
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
                  <FormLabel className="text-xs font-black uppercase tracking-widest text-zinc-400">Categoria</FormLabel>
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
                  <FormLabel className="text-xs font-black uppercase tracking-widest text-zinc-400">Responsável</FormLabel>
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

            {/* Status */}
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-black uppercase tracking-widest text-zinc-400">Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || "ALL"}>
                    <FormControl>
                      <SelectTrigger className="h-11 rounded-xl bg-zinc-50 border-zinc-200 font-medium text-zinc-900">
                        <SelectValue placeholder="Qualquer Status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-white rounded-xl shadow-lg border-zinc-100">
                      <SelectItem value="ALL" className="font-medium">Qualquer Status</SelectItem>
                      <SelectItem value="PENDING" className="font-medium text-amber-600">Pendente</SelectItem>
                      <SelectItem value="CONFIRMED" className="font-medium text-emerald-600">Confirmado</SelectItem>
                      <SelectItem value="RECONCILED" className="font-medium text-blue-600">Conciliado</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              disabled={isLoading}
              className="h-11 px-8 rounded-xl bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 hover:shadow-emerald-600/30 transition-all text-[15px]"
            >
              {isLoading ? "Processando..." : "Gerar Dados do Relatório"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
