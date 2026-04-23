import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ArrowDownCircle,
  ArrowLeft,
  ArrowUpCircle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  CreditCard,
  Landmark,
  Loader2,
  Pencil,
  Power,
  Repeat,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"; import { AccountType, getAccounts, type Account } from "../services/account.service";
import { getCategories, type Category } from "../services/category.service";
import { getResponsibles, type Responsible } from "../services/responsible.service";
import {
  deleteRecurrence,
  getRecurrences,
  setRecurrenceActive,
  updateRecurrence,
  type Recurrence,
  type TransactionStatus,
  type TransactionType,
} from "../services/recurrence.service";
import {
  buildRecurrenceRule,
  defaultRecurrenceStartDate,
  getRecurrencePreviewDates,
  parseRecurrenceRule,
  recurrenceRuleSummary,
  toRRuleExpression,
  validateRecurrenceRule,
  WEEKDAY_OPTIONS,
  type RecurrenceEndMode,
  type RecurrenceFrequency,
  type RecurrenceRuleFormModel,
  type WeekdayId,
} from "../utils/recurrenceRule";

interface EditRecurrenceState {
  id: number;
  description: string;
  amount: number;
  accountId: number;
  type: TransactionType;
  status: TransactionStatus;
  categoryId: number;
  responsibleId: number;
  notes: string;
  active: boolean;
  model: RecurrenceRuleFormModel;
  advancedMode: boolean;
  rawRule: string;
}

const typeLabelMap: Record<TransactionType, string> = {
  INCOME: "Receita",
  EXPENSE: "Despesa",
  TRANSFER: "Transferencia",
  ADJUSTMENT: "Ajuste",
};

const typeOptionConfig: Record<"INCOME" | "EXPENSE", { label: string; icon: typeof ArrowUpCircle }> = {
  INCOME: { label: "Receita", icon: ArrowUpCircle },
  EXPENSE: { label: "Despesa", icon: ArrowDownCircle },
};

const statusOptionConfig: Record<TransactionStatus, { label: string; icon: typeof CheckCircle2 }> = {
  CONFIRMED: { label: "Confirmado", icon: CheckCircle2 },
  PENDING: { label: "Pendente", icon: Clock3 },
  RECONCILED: { label: "Conciliado", icon: ShieldCheck },
};

const IncomeTypeIcon = typeOptionConfig.INCOME.icon;
const ExpenseTypeIcon = typeOptionConfig.EXPENSE.icon;
const ConfirmedStatusIcon = statusOptionConfig.CONFIRMED.icon;
const PendingStatusIcon = statusOptionConfig.PENDING.icon;
const ReconciledStatusIcon = statusOptionConfig.RECONCILED.icon;

function fallbackModelFromNow(): RecurrenceRuleFormModel {
  const today = defaultRecurrenceStartDate();
  return {
    frequency: "MONTHLY",
    interval: 1,
    startDate: today,
    endMode: "NEVER",
    byweekday: [],
    bymonthday: Number(today.split("-")[2]),
  };
}

export default function RecurrencesPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toggleLoadingId, setToggleLoadingId] = useState<number | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [recurrences, setRecurrences] = useState<Recurrence[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [responsibles, setResponsibles] = useState<Responsible[]>([]);

  const [visibleCount, setVisibleCount] = useState(12);

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editing, setEditing] = useState<EditRecurrenceState | null>(null);

  async function loadAll() {
    if (!user) return;

    setLoading(true);
    try {
      const [list, accs, cats, resps] = await Promise.all([
        getRecurrences(user.id),
        getAccounts(user.id),
        getCategories(user.id),
        getResponsibles(user.id),
      ]);

      setRecurrences(list);
      setAccounts(accs.filter((account) => account.isActive));
      setCategories(cats);
      setResponsibles(resps.filter((responsible) => responsible.isActive));
    } catch (error) {
      console.error("Failed to load recurrences", error);
      toast.error("Erro ao carregar recorrencias.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, [user]);

  const accountById = useMemo(() => {
    return new Map(accounts.map((account) => [account.id, account]));
  }, [accounts]);

  const recurrenceSummaryById = useMemo(() => {
    const map = new Map<number, string>();

    for (const recurrence of recurrences) {
      try {
        const parsed = parseRecurrenceRule(recurrence.ruleRrule);
        if (parsed.advancedRequired) {
          map.set(recurrence.id, toRRuleExpression(parsed.rawRule));
        } else {
          map.set(recurrence.id, recurrenceRuleSummary(parsed.model));
        }
      } catch {
        map.set(recurrence.id, recurrence.ruleRrule);
      }
    }

    return map;
  }, [recurrences]);

  const visibleRecurrences = useMemo(() => {
    return recurrences.slice(0, visibleCount);
  }, [recurrences, visibleCount]);

  const canShowMore = visibleCount < recurrences.length;

  const editRulePreview = useMemo(() => {
    if (!editing) {
      return { rule: "", expression: "", summary: "", error: null as string | null, previewDates: [] as Date[] };
    }

    try {
      const rule = editing.advancedMode
        ? editing.rawRule.trim()
        : buildRecurrenceRule(editing.model);

      const validationError = validateRecurrenceRule(rule);
      return {
        rule,
        expression: toRRuleExpression(rule),
        summary: editing.advancedMode ? "Modo avancado" : recurrenceRuleSummary(editing.model),
        error: validationError,
        previewDates: validationError ? [] : getRecurrencePreviewDates(rule, 4),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao montar a RRULE.";
      return {
        rule: "",
        expression: "",
        summary: "",
        error: message,
        previewDates: [] as Date[],
      };
    }
  }, [editing]);

  function openEditDialog(recurrence: Recurrence) {
    const templateData = recurrence.templateData;

    let parsedModel = fallbackModelFromNow();
    let advancedMode = false;
    let rawRule = recurrence.ruleRrule;

    try {
      const parsed = parseRecurrenceRule(recurrence.ruleRrule);
      parsedModel = parsed.model;
      advancedMode = parsed.advancedRequired;
      rawRule = parsed.rawRule;
    } catch {
      advancedMode = true;
    }

    setEditing({
      id: recurrence.id,
      description: templateData.description || "",
      amount: Number(templateData.amount || 0),
      accountId: Number(templateData.accountId || 0),
      type: templateData.type || "EXPENSE",
      status: templateData.status || "CONFIRMED",
      categoryId: Number(templateData.categoryId || 0),
      responsibleId: Number(templateData.responsibleId || 0),
      notes: templateData.notes || "",
      active: recurrence.active,
      model: parsedModel,
      advancedMode,
      rawRule,
    });

    setIsEditOpen(true);
  }

  async function handleSaveEdit() {
    if (!editing) return;

    if (!editing.description.trim()) {
      toast.error("Descricao obrigatoria.");
      return;
    }

    if (editing.amount <= 0) {
      toast.error("Valor deve ser maior que zero.");
      return;
    }

    if (!editing.accountId) {
      toast.error("Selecione uma conta.");
      return;
    }

    if (!editing.advancedMode) {
      if (editing.model.frequency === "WEEKLY" && editing.model.byweekday.length === 0) {
        toast.error("Selecione ao menos um dia da semana.");
        return;
      }

      if (editing.model.frequency === "MONTHLY" && !editing.model.bymonthday) {
        toast.error("Selecione um dia do mes para recorrencia mensal.");
        return;
      }

      if (editing.model.endMode === "UNTIL" && !editing.model.untilDate) {
        toast.error("Informe a data final da recorrencia.");
        return;
      }

      if (editing.model.endMode === "COUNT" && !editing.model.count) {
        toast.error("Informe a quantidade de ocorrencias.");
        return;
      }
    }

    const ruleToSave = editing.advancedMode
      ? editing.rawRule.trim()
      : buildRecurrenceRule(editing.model);

    const validationError = validateRecurrenceRule(ruleToSave);
    if (validationError) {
      toast.error(`RRULE invalida: ${validationError}`);
      return;
    }

    setSaving(true);
    try {
      const updated = await updateRecurrence(editing.id, {
        ruleRrule: ruleToSave,
        active: editing.active,
        templateData: {
          description: editing.description.trim(),
          amount: Number(editing.amount),
          accountId: Number(editing.accountId),
          type: editing.type,
          status: editing.status,
          categoryId: editing.categoryId > 0 ? editing.categoryId : undefined,
          responsibleId: editing.responsibleId > 0 ? editing.responsibleId : undefined,
          notes: editing.notes.trim() || undefined,
        },
      });

      setRecurrences((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setIsEditOpen(false);
      setEditing(null);
      toast.success("Recorrencia atualizada com sucesso!");
    } catch (error) {
      console.error("Failed to update recurrence", error);
      toast.error("Erro ao atualizar recorrencia.");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(recurrence: Recurrence) {
    setToggleLoadingId(recurrence.id);
    try {
      const updated = await setRecurrenceActive(recurrence.id, !recurrence.active);
      setRecurrences((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      toast.success(updated.active ? "Recorrencia ativada." : "Recorrencia desativada.");
    } catch (error) {
      console.error("Failed to toggle recurrence", error);
      toast.error("Erro ao alterar status da recorrencia.");
    } finally {
      setToggleLoadingId(null);
    }
  }

  async function handleDeleteRecurrence(recurrence: Recurrence) {
    setDeleteLoading(true);
    try {
      await deleteRecurrence(recurrence.id);
      setRecurrences((prev) => prev.filter((item) => item.id !== recurrence.id));
      toast.success("Recorrencia excluida.");
    } catch (error) {
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status === 409) {
        toast.error("Nao foi possivel excluir por vinculos existentes. Desative a recorrencia em vez de excluir.");
      } else {
        toast.error("Erro ao excluir recorrencia.");
      }
    } finally {
      setDeleteLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-emerald-500" size={40} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-zinc-900 tracking-tight flex items-center gap-2">
            Gestao de Recorrencias
          </h1>
          <p className="text-zinc-400 text-sm font-medium mt-0.5">
            {recurrences.length} regra{recurrences.length !== 1 ? "s" : ""} cadastrada{recurrences.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-zinc-100 shadow-sm overflow-hidden">
        {recurrences.length === 0 ? (
          <div className="p-12 text-center">
            <Repeat className="mx-auto text-zinc-300 mb-4" size={42} />
            <h3 className="text-lg font-bold text-zinc-900">Nenhuma recorrencia cadastrada</h3>
            <p className="text-zinc-400 text-sm mt-1">
              Crie uma transacao com o toggle Recorrente ativo para registrar novas regras.
            </p>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="bg-white hover:bg-white border-b-zinc-200">
                  <TableHead className="px-6 py-4 text-[11px] uppercase tracking-widest text-zinc-500 font-black">Descrição</TableHead>
                  <TableHead className="px-4 py-4 text-[11px] uppercase tracking-widest text-zinc-500 font-black">Valor</TableHead>
                  <TableHead className="px-4 py-4 text-[11px] uppercase tracking-widest text-zinc-500 font-black">Conta</TableHead>
                  <TableHead className="px-4 py-4 text-[11px] uppercase tracking-widest text-zinc-500 font-black">Tipo</TableHead>
                  <TableHead className="px-4 py-4 text-[11px] uppercase tracking-widest text-zinc-500 font-black">Status</TableHead>
                  <TableHead className="px-4 py-4 text-[11px] uppercase tracking-widest text-zinc-500 font-black">Resumo</TableHead>
                  <TableHead className="px-4 py-4 text-[11px] uppercase tracking-widest text-zinc-500 font-black">Ultima Geração</TableHead>
                  <TableHead className="px-6 py-4 text-[11px] uppercase tracking-widest text-zinc-500 font-black text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleRecurrences.map((recurrence) => {
                  const account = accountById.get(recurrence.templateData.accountId);
                  const type = recurrence.templateData.type || "EXPENSE";
                  const isExpense = type === "EXPENSE";

                  return (
                    <TableRow key={recurrence.id} className={`group hover:bg-zinc-50/80 transition-all duration-300 border-b border-zinc-100/80 ${!recurrence.active ? "opacity-60 hover:opacity-100" : ""}`}>
                      <TableCell className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform duration-300 group-hover:scale-110 ${isExpense ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                            {isExpense ? <ArrowDownCircle size={18} /> : <ArrowUpCircle size={18} />}
                          </div>
                          <p className="text-sm font-bold text-zinc-900 max-w-[180px] truncate">
                            {recurrence.templateData.description || "Sem descricao"}
                          </p>
                        </div>
                      </TableCell>

                      <TableCell className="px-4 py-4 text-sm font-semibold tabular-nums whitespace-nowrap text-zinc-500">
                        R$ {Number(recurrence.templateData.amount || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </TableCell>

                      <TableCell className="px-4 py-4 text-sm font-medium text-zinc-500">
                        {account?.name || `Conta #${recurrence.templateData.accountId}`}
                      </TableCell>

                      <TableCell className="px-4 py-4">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${isExpense ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"}`}>
                          {isExpense ? <ArrowDownCircle size={10} /> : <ArrowUpCircle size={10} />}
                          {typeLabelMap[type] ?? type}
                        </span>
                      </TableCell>

                      <TableCell className="px-4 py-4">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border ${recurrence.active ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-zinc-50 text-zinc-500 border-zinc-200"}`}>
                          {recurrence.active ? <CheckCircle2 size={10} /> : <Power size={10} />}
                          {recurrence.active ? "Ativa" : "Inativa"}
                        </span>
                      </TableCell>

                      <TableCell className="px-4 py-4 text-sm font-medium text-zinc-500 max-w-[250px] whitespace-normal">
                        {recurrenceSummaryById.get(recurrence.id) || "-"}
                      </TableCell>

                      <TableCell className="px-4 py-4 text-sm font-medium text-zinc-500 whitespace-nowrap">
                        {recurrence.lastGeneratedDate
                          ? format(parseISO(recurrence.lastGeneratedDate), "dd/MM/yyyy", { locale: ptBR })
                          : "Ainda nao gerou"}
                      </TableCell>

                      <TableCell className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1 opacity-100 md:opacity-0 md:-translate-x-3 md:group-hover:opacity-100 md:group-hover:translate-x-0 transition-all duration-300">
                          <button onClick={() => openEditDialog(recurrence)} className="w-8 h-8 rounded-xl flex items-center justify-center text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors" title="Editar">
                            <Pencil size={15} />
                          </button>
                          <button onClick={() => handleToggleActive(recurrence)} disabled={toggleLoadingId === recurrence.id} className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${recurrence.active ? 'text-zinc-400 hover:text-amber-600 hover:bg-amber-50' : 'text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50'}`} title={recurrence.active ? "Desativar" : "Ativar"}>
                            {toggleLoadingId === recurrence.id ? <Loader2 size={15} className="animate-spin" /> : <Power size={15} />}
                          </button>
                          <button onClick={() => handleDeleteRecurrence(recurrence)} disabled={deleteLoading} className="w-8 h-8 rounded-xl flex items-center justify-center text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition-colors" title="Excluir">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {canShowMore && (
              <div className="p-4 border-t border-zinc-100 flex justify-center bg-zinc-50/30">
                <Button variant="outline" onClick={() => setVisibleCount((count) => count + 12)} className="rounded-xl font-bold text-zinc-600 bg-white shadow-sm border-zinc-200 hover:bg-zinc-50 px-6">
                  Carregar mais regras
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      <Dialog open={isEditOpen} onOpenChange={(open) => {
        setIsEditOpen(open);
        if (!open) setEditing(null);
      }}>
        <DialogContent className="sm:max-w-[520px] bg-white rounded-t-3xl sm:rounded-3xl border-none shadow-2xl p-4 sm:p-8 max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
          <DialogHeader className="mb-4">
            <DialogTitle className="text-2xl font-black text-zinc-900">Editar recorrencia</DialogTitle>
          </DialogHeader>

          {editing && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-black uppercase tracking-widest text-zinc-400">Descricao</label>
                  <Input
                    value={editing.description}
                    onChange={(event) => setEditing((prev) => prev ? { ...prev, description: event.target.value } : prev)}
                    className="h-11 rounded-xl bg-zinc-50 border-zinc-200 font-medium mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-black uppercase tracking-widest text-zinc-400">Valor (R$)</label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={editing.amount}
                    onChange={(event) => setEditing((prev) => prev ? { ...prev, amount: Number(event.target.value) } : prev)}
                    className="h-11 rounded-xl bg-zinc-50 border-zinc-200 font-medium mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-black uppercase tracking-widest text-zinc-400">Conta</label>
                  <Select
                    value={String(editing.accountId)}
                    onValueChange={(value) => setEditing((prev) => prev ? { ...prev, accountId: Number(value) } : prev)}
                  >
                    <SelectTrigger className="h-11 rounded-xl bg-zinc-50 border-zinc-200 font-medium mt-1 overflow-hidden">
                      <SelectValue placeholder="Selecione..." className="truncate" />
                    </SelectTrigger>
                    <SelectContent className="bg-white rounded-xl shadow-lg border-zinc-100 max-h-60 overflow-y-auto w-full">
                      {accounts.map((account) => (
                        <SelectItem key={account.id} value={String(account.id)} className="font-medium min-w-0">
                          <span className="flex items-center gap-2 truncate pr-2">
                            {account.type.trim() === AccountType.CREDIT_CARD ? (
                              <CreditCard size={14} className="text-zinc-500 shrink-0" />
                            ) : (
                              <Landmark size={14} className="text-zinc-500 shrink-0" />
                            )}
                            <span className="truncate flex-1">{account.name}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-xs font-black uppercase tracking-widest text-zinc-400">Tipo</label>
                  <Select
                    value={editing.type}
                    onValueChange={(value) => setEditing((prev) => prev ? { ...prev, type: value as TransactionType } : prev)}
                  >
                    <SelectTrigger className="h-11 rounded-xl bg-zinc-50 border-zinc-200 font-medium mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white rounded-xl shadow-lg border-zinc-100">
                      <SelectItem value="INCOME">
                        <span className="flex items-center gap-2">
                          <IncomeTypeIcon size={14} className="text-emerald-600" />
                          {typeOptionConfig.INCOME.label}
                        </span>
                      </SelectItem>
                      <SelectItem value="EXPENSE">
                        <span className="flex items-center gap-2">
                          <ExpenseTypeIcon size={14} className="text-rose-600" />
                          {typeOptionConfig.EXPENSE.label}
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-black uppercase tracking-widest text-zinc-400">Status</label>
                  <Select
                    value={editing.status}
                    onValueChange={(value) => setEditing((prev) => prev ? { ...prev, status: value as TransactionStatus } : prev)}
                  >
                    <SelectTrigger className="h-11 rounded-xl bg-zinc-50 border-zinc-200 font-medium mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white rounded-xl shadow-lg border-zinc-100">
                      <SelectItem value="CONFIRMED">
                        <span className="flex items-center gap-2">
                          <ConfirmedStatusIcon size={14} className="text-emerald-600" />
                          {statusOptionConfig.CONFIRMED.label}
                        </span>
                      </SelectItem>
                      <SelectItem value="PENDING">
                        <span className="flex items-center gap-2">
                          <PendingStatusIcon size={14} className="text-amber-600" />
                          {statusOptionConfig.PENDING.label}
                        </span>
                      </SelectItem>
                      <SelectItem value="RECONCILED">
                        <span className="flex items-center gap-2">
                          <ReconciledStatusIcon size={14} className="text-blue-600" />
                          {statusOptionConfig.RECONCILED.label}
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-end">
                  <div className="w-full rounded-xl border border-zinc-100 bg-white p-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-zinc-900">Regra ativa</p>
                      <p className="text-xs text-zinc-500">Controle rapido de ativacao</p>
                    </div>
                    <Switch
                      checked={editing.active}
                      onCheckedChange={(checked) => setEditing((prev) => prev ? { ...prev, active: checked } : prev)}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-black uppercase tracking-widest text-zinc-400">Categoria (opcional)</label>
                  <Select
                    value={String(editing.categoryId || 0)}
                    onValueChange={(value) => setEditing((prev) => prev ? { ...prev, categoryId: Number(value) } : prev)}
                  >
                    <SelectTrigger className="h-11 rounded-xl bg-zinc-50 border-zinc-200 font-medium mt-1 overflow-hidden">
                      <SelectValue className="truncate" />
                    </SelectTrigger>
                    <SelectContent className="bg-white rounded-xl shadow-lg border-zinc-100 max-h-60 overflow-y-auto w-full">
                      <SelectItem value="0" className="font-medium text-zinc-400 min-w-0">
                        <span className="flex items-center gap-2 truncate pr-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-zinc-300 inline-block shrink-0" />
                          <span className="truncate">Sem categoria</span>
                        </span>
                      </SelectItem>
                      {categories
                        .filter((category) => {
                          if (editing.type === "INCOME") return category.type.trim() === "INCOME";
                          return category.type.trim() === "EXPENSE";
                        })
                        .map((category) => (
                          <SelectItem key={category.id} value={String(category.id)} className="font-medium min-w-0">
                            <span className="flex items-center gap-2 truncate pr-2">
                              <span
                                className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
                                style={{ backgroundColor: category.color || "#64748b" }}
                              />
                              <span className="truncate flex-1">{category.name}</span>
                            </span>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-xs font-black uppercase tracking-widest text-zinc-400">Responsavel (opcional)</label>
                  <Select
                    value={String(editing.responsibleId || 0)}
                    onValueChange={(value) => setEditing((prev) => prev ? { ...prev, responsibleId: Number(value) } : prev)}
                  >
                    <SelectTrigger className="h-11 rounded-xl bg-zinc-50 border-zinc-200 font-medium mt-1 overflow-hidden">
                      <SelectValue className="truncate" />
                    </SelectTrigger>
                    <SelectContent className="bg-white rounded-xl shadow-lg border-zinc-100 max-h-60 overflow-y-auto w-full">
                      <SelectItem value="0" className="font-medium text-zinc-400 min-w-0">
                        <span className="flex items-center gap-2 truncate pr-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-zinc-300 inline-block shrink-0" />
                          <span className="truncate">Sem responsavel</span>
                        </span>
                      </SelectItem>
                      {responsibles.map((responsible) => (
                        <SelectItem key={responsible.id} value={String(responsible.id)} className="font-medium min-w-0">
                          <span className="flex items-center gap-2 truncate pr-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
                              style={{ backgroundColor: responsible.color || "#94a3b8" }}
                            />
                            <span className="truncate flex-1">{responsible.name}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="text-xs font-black uppercase tracking-widest text-zinc-400">Observacoes</label>
                <Textarea
                  value={editing.notes}
                  onChange={(event) => setEditing((prev) => prev ? { ...prev, notes: event.target.value } : prev)}
                  className="mt-1 min-h-20 rounded-xl bg-zinc-50 border-zinc-200"
                />
              </div>

              <div className="rounded-2xl border border-zinc-100 bg-zinc-50/60 p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-black text-zinc-700 flex items-center gap-2">
                    <CalendarDays size={14} className="text-zinc-500" />
                    Regra de repeticao
                  </p>
                  <button
                    type="button"
                    onClick={() => setEditing((prev) => prev ? { ...prev, advancedMode: !prev.advancedMode } : prev)}
                    className="text-xs font-bold text-emerald-600 hover:text-emerald-700"
                  >
                    {editing.advancedMode ? "Voltar para modo guiado" : "Editar RRULE avancada"}
                  </button>
                </div>

                {editing.advancedMode ? (
                  <div>
                    <label className="text-xs font-black uppercase tracking-widest text-zinc-400">RRULE completa</label>
                    <Textarea
                      value={editing.rawRule}
                      onChange={(event) => setEditing((prev) => prev ? { ...prev, rawRule: event.target.value } : prev)}
                      className="mt-1 min-h-24 rounded-xl bg-white border-zinc-200 font-mono text-xs"
                    />
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-black uppercase tracking-widest text-zinc-400">Frequencia</label>
                        <Select
                          value={editing.model.frequency}
                          onValueChange={(value) => setEditing((prev) => prev ? {
                            ...prev,
                            model: {
                              ...prev.model,
                              frequency: value as RecurrenceFrequency,
                            },
                          } : prev)}
                        >
                          <SelectTrigger className="h-11 rounded-xl bg-white border-zinc-200 font-medium mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-white rounded-xl shadow-lg border-zinc-100">
                            <SelectItem value="DAILY">Diaria</SelectItem>
                            <SelectItem value="WEEKLY">Semanal</SelectItem>
                            <SelectItem value="MONTHLY">Mensal</SelectItem>
                            <SelectItem value="YEARLY">Anual</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="text-xs font-black uppercase tracking-widest text-zinc-400">Intervalo</label>
                        <Input
                          type="number"
                          min={1}
                          max={365}
                          value={editing.model.interval}
                          onChange={(event) => setEditing((prev) => prev ? {
                            ...prev,
                            model: {
                              ...prev.model,
                              interval: Number(event.target.value),
                            },
                          } : prev)}
                          className="h-11 rounded-xl bg-white border-zinc-200 font-medium mt-1"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-black uppercase tracking-widest text-zinc-400">Data de inicio</label>
                        <Input
                          type="date"
                          value={editing.model.startDate}
                          onChange={(event) => setEditing((prev) => prev ? {
                            ...prev,
                            model: {
                              ...prev.model,
                              startDate: event.target.value,
                            },
                          } : prev)}
                          className="h-11 rounded-xl bg-white border-zinc-200 font-medium mt-1"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-black uppercase tracking-widest text-zinc-400">Termina em</label>
                        <Select
                          value={editing.model.endMode}
                          onValueChange={(value) => setEditing((prev) => prev ? {
                            ...prev,
                            model: {
                              ...prev.model,
                              endMode: value as RecurrenceEndMode,
                            },
                          } : prev)}
                        >
                          <SelectTrigger className="h-11 rounded-xl bg-white border-zinc-200 font-medium mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-white rounded-xl shadow-lg border-zinc-100">
                            <SelectItem value="NEVER">Nunca</SelectItem>
                            <SelectItem value="UNTIL">Em uma data</SelectItem>
                            <SelectItem value="COUNT">Por quantidade</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {editing.model.endMode === "UNTIL" && (
                      <div>
                        <label className="text-xs font-black uppercase tracking-widest text-zinc-400">Data final</label>
                        <Input
                          type="date"
                          value={editing.model.untilDate || ""}
                          onChange={(event) => setEditing((prev) => prev ? {
                            ...prev,
                            model: {
                              ...prev.model,
                              untilDate: event.target.value,
                            },
                          } : prev)}
                          className="h-11 rounded-xl bg-white border-zinc-200 font-medium mt-1"
                        />
                      </div>
                    )}

                    {editing.model.endMode === "COUNT" && (
                      <div>
                        <label className="text-xs font-black uppercase tracking-widest text-zinc-400">Quantidade de ocorrencias</label>
                        <Input
                          type="number"
                          min={1}
                          max={999}
                          value={editing.model.count || ""}
                          onChange={(event) => setEditing((prev) => prev ? {
                            ...prev,
                            model: {
                              ...prev.model,
                              count: Number(event.target.value),
                            },
                          } : prev)}
                          className="h-11 rounded-xl bg-white border-zinc-200 font-medium mt-1"
                        />
                      </div>
                    )}

                    {editing.model.frequency === "WEEKLY" && (
                      <div>
                        <label className="text-xs font-black uppercase tracking-widest text-zinc-400">Dias da semana</label>
                        <div className="flex gap-2 flex-wrap mt-2">
                          {WEEKDAY_OPTIONS.map((weekday) => {
                            const selected = editing.model.byweekday.includes(weekday.id);
                            return (
                              <button
                                key={weekday.id}
                                type="button"
                                onClick={() => {
                                  setEditing((prev) => {
                                    if (!prev) return prev;
                                    const nextDays = selected
                                      ? prev.model.byweekday.filter((id) => id !== weekday.id)
                                      : [...prev.model.byweekday, weekday.id as WeekdayId];

                                    return {
                                      ...prev,
                                      model: {
                                        ...prev.model,
                                        byweekday: nextDays,
                                      },
                                    };
                                  });
                                }}
                                className={`w-10 h-10 rounded-full text-sm font-bold transition-all border-2 flex items-center justify-center ${selected
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
                      </div>
                    )}

                    {editing.model.frequency === "MONTHLY" && (
                      <div>
                        <label className="text-xs font-black uppercase tracking-widest text-zinc-400">Dia do mes</label>
                        <Input
                          type="number"
                          min={1}
                          max={31}
                          value={editing.model.bymonthday || ""}
                          onChange={(event) => setEditing((prev) => prev ? {
                            ...prev,
                            model: {
                              ...prev.model,
                              bymonthday: Number(event.target.value),
                            },
                          } : prev)}
                          className="h-11 rounded-xl bg-white border-zinc-200 font-medium mt-1"
                        />
                      </div>
                    )}
                  </>
                )}

                <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 space-y-2">
                  <p className="text-xs font-black uppercase tracking-widest text-emerald-700">Preview da regra</p>
                  <p className="text-sm font-semibold text-emerald-800">
                    {editRulePreview.summary || "Sem resumo"}
                  </p>
                  {editRulePreview.expression && (
                    <p className="text-[11px] font-mono text-emerald-700 break-all">{editRulePreview.expression}</p>
                  )}
                  {editRulePreview.error ? (
                    <p className="text-xs font-bold text-rose-600">{editRulePreview.error}</p>
                  ) : (
                    editRulePreview.previewDates.length > 0 && (
                      <div className="text-xs text-emerald-800 font-medium space-y-1">
                        {editRulePreview.previewDates.map((date, index) => (
                          <p key={`${date.toISOString()}-${index}`}>
                            • {format(date, "dd/MM/yyyy")}
                          </p>
                        ))}
                      </div>
                    )
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditOpen(false);
                    setEditing(null);
                  }}
                  disabled={saving}
                >
                  Cancelar
                </Button>
                <Button onClick={handleSaveEdit} disabled={saving} className="bg-zinc-900 hover:bg-zinc-800 text-white">
                  {saving ? "Salvando..." : "Salvar alteracoes"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}
